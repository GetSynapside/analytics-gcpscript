# Synapside Analytics - GCP Client SDK (`analytics-gcpscript`)

Cliente JavaScript ultraleve (~4 KB minificado) e sem dependências para o coletor de analytics Serverless no **Google Cloud Platform (GCP)** com **Cloud Run (Rust Ingestor)**, **Pub/Sub** e **BigQuery**.

---

## 🚀 Como usar no seu site (Dual Run / Sem Conflito)

Você pode rodar este script em simultâneo com o script de analytics legado no seu site sem nenhum conflito de variáveis ou cookies.

Adicione o snippet abaixo no `<head>` do seu site:

```html
<!-- Synapside Analytics (GCP Serverless Ingestor) -->
<script>
  window.sAnalyticsGcp_project = 'project_6'; // Substitua pelo seu project_code
  window.sAnalyticsGcp_api = 'https://analytics-receiver-ingestor-98880881604.us-central1.run.app';
  window.sAnalyticsGcp = window.sAnalyticsGcp || function () {
    (window.sAnalyticsGcp.q = window.sAnalyticsGcp.q || []).push(arguments);
  };
</script>
<script src="https://getsynapside.github.io/analytics-gcpscript/dist/sAnalyticsGcp_v1.build.js" async></script>
```

---

## ⚡ Como Habilitar o GitHub Pages neste repositório

1. Acesse: **GitHub Repo $\rightarrow$ Settings $\rightarrow$ Pages**.
2. Em **Build and deployment $\rightarrow$ Source**, selecione: `Deploy from a branch`.
3. Escolha a branch `main` e a pasta `/ (root)`.
4. Clique em **Save**.
5. Em instantes, o script estará disponível na CDN global do GitHub Pages em:
   * `https://getsynapside.github.io/analytics-gcpscript/dist/sAnalyticsGcp_v1.build.js`
   * E a página de testes interativa em: `https://getsynapside.github.io/analytics-gcpscript/`

---

## 🛠️ Métodos Disponíveis

### 1. Rastreamento Automático
O SDK automaticamente captura:
* **Pageviews** na inicialização.
* **Início de Sessão (`session_start`)** com referrer, device, parâmetros UTM e resolução.
* **Cliques** em botões (`<button>`) e links (`<a>`).
* **Envios de Formulários** (`submit`).

### 2. Eventos Customizados (`track`)
```javascript
window.sAnalyticsGcp('track', 'purchase_completed', {
  order_id: 'ORD-9821',
  value: 299.90,
  currency: 'BRL'
});
```

### 3. Identificação de Usuário / Lead (`identify`)
```javascript
window.sAnalyticsGcp('identify', {
  type: 'email',
  value: 'usuario@empresa.com',
  data: {
    name: 'João Silva',
    plan: 'Enterprise'
  }
});
```

---

## 📦 Estrutura do Repositório

```
analytics-gcpscript/
├── index.html                       # Página de demonstração e teste interativo
├── package.json                     # Scripts de build e minificação
├── README.md                        # Documentação de uso
├── src/
│   └── analytics-gcp.js             # Código-fonte legível e comentado
└── dist/
    ├── sAnalyticsGcp_v1.build.js    # Arquivo compilado e minificado (~4 KB)
    └── sAnalyticsGcp.min.js         # Alias minificado
```

---

## 🔨 Como Compilar Novas Versões

```bash
npm install
npm run build
```
