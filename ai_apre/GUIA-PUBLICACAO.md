# Publicação no portfólio · AI_APRE v15

## 1. O que será publicado

Há duas partes independentes:

- **Frontend:** todos os arquivos da pasta `ai_apre`, no repositório `Fabiano-Antero/portfolio`, publicado pelo Pages já conectado.
- **Backend:** um novo Worker chamado `ai-apre-signal`, com Durable Objects para as salas e o controle de acesso. Ele não substitui o Pages nem altera a Ordiny.

A configuração consultada do seu Pages usa a branch `master` e publica a raiz do repositório. **Não altere a raiz do projeto Pages para `ai_apre`**: isso tiraria o portfólio de seu endereço atual. Não substitua o `index.html`, `CNAME`, regras ou arquivos existentes da raiz.

Este guia configura os serviços na sua conta; a entrega do ZIP não os criou nem os publicou.

## 2. Copiar a pasta para o repositório

Extraia o ZIP. O resultado deve ser:

```text
portfolio/
  index.html            ← seu portfólio, sem alterações
  ...                   ← demais arquivos existentes
  ai_apre/
    index.html          ← estúdio
    watch.html
    config.js
    assets/
    backend/
    ...
```

Caso ainda não tenha uma cópia local do repositório:

```bash
git clone https://github.com/Fabiano-Antero/portfolio.git
cd portfolio
git switch master
```

Copie `ai_apre` para dentro dessa pasta. Não copie os arquivos individualmente para a raiz. Para usar a interface web do GitHub, envie a pasta com sua estrutura intacta, não o ZIP como um único arquivo.

## 3. Pré-requisitos do backend

Use **Node.js 22.18 ou posterior** e npm. O backend adota a CLI `cf` e o formato `cloudflare.config.ts`, seguindo a documentação atual da Cloudflare. Esse formato/CLI está em beta; não foi criado um `wrangler.toml` paralelo.

Dentro da pasta `portfolio/ai_apre/backend`, execute:

```bash
node --version
npm install
npm test
npm run check
```

`npm run check` executa `cf deploy --dry-run`: constrói e valida sem publicar. **Corrija qualquer falha antes de continuar.** A instalação das dependências e o build real não puderam ser executados no ambiente de preparação do ZIP, que não tinha acesso ao registro npm.

A primeira instalação gera `package-lock.json`. Revise e inclua esse arquivo no commit para fixar as versões efetivamente usadas; ele não foi fabricado nesta entrega. Não envie `node_modules`, `.cloudflare` nem arquivos de segredos.

Entre na conta Cloudflare:

```bash
npx cf auth login
npx cf auth whoami
```

A configuração aponta para a conta Solveasy (`cbf3e701028756b0568e7ea00033e38d`) que foi consultada. Verifique se o login selecionado tem permissão para criar/atualizar Workers e Durable Objects nessa conta.

## 4. Configurar TURN e a senha de transmissão

No painel Cloudflare, na conta Solveasy, abra o produto **Realtime → TURN** e crie uma chave dedicada a este projeto. Guarde o **TURN Key ID** e o **API token associado a essa chave**. Não é necessário criar uma aplicação SFU para esta implementação.

A API de geração de credenciais temporárias deve receber o token da chave TURN **somente no backend**. Não use o Global API Key nem coloque o token do painel no JavaScript público.

Crie uma senha forte, exclusiva para iniciar transmissões. O backend exige pelo menos 16 caracteres; recomenda-se um valor aleatório de 32 caracteres ou mais. Esta senha não é a senha da Cloudflare ou do GitHub.

Copie o modelo `secrets.example.json` para um arquivo privado **fora de toda a pasta do repositório**. Exemplo de local no Windows:

```text
C:\Users\SEU_USUARIO\ai-apre-private\secrets.json
```

Preencha, nesse arquivo privado:

```json
{
  "PUBLISH_PASSWORD": "SUA_SENHA_FORTE_E_EXCLUSIVA",
  "TURN_KEY_ID": "ID_DA_CHAVE_TURN",
  "TURN_API_TOKEN": "TOKEN_DA_CHAVE_TURN"
}
```

**Nunca coloque esse arquivo dentro de `portfolio`, nem mesmo em `backend`.** O repositório é público e o Pages serve arquivos estáticos. `.gitignore` é uma proteção adicional, não substitui manter segredos fora da pasta publicada.

A senha é digitada pelo operador no painel de transmissão. Não fica no link do espectador, não é armazenada pelo código no `localStorage` e é removida do campo após criar a sala. Navegadores/extensões podem ter seus próprios mecanismos de preenchimento; não compartilhe a senha com espectadores.

Por padrão, `REQUIRE_TURN` é `true`: sem as credenciais, o backend recusa iniciar a transmissão. Isso evita anunciar conectividade remota completa tendo apenas uma conexão direta que pode falhar em outras redes.

## 5. Publicar somente o backend

Ainda em `portfolio/ai_apre/backend`:

```powershell
npx cf deploy --secrets-file "C:\Users\SEU_USUARIO\ai-apre-private\secrets.json"
```

No macOS/Linux, use o caminho absoluto do arquivo privado:

```bash
npx cf deploy --secrets-file "$HOME/ai-apre-private/secrets.json"
```

O comando usa `cloudflare.config.ts`, publica **`ai-apre-signal`** e configura as classes/bindings **Room/ROOMS** e **AuthGuard/AUTH_GUARD**, com armazenamento SQLite. Não execute `cf init` na raiz do portfólio e não migre o Pages.

Copie a URL HTTPS do Worker mostrada pelo comando. Exemplo ilustrativo:

```text
https://ai-apre-signal.SEU-SUBDOMINIO.workers.dev
```

Não copie literalmente `SEU-SUBDOMINIO`. Use o endereço real retornado pela Cloudflare.

Abra a URL do Worker seguida de `/health`. Espere receber `version: 15`, `configured: true` e `relayConfigured: true`. Essa checagem confirma a presença dos bindings/segredos; **não verifica a validade do token TURN nem comprova transmissão de mídia**.

## 6. Conectar o frontend à API

Edite `portfolio/ai_apre/config.js`:

```javascript
'use strict';
window.VozOnlineConfig = Object.freeze({
  apiBase: 'https://ai-apre-signal.SEU-SUBDOMINIO.workers.dev'
});
```

Coloque apenas a URL pública real. Não acrescente `/v1`, senha, token ou identificador de sala.

O backend permite estes endereços de origem por padrão:

```text
https://fabianoantero.site
https://portfolio-67x.pages.dev
http://localhost:8788
http://127.0.0.1:8788
```

Caso use outro domínio, `www` ou um endereço de preview, adicione a **origem exata, sem caminho**, em `ALLOWED_ORIGINS` dentro de `backend/cloudflare.config.ts`, e publique novamente o backend. Não use `*` para contornar um erro de configuração.

## 7. Enviar a pasta para o GitHub

A partir da raiz de `portfolio`:

```bash
git status --short
git add ai_apre
git diff --cached --stat
git diff --cached --name-only
```

Confira a lista: deve conter apenas a nova pasta `ai_apre`. **Pare se aparecerem senhas, `.env`, `secrets.json`, `node_modules` ou alterações não relacionadas.** O arquivo `secrets.example.json`, com placeholders, pode ser versionado.

Depois da revisão:

```bash
git commit -m "Add ai_apre studio with authenticated online streaming"
git push origin master
```

A integração GitHub/Pages já existente deve publicar os arquivos estáticos. Acompanhe o resultado do deploy no projeto **portfolio**, sem mudar sua configuração de raiz.

Após a publicação, abra:

```text
https://fabianoantero.site/ai_apre/
```

Esse é o endereço de destino, não uma confirmação de que a página já existe. Se necessário, faça uma atualização completa do navegador para não usar arquivos anteriores em cache.

**Importante:** o push do portfólio atualiza o frontend, mas não publica automaticamente o Worker separado. Quando mudar `backend/worker.js` ou sua configuração, execute novamente o deploy do backend. Mantenha o arquivo de segredos privado para essas atualizações. Automatizar esse segundo deploy por CI é uma etapa adicional, não foi configurado nesta entrega.

## 8. Testar entre aparelhos

No computador transmissor, abra o estúdio em HTTPS. Use fones, autorize o microfone e configure a saída. No botão de transmissão ao lado de Premium, selecione a câmera e escolha o áudio do estúdio ou vídeo sem áudio.

Ative a prévia. Ela fica muda por padrão. Digite a senha do transmissor e clique em **Iniciar transmissão**. O link do player só aparece após a sala ser autorizada.

Abra esse link em outro aparelho. O player não solicita câmera nem microfone e começa mudo; toque em **Ativar som** quando desejar ouvir.

Faça um teste usando dados móveis no celular, não apenas o mesmo Wi-Fi. Confirme:

- vídeo realmente em movimento e áudio recebido;
- mute da transmissão e pausa de vídeo;
- retorno local independente do áudio transmitido;
- encerramento liberando a câmera e invalidando o convite.

Depois, teste uma nova sessão. Não compartilhe o link de operador nem a senha; compartilhe apenas o link do player.

## 9. Escopo e limitações

**Mídia:** WebRTC P2P, com uma conexão por espectador e TURN quando necessário. Até quatro espectadores simultâneos e seis horas por sala. Quatro espectadores demandam aproximadamente quatro fluxos de upload do transmissor, além de overhead; a qualidade depende da rede e do aparelho. Não é uma solução de audiência ilimitada nem uma implementação SFU.

**Acesso:** a senha controla quem cria salas. O link do player é um convite por posse: qualquer pessoa que o receba pode assistir enquanto ele for válido. Não há cadastro individual, cobrança nem DRM. Encerrar a sala revoga o convite; credenciais TURN temporárias já emitidas continuam sujeitas à expiração própria e não são uma revogação global instantânea.

**Operação:** a aba transmissora precisa permanecer aberta. Fechar a câmera, suspender o computador, perder rede ou o sistema suspender a aba pode interromper a mídia. O player tem botão de reconexão. Sem encerrar explicitamente, uma sala abandonada expira em até seis horas.

**Segurança/custos:** há limitação de tentativas, um publicador por sala, limite de espectadores, convites distintos e tickets WebSocket de uso único. Isso não substitui uma revisão de segurança e monitoramento de consumo antes de divulgar o serviço publicamente. Workers, Durable Objects e TURN têm franquias/cobranças próprias; confira as condições da conta e configure alertas no painel. Não há promessa de custo zero.

**Preservado:** Premium continua demonstrativo; o efeito “IA” é processamento da voz, não clonagem. A animação acompanha atividade da fala, não fonemas. Não foi acrescentado um modelo que isole exclusivamente a sua voz.

**Dados:** o aplicativo não grava a transmissão. A mídia segue entre navegadores ou pelo relay TURN; o Worker trata sinalização e dados temporários da sala. Operadores da infraestrutura podem ter telemetria operacional. Evite registrar corpos de requisição, SDP, tokens e links completos. A configuração de observabilidade suprime query strings e o código não registra os segredos.

## 10. Diagnóstico

| Sintoma | Verificação |
|---|---|
| Estúdio abre, mas informa backend ausente | Preencha `config.js` com a URL HTTPS real e publique o frontend novamente. |
| Erro de rede/CORS | Confirme URL da API, domínio em `ALLOWED_ORIGINS`, conectividade e possíveis políticas de conteúdo do site. |
| Senha rejeitada | Use `PUBLISH_PASSWORD`, não o token TURN nem a senha da Cloudflare. |
| Erro TURN | Verifique ID/token da mesma chave, permissões e disponibilidade no painel. O `/health` não testa a validade do token. |
| Player fica conectando | Confirme `relayConfigured`, logs do Worker, câmera ativa, firewall e teste em outra rede. Conexão WebSocket sozinha não comprova passagem de mídia. |
| Player sem som | Ative o som no player; confirme microfone, fonte “Áudio tratado do estúdio” e mute da transmissão. |
| Eco | Não ouça simultaneamente o retorno do estúdio e o player. Use fones; Bluetooth pode acrescentar atraso. |
| Convite expirado/encerrado | Crie outra transmissão e compartilhe o novo link. |
| Limite de espectadores | Feche um player; o máximo é quatro. |
| Captura indisponível | Use HTTPS ou localhost e conceda as permissões no navegador/sistema. |
| Arquivos do avatar ausentes | Confira se a pasta `assets` foi enviada inteira. |
| Erro no build | Confira Node >=22.18, execute `npm install` e `npm run check` em `ai_apre/backend`. A configuração `cf` está em beta; revise a saída do comando. |

## 11. O que foi e o que não foi testado

Os testes executados e os relatórios estão em `tests/README.md` e nos JSONs da pasta. Foram verificados DSP, regras do backend com mocks, sinalização do cliente e renderização/controles no Chromium. Oferta/resposta WebRTC foram trocadas, mas sem candidatos ICE disponíveis no ambiente: não houve recepção de quadros.

**Não foram validados:** build real de `cf`, deploy em Cloudflare/workerd, credenciais TURN, tráfego entre redes e dispositivos físicos. Execute as etapas de validação antes de usar a transmissão em uma apresentação real.

## Referências oficiais utilizadas

Documentação consultada em 5 de novembro de 2026:

- CLI e Node.js: https://developers.cloudflare.com/cf/get-started/
- Build, dry-run, deploy e secrets-file: https://developers.cloudflare.com/cf/projects/
- Configuração, bindings e exports: https://developers.cloudflare.com/cf/projects/cloudflare-config/
- Credenciais TURN temporárias: https://developers.cloudflare.com/realtime/turn/generate-credentials/
- Durable Objects e WebSockets: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Publicação estática no Pages: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
