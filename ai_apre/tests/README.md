# Validação da entrega v15

## Verificações executadas

| Área | Resultado | Ambiente |
|---|---:|---|
| DSP preservado | 18 testes passaram | Node VM, sinais sintéticos; 44,1/48/96 kHz |
| Backend e autorização | 26 testes passaram | Código do Worker com armazenamento, Durable Objects e WebSockets simulados |
| Cliente de sinalização | 13 testes passaram | Node VM, fetch/WebSocket/timers simulados |
| Interface | 12 verificações passaram | Chromium, DOM inline, origem opaca; sem captura física |
| Preservação | 17 arquivos idênticos à v14 | SHA-256 dos módulos centrais e assets |
| Sintaxe e referências | Passaram | node --check + análise dos HTMLs |

`backend-results.json`, `online-results.json`, `dsp-results.json`, `ui-results.json`, `preservation.json` e `static-results.json` registram essas verificações.

## WebRTC: validação parcial, não entrega de mídia

Também foi exercitada a negociação com RTCPeerConnection real no Chromium e uma fonte de vídeo sintética. O backend foi o código desta entrega rodando sobre mocks, com transporte de sinalização adaptado pelo harness de teste.

A sala foi criada, a oferta e a resposta SDP foram geradas/trocadas e não houve erros de JavaScript nessa etapa. **Nenhum quadro foi recebido**, pois o ambiente não forneceu candidatos ICE. `webrtc-results.json` registra isso como não validado, e não como teste de streaming aprovado.

Não foram executados o build cf/Vite, o runtime Cloudflare/workerd, o deploy, uma chamada TURN real, tráfego em redes diferentes ou testes com microfone, câmera e Bluetooth físicos. Esses passos são obrigatórios no ambiente de publicação.

## Reproduzir testes sem dependências externas

Na pasta `ai_apre`:

```bash
node tests/dsp-test.cjs
node tests/backend-test.mjs
node tests/online-test.cjs
```

O mock de runtime é exclusivamente de teste. Não o use para publicar a API. Os tokens e a senha dos testes são fictícios e não são credenciais para uso real.

Após instalar as dependências do backend com Node >=22.18:

```bash
cd backend
npm test
npm run check
```

O dry-run verifica o build real sem publicar. O deploy e a checagem entre aparelhos são descritos em `../GUIA-PUBLICACAO.md`.

O script numérico original ainda identifica sua versão interna como 12 porque o módulo de DSP foi preservado. Isso não significa que a transmissão online tenha sido testada naquela versão.
