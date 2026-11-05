# AI_APRE · Estúdio online / v15

Pasta preparada para **`Fabiano-Antero/portfolio/ai_apre`**, mantendo o portfólio na raiz e o visual do estúdio v14.

**Estado desta entrega:** código e arquivos preparados; nenhum commit, Worker, chave TURN ou deploy foi criado na sua conta. O estúdio funciona como interface estática; a transmissão pela internet só fica disponível depois de publicar o backend, configurar o TURN e preencher `config.js`.

## Comece aqui

1. Copie a pasta **`ai_apre` inteira** para a raiz do repositório `portfolio`. Não copie o `index.html` do estúdio sobre o `index.html` do portfólio.
2. Siga **[GUIA-PUBLICACAO.md](GUIA-PUBLICACAO.md)** para publicar o backend isolado e configurar a transmissão.
3. Preencha apenas a URL pública do backend em **`config.js`**. Nunca coloque senhas ou tokens nesse arquivo.
4. Envie a pasta para a branch **`master`**, mantendo as configurações atuais de publicação do Pages.

Endereço esperado depois do deploy do site:

```text
https://fabianoantero.site/ai_apre/
```

O player recebe um convite gerado pelo estúdio:

```text
https://fabianoantero.site/ai_apre/watch.html#room=...&key=...
```

Não invente nem distribua um link de sala antes de iniciar a transmissão. Ao encerrar a sessão, o convite deixa de autorizar novas conexões.

## O que foi preservado

Áudio, efeitos de voz, tratamento de ruído, controle único do microfone, retorno independente, seleção de saída, avatar e seu retorno suave, Premium demonstrativo e português/inglês. Os módulos centrais e as imagens/vídeo do avatar são idênticos aos do ZIP v14. Consulte `tests/preservation.json`.

As configurações continuam no painel da própria página. A câmera só é solicitada ao ativar a prévia, e o player não solicita câmera nem microfone. A transmissão usa o áudio tratado do estúdio antes do controle de volume do retorno.

## O que mudou

A comunicação local entre abas foi substituída por sinalização online autenticada. O backend coordena as salas; os navegadores enviam mídia por WebRTC. O TURN é usado como alternativa de conexão quando a rede exige um retransmissor.

Esta implementação é **P2P com TURN**, não uma SFU: um transmissor envia uma cópia da mídia para cada espectador. O limite implementado é de **quatro espectadores simultâneos**, com sessão de até **seis horas**. Para audiências grandes, é necessária outra arquitetura, por exemplo uma SFU.

## Arquivos

```text
ai_apre/
  index.html                 Estúdio completo
  watch.html                 Player sem captura
  config.js                  Apenas URL pública da API
  online.js                  Cliente da sinalização autenticada
  stream-*.js / stream.css    Câmera, transmissão e player
  audio*.js / avatar.js      Recursos preservados
  assets/                    Vídeo e texturas originais
  backend/
    worker.js                API + sala + controle de tentativas
    cloudflare.config.ts     Worker e Durable Objects isolados
    vite.config.ts           Build/desenvolvimento do backend
    package.json
    secrets.example.json     Modelo sem credenciais reais
  tests/                     Testes e relatório de limitações
  GUIA-PUBLICACAO.md
```

Não remova `assets`. Não há um HTML único nesta entrega: os caminhos foram mantidos relativos para funcionar em `/ai_apre/`.

## Prévia local

Com Python 3 instalado, execute `INICIAR-WINDOWS.bat` ou `bash INICIAR-LINUX-MAC.sh`. A prévia abre em `http://localhost:8788/ai_apre/`.

O iniciador serve apenas o frontend. Não instala nem publica o backend. Sem `apiBase`, o painel informa que a transmissão online ainda não foi configurada; o restante do estúdio permanece disponível.

## Testes e limites

Foram executados testes numéricos de áudio, testes de autorização/sinalização com runtime Cloudflare simulado e verificações da interface em Chromium. Também foi exercitada a troca real de oferta e resposta WebRTC no navegador, mas **a entrega de mídia não foi validada**: o ambiente não forneceu candidatos ICE. Não houve teste com Bluetooth/câmera/microfone físicos, TURN remoto nem Worker em produção. O build `cf deploy --dry-run` precisa ser executado no seu ambiente antes do deploy.

Veja **[tests/README.md](tests/README.md)**. Não considere a transmissão em produção validada apenas porque a página abriu ou porque o botão informa “ao vivo”. Confirme vídeo em movimento e áudio em um segundo aparelho, de preferência em outra rede.
