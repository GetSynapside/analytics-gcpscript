/**
 * Synapside Analytics - GCP Serverless Client SDK
 * Repository: https://github.com/GetSynapside/analytics-gcpscript
 * 
 * High performance, zero-conflict analytics collector client for GCP Cloud Run / PubSub / BigQuery.
 */

(function (window, document) {
    'use strict';

    // 1. Configuration & Endpoints
    const defaultApiUrl = 'https://analytics-receiver-ingestor-98880881604.us-central1.run.app';
    window.sAnalyticsGcp_api = window.sAnalyticsGcp_api || defaultApiUrl;

    // Fallback to legacy project if sAnalyticsGcp_project is not explicitly set
    const projectCode = window.sAnalyticsGcp_project || window.sAnalytics_project || 'project_default';
    const storageToken = 'sAnalytics_gcp_v0_';

    // 2. UUID v7 Polyfill (RFC 9562 compatible timestamp-ordered UUID)
    const uuidv7 = () => {
        const value = new Uint8Array(16);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(value);
        } else {
            for (let i = 0; i < 16; i++) {
                value[i] = Math.floor(Math.random() * 256);
            }
        }

        const now = BigInt(Date.now());
        value[0] = Number((now >> 40n) & 0xffn);
        value[1] = Number((now >> 32n) & 0xffn);
        value[2] = Number((now >> 24n) & 0xffn);
        value[3] = Number((now >> 16n) & 0xffn);
        value[4] = Number((now >> 8n) & 0xffn);
        value[5] = Number(now & 0xffn);
        value[6] = (value[6] & 0x0f) | 0x70; // Version 7
        value[8] = (value[8] & 0x3f) | 0x80; // Variant 1

        return [...value]
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
    };

    // 3. Tracking Core Class
    class sAnalyticsGcpTracking {
        constructor() {
            this.user_uuid = sessionStorage.getItem(storageToken + 'userid') || '';
            this.sessionNew = false;

            if (sessionStorage.getItem(storageToken + 'session_uuid') == null) {
                this.session_uuid = uuidv7();
                sessionStorage.setItem(storageToken + 'session_uuid', this.session_uuid);
                this.sessionNew = true;
            } else {
                this.session_uuid = sessionStorage.getItem(storageToken + 'session_uuid');
            }

            if (this.sessionNew) {
                this.sendEvent('session_start', this.getSessionData());
            }

            this.pageview();
        }

        sendData(data, path = '/v1/engine/events') {
            const endpoint = window.sAnalyticsGcp_api + path;
            const payloadString = JSON.stringify(data);

            if (navigator.sendBeacon) {
                const blob = new Blob([payloadString], { type: 'application/json; charset=UTF-8' });
                const success = navigator.sendBeacon(endpoint, blob);
                if (success) return;
            }

            // Fallback for browsers / environments where sendBeacon fails or is disabled
            fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payloadString,
                keepalive: true,
                credentials: 'omit'
            }).catch(err => {
                console.warn('[sAnalyticsGcp] Failed to send payload:', err);
            });
        }

        sendEvent(eventType, eventData = {}) {
            const payload = {
                user_uuid: this.user_uuid,
                event_uuid: uuidv7(),
                project_code: window.sAnalyticsGcp_project || projectCode,
                event_type: eventType,
                event_ts: new Date().toISOString(),
                data: {
                    session_uuid: this.session_uuid,
                    path: window.location.pathname,
                    domain: window.location.hostname,
                    ...eventData
                }
            };
            this.sendData(payload, '/v1/engine/events');
        }

        getDevice() {
            if (window.screen.width >= 1200) return 3; // Desktop
            if (window.screen.width < 768) return 1;   // Mobile
            return 2;                                  // Tablet
        }

        getParams() {
            const queryDict = {};
            if (window.location.search) {
                window.location.search.slice(1).split('&').forEach(item => {
                    const s = item.split('=');
                    if (s.length === 2) {
                        queryDict[decodeURIComponent(s[0])] = decodeURIComponent(s[1]);
                    }
                });
            }
            return queryDict;
        }

        getSessionData() {
            const returnData = {
                device: this.getDevice(),
                params: this.getParams()
            };

            if (document.referrer && document.referrer !== '') {
                try {
                    const referrerHostname = new URL(document.referrer).hostname;
                    returnData.referer = referrerHostname !== window.location.hostname
                        ? referrerHostname
                        : 'direct';
                } catch (e) {
                    returnData.referer = 'unknown';
                }
            } else {
                returnData.referer = 'direct';
            }

            return returnData;
        }

        pageview() {
            this.sendEvent('pageview', {
                title: document.title,
                url: window.location.href
            });
        }

        form(e) {
            if (!e.target) return;
            this.sendEvent('form_submit', {
                form_name: e.target.getAttribute('name') || '',
                form_id: e.target.id || '',
                form_action: e.target.action || ''
            });
        }

        click(e) {
            const target = e.target.closest('a, button');
            if (target) {
                this.sendEvent('click', {
                    tag: target.tagName,
                    id: target.id || '',
                    class: target.className || '',
                    text: target.innerText ? target.innerText.substring(0, 50).trim() : '',
                    href: target.href || ''
                });
            }
        }

        track(eventType, eventData = {}) {
            this.sendEvent(eventType, eventData);
        }

        identify(data = {}) {
            const payload = {
                user_uuid: this.user_uuid,
                project_code: window.sAnalyticsGcp_project || projectCode,
                identity_type: data.type,
                identity_value: data.value,
                data: { session_uuid: this.session_uuid, ...(data.data || {}) },
                event_ts: new Date().toISOString()
            };
            this.sendData(payload, '/v1/engine/identities');
        }
    }

    // 4. Initialization & Command Queue
    let instance = null;

    function dispatch(command, ...args) {
        if (!instance) return;
        switch (command) {
            case 'track': instance.track(...args); break;
            case 'identify': instance.identify(...args); break;
            case 'pageview': instance.pageview(); break;
            default: console.warn('[sAnalyticsGcp] Unknown command:', command);
        }
    }

    function activate(uuid) {
        if (uuid) {
            sessionStorage.setItem(storageToken + 'userid', uuid);
        }

        instance = new sAnalyticsGcpTracking();

        document.addEventListener('submit', e => instance.form(e), false);
        document.addEventListener('click', e => instance.click(e), true);

        // Drain queued commands
        const queue = (window.sAnalyticsGcp && window.sAnalyticsGcp.q) || [];

        window.sAnalyticsGcp = function (...args) {
            dispatch(...args);
        };

        queue.forEach(args => dispatch(...args));
    }

    // 5. Chaining start handler to prevent conflicts with legacy sAnalyticsStart
    const previousStartHandler = window.sAnalyticsStart;
    window.sAnalyticsStart = function (uuid) {
        if (typeof previousStartHandler === 'function') {
            try { previousStartHandler(uuid); } catch (err) { console.error(err); }
        }
        activate(uuid);
    };

    function loadUserid() {
        const script = document.createElement('script');
        script.src = window.sAnalyticsGcp_api + '/v1/engine/start.js';
        script.async = true;
        document.head.appendChild(script);
    }

    // Ensure command queue stub exists
    window.sAnalyticsGcp = window.sAnalyticsGcp || function (...args) {
        (window.sAnalyticsGcp.q = window.sAnalyticsGcp.q || []).push(args);
    };

    if (sessionStorage.getItem(storageToken + 'userid') == null) {
        loadUserid();
    } else {
        activate(null);
    }
})(window, document);
