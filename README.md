# Portfólio: Fabiano Antero

Implementação do portfólio a partir das telas desktop e mobile do Figma. HTML, CSS e JavaScript, sem dependências de instalação.

## Executar

Com Node.js 18 ou superior:

```sh
npm run dev
```

Abra http://localhost:4173. Para usar outra porta, defina a variável de ambiente `PORT`.

## Páginas

- `index.html`: apresentação, projetos selecionados, Workbench interativo, experiência e contato.
- `projetos.html`: coleção dos cinco projetos.
- `ordiny.html`: estudo completo, navegação por capítulos e comparação interativa dos temas.
- `cash-advance.html`: oito capítulos com pesquisa, jornada, antecipação, Pix, recursos, sistema visual e entrega; telas atuais do protótipo.
- `sandfit.html`: oito capítulos sobre contexto, perfil, jornada, descoberta, reserva, recuperação, sistema visual e encerramento, conforme o Figma. Inclui quatro telas do produto e links para estudo e protótipo.

A home apresenta Ordiny, Cash Advance e Sandfit Arena. Lumen e Aqui Limpa ficam na coleção completa e levam aos estudos originais no Behance. O botão de currículo usa o PDF de 30/09/2026 fornecido pelo autor. Os canais de contato mantêm os endereços do portfólio original.

## Editar e preparar para hospedagem

Edite a página inicial em `index.html`, os estilos compartilhados em `assets/css/style.css` e as interações em `assets/js/app.js`. Os estudos de caso e a coleção são gerados por `scripts/build-pages.cjs`; o conteúdo atual do Cash Advance está em `scripts/cash-case.cjs`, com estilos em `assets/css/cash-case.css`. Após editar os geradores, execute `npm run generate`.

```sh
npm run check
npm run build
```

O build copia o site estático para `dist/`, que pode ser publicado em hospedagens estáticas. Nenhum serviço externo é necessário para executar o site.

Os estilos publicados são `assets/css/site.css` e `assets/css/home.css`, gerados a partir dos arquivos de origem por `npm run styles`. O servidor e o build também geram esses arquivos. Após editar CSS com o servidor já aberto, execute `npm run styles`. As fontes usam WOFF2, e as imagens dos projetos têm versões WebP e tamanhos responsivos descritos em `assets/data/image-variants.json`. Os PNGs originais continuam disponíveis como fontes.

`robots.txt` e `sitemap.xml` descrevem o rastreamento e as quatro páginas públicas. `llms.txt` apresenta o conteúdo para leitores de IA. `/.well-known/ai-catalog.json` é um catálogo válido, sem serviços externos de agentes, pois o portfólio oferece apenas uma conversa local. Esses arquivos também fazem parte de `dist/`.

No repositório `Fabiano-Antero/portfolio`, o GitHub Pages publica os arquivos da raiz da branch `master`. O arquivo `CNAME` mantém o domínio `fabianoantero.site` e `.nojekyll` permite servir o site estático diretamente. As figuras prontas em `assets/art/` são versionadas; `npm run generate` atualiza as páginas sem exigir os arquivos internos da exportação do Figma. Capturas, caches e registros internos não fazem parte da publicação.

## Animações e acessibilidade

- Hero: retrato com entrada por opacidade e suavização na base, círculo desenhado atrás do retrato, textos em cascata e divisórias que crescem antes de cada linha.
- Título da hero: “DA LÓGICA”, “AO PRODUTO” e “EM USO.” desenhados nessa ordem, letra por letra. A primeira e a última linha recebem preenchimento ao terminar; o círculo fecha na base, atrás do retrato. As versões em espanhol e inglês usam a mesma fonte e mantêm a sequência.
- Após o título: cargo, descrição, botão de projetos, botão de currículo e resumo da experiência entram nessa ordem, um por vez.
- Transição de projetos: oito faixas diagonais do slide de UX fecham a tela antes da navegação interna para projetos e cases. Verde e escuro se alternam, com as palavras correndo em sentidos opostos. A página de destino começa coberta e revela o conteúdo pelo movimento inverso. O salto até Projetos na home usa a mesma sequência. Escape cancela o fechamento; movimento reduzido, cliques modificados e links externos preservam a navegação direta. Os geradores incluem o script e os estilos nas cinco páginas. `scripts/project-transition-qa.cjs` verifica cobertura, destinos, âncoras, retorno pelo histórico, idioma, telas pequenas e ausência de armazenamento. A identificação das páginas aceita os endereços com e sem `.html` usados pelo servidor publicado. `scripts/project-transition-redirect-qa.cjs` reproduz esses redirecionamentos e verifica o recuo visível das oito faixas no desktop e mobile.
- PT / ESP / ENG: disponível na navbar das cinco páginas, inclusive no celular. Troca o conteúdo, títulos e descrições acessíveis, salva a preferência e preserva o progresso das animações, as abas e os controles. As telas originais dos protótipos preservam o idioma do material fornecido. `scripts/language-qa.cjs` verifica as três línguas nas cinco páginas, em cinco larguras. `scripts/language-interactions-qa.cjs` verifica conversa, controles e continuidade das animações ao trocar o idioma.
- Ordiny: comparação manual dos temas claro e escuro, com divisor arrastável por mouse ou toque e controle pelas setas do teclado.
- Personagem 3D: o modelo colorido fica no canto inferior direito das quatro páginas e acompanha o cursor com a cabeça quando está em repouso. Passar o mouse sobre ele inicia a interação; no celular, tocar e arrastar. Ele fica pendurado com a pose e os movimentos do FBX Hanging Idle, usando as duas mãos, e amplia o cursor ao detectar sacudidas em qualquer direção. Após 10 segundos, ao sair da janela ou ao soltar o toque, cai, levanta e volta ao canto. A geometria permanece dentro dos limites da janela em todas as fases. Enter inicia pelo teclado e Escape solta; o botão × oculta o personagem durante a sessão. A troca de idioma preserva o ciclo. Com movimento reduzido, o personagem fica estático.
- Movimento pendurado: o clipe Hanging Idle dura aproximadamente 3,33 segundos e repete no ritmo original. As rotações foram adaptadas entre as poses de referência dos esqueletos, mantendo as proporções e texturas do GLB atual. O ponto médio entre as mãos acompanha o cursor, preservando a distância entre elas. O balanço anterior foi substituído pelo movimento do arquivo fornecido.
- Repouso: `assets/models/idle.fbx` foi adaptado para `assets/models/idle.js`. O ciclo Idle dura aproximadamente 8,33 segundos e mantém os movimentos originais do corpo. A cabeça recebe uma rotação adicional e suave para acompanhar o cursor, depois da avaliação do clipe. O repouso retorna por uma transição de pose, a troca de idioma preserva seu progresso e a preferência por movimento reduzido mantém o primeiro quadro estático. `scripts/chibi-idle-qa.cjs` verifica os movimentos do corpo, a combinação das rotações da cabeça, a repetição, o idioma e o movimento reduzido.
- Entrada de títulos e revelação das seções durante a rolagem.
- Transições dos botões, cartões, imagens e abas do Workbench.
- Abas acessíveis com setas, Home e End; navegação sem JavaScript preservada.
- Preferência `prefers-reduced-motion` respeitada nas entradas e transições.

As figuras em `assets/art/` reproduzem as camadas de interface do Figma em HTML; a composição das páginas usa layouts responsivos. Os arquivos originais de imagens e SVG ficam em `assets/figma/`, sem URLs temporárias em produção.

As datas, experiências e resultados apresentados são os do material fornecido. A Ordiny permanece identificada como projeto em desenvolvimento e o Cash Advance como estudo de design.

O personagem é carregado de `assets/models/fabiano-chibi.glb`, com a malha e o esqueleto de Talking.fbx, preservado em `assets/models/corrected-mesh.fbx`. A animação embutida não é reproduzida automaticamente. O movimento Talking foi convertido separadamente para `assets/models/talking.js` e só toca enquanto o card de conversa está aberto. As texturas de cor e normal do GLB anterior foram reaproveitadas por correspondência exata entre os triângulos; a versão anterior fica em `assets/models/fabiano-chibi-original.glb`. Idle, Hanging Idle, Falling, Sad Walk, Stand Up e Talking foram adaptados ao esqueleto de 34 ossos do novo arquivo. `scripts/chibi-mesh-qa.cjs` verifica a compatibilidade dos clipes, os pesos de deformação, as texturas e a ausência de reprodução automática de clipes embutidos. A animação pendurada vem de `assets/models/hanging-idle.fbx`, convertido em `assets/models/hanging-idle.js`. A queda usa Falling, preservado em `assets/models/falling.fbx` e adaptado em `assets/models/falling.js`. Seu clipe de 4,33 segundos toca apenas enquanto o corpo está no ar: o contato da geometria deformada com o chão da janela interrompe a animação imediatamente, mantém a pose de impacto por 0,18 segundo e inicia Stand Up. A recuperação usa `assets/models/stand-up.fbx` e `assets/models/stand-up.js`, com aproximadamente 8,27 segundos; a caminhada de retorno começa depois do último quadro. O corpo permanece no chão durante a recuperação. O retorno usa Sad Walk, preservado em `assets/models/sad-walk.fbx` e adaptado em `assets/models/sad-walk.js`, com um ciclo de aproximadamente 1,47 segundo. O personagem se vira na direção da caminhada e avança uma passada original por ciclo, em velocidade constante, sem acelerar no meio do trajeto nem limitar o retorno a seis segundos. O deslocamento acumulado do quadril é compensado para evitar saltos ao repetir, preservando seu balanço e movimento vertical. As transições interpolam a pose e a orientação ao se pendurar, cair, levantar, caminhar e retomar o repouso. O acompanhamento com a cabeça e o controle das interações continuam em `assets/js/chibi-pet.js`. Three.js 0.186.1 e GLTFLoader estão incluídos localmente em `assets/vendor/three/`, junto da licença MIT. O site funciona sem CDN. A verificação geral fica em `scripts/chibi-preview-qa.cjs`; a interrupção no chão, a pose congelada e o deslocamento por passada em `scripts/chibi-ground-qa.cjs`; o ritmo e a repetição de Hanging Idle em `scripts/chibi-motion-qa.cjs` e `scripts/chibi-hanging-qa.cjs`. As versões anteriores em FBX, OBJ e JS permanecem como fontes históricas.


A conversa do personagem usa `assets/data/fabiano.json`: perfil, carreira, formação, cursos, competências, cinco projetos, contatos e interesses pessoais informados pelo Fabiano. Os 30 assuntos têm respostas e links em português, espanhol e inglês. A base reúne fatos do portfólio e do currículo e preserva a correção da Dadoteca para 2025 a 2026. Os interesses incluem ficção científica, animes, eventos de cultura pop, viagens, shopping e cosplay. Não publica o endereço residencial do currículo nem supõe informações ausentes.

`chibi-loader.js` disponibiliza imediatamente uma prévia estática e a conversa, carregando o renderizador 3D após a abertura da hero ou quando o visitante interage com o personagem. O modelo publicado usa `fabiano-chibi-web.glb`, com a mesma malha, UVs e esqueleto do original e texturas de até 1024 px. `chibi-bounds.js` reutiliza as matrizes dos ossos para calcular os limites exatos da malha; `scripts/chibi-bounds-qa.cjs` compara 96 poses com a deformação original. Movimento reduzido mantém a prévia estática e a conversa acessível.

Após um minuto sem interação com o personagem, um convite apresenta Sim e Não. Sim abre o campo de pergunta e o histórico em balões; Não mantém a brincadeira normal e deixa um botão para conversar depois. A escolha do convite e até 32 mensagens ficam apenas na sessão do navegador. O convite não interrompe o personagem pendurado ou em recuperação. Enquanto a conversa está aberta, o clipe Talking repete com transição de pose; o cursor fica livre para digitar e usar a página. Frases como “Não tenho mais perguntas”, “No tengo más preguntas” e “No more questions” fecham o card e restauram o repouso e a brincadeira. Também há botão de fechar e Escape. PT / ESP / ENG preserva histórico, pergunta em edição e progresso do clipe. Movimento reduzido mantém o personagem estático e permite conversar.

`assets/js/chibi-answers.js` encontra respostas por assuntos e palavras-chave na base local, com limites explícitos para fatos desconhecidos. As perguntas não são enviadas a um serviço externo. `assets/js/chibi-chat.js` controla o diálogo acessível, os links, o carregamento com nova tentativa e a posição em telas pequenas e com teclado virtual. A conversa também funciona como alternativa quando WebGL está indisponível. Para ampliar as respostas, edite o JSON. `scripts/chibi-chat-qa.cjs` verifica o minuto de inatividade, a recusa, a conversa, os fatos, a troca de idioma, o encerramento, a retomada do cursor, as quatro páginas, o layout responsivo e a recuperação após falha de rede.
