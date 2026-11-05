# Alterações v15

- Estrutura relativa pronta para `/ai_apre/`, sem alterar a raiz do portfólio.
- Backend Worker isolado, salas Durable Objects, senha de publicador, convites de espectadores e tickets WebSocket de uso único.
- Negociação WebRTC pela internet; nenhuma dependência de `window.opener` ou BroadcastChannel na transmissão.
- TURN temporário gerado no servidor; segredo principal não enviado ao navegador.
- Limite de quatro espectadores simultâneos, seis horas por sala e limites básicos contra abuso.
- Painel de transmissão com campo de senha e estado de configuração, em português/inglês.
- Código e mídia do áudio, avatar, Premium, configurações e idioma preservados; ver hashes.
- Links só disponíveis após criar a sala; encerramento revoga o convite.
- Os testes locais cobrem regras e interface. Recepção de mídia e produção ainda precisam ser validadas após a publicação.

Não incluído: SFU, transmissão para audiência ilimitada, pagamento real, gravação, isolamento biométrico de voz, deploy automático do Worker via GitHub ou publicação na conta do usuário.
