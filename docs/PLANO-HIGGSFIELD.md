# Plano: trocar o 3D pelos vídeos de IA (Higgsfield)

Hoje o capítulo 06, **Um dia na Vila**, usa cinco vídeos que eu mesmo renderizei a partir de uma maquete 3D. Quando você assinar a Higgsfield, dá para trocar esses cinco arquivos por vídeos gerados por IA no estilo **maquete de argila**. O site não muda: só os arquivos em `public/mundo/`.

## O jeito mais simples

Abra uma conversa nova dentro do Projeto **Villa** e escreva:

> Assinei a Higgsfield. Gere os vídeos do Um dia na Vila seguindo o plano de ação.

Eu confiro o saldo, gero, reviso cada trecho e deixo os arquivos prontos para você colocar no site.

## Quanto custa

Preços medidos na sua conta em 30/09/2026 (podem mudar):

| O quê | Quantos | Créditos cada | Total |
|---|---|---|---|
| Imagem inicial (GPT Image 2, 2k) | 1 | 6,5 | 6,5 |
| Trecho de vídeo 8 s em 1080p (Seedance 2.0) | 5 | 72 | 360 |
| Margem para refazer 1 ou 2 trechos | — | 72 | ~72–144 |
| **Total em alta definição (1080p)** | | | **~440–510** |
| Total em 720p (metade do preço por trecho) | | | ~220–260 |

Precisa de **plano básico ou maior**: no plano grátis a Higgsfield bloqueia a geração ("Requires basic plan or higher").

## O que o Claude faz, passo a passo

Termos: *trecho* = um dos cinco vídeos; *emenda* = o ponto onde um trecho acaba e o próximo começa; *quadro* = uma imagem parada do vídeo.

1. **Saldo.** Conferir créditos e plano (`balance`). Se não cobrir a estimativa, avisar antes de gastar.
2. **Imagem inicial.** Gerar com `gpt_image_2`, proporção 3:2, `resolution 2k`, `quality high`, com o prompt da seção *Prompts* (preâmbulo + cena 1). Revisar: tem que parecer uma ilha em miniatura inteira, sem texto.
3. **Trecho 1.** `seedance_2_0`, `mode std`, `resolution 1080p`, `aspect_ratio 16:9`, `duration 8`, `generate_audio false`, com a imagem inicial como `start_image`. **Nunca usar `end_image`** — na travessia contínua isso faz a câmera recuar e a emenda "engasga".
4. **Emendar.** Tirar o **último quadro real** do trecho que acabou de sair:
   `ffmpeg -sseof -0.15 -i trecho-1.mp4 -frames:v 1 -q:v 2 ultimo-1.png`
   Subir esse quadro (`media_upload` → `media_confirm`) e usar como `start_image` do trecho 2. Repetir até o 5. É isso que faz a viagem parecer um voo só.
5. **Conferir cada último quadro antes do próximo trecho.** Ele precisa parecer uma câmera deslizando calma para a frente. Se terminou no meio de uma curva brusca, refazer aquele trecho antes de seguir — um quadro ruim estraga todos os seguintes.
6. **Filtro de conteúdo.** O Seedance às vezes barra cenas inocentes (piscina, rede, praia). Se barrar: tentar de novo; tirar palavras como *pool*, *swim*, *bed*, *wine* e acrescentar *empty, no people*; em último caso, gerar só aquele trecho com `kling3_0` (`mode std`, `sound off`) usando o mesmo quadro inicial.
7. **Um modelo só.** Todos os trechos no mesmo modelo. Trocar de modelo no meio muda a textura e aparece na emenda.
8. **Codificar** cada trecho (sem som, pronto para rolagem):
   `ffmpeg -i bruto-N.mp4 -an -vf "unsharp=5:5:0.8:5:5:0.0" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -g 8 -keyint_min 8 -sc_threshold 0 -movflags +faststart trecho-N.mp4`
9. **Imagens de apoio** de cada trecho:
   - `trecho-N.webp` = primeiro quadro (aparece enquanto o vídeo carrega)
   - `calmo-N.webp` = quadro do meio (para quem pediu "menos movimento" no celular/computador)
10. **Testar** rolando a página: as emendas não podem "pular", o texto tem que aparecer no meio de cada cena.
11. **Guardar o 3D.** Antes de substituir, mover os arquivos atuais para `public/mundo/3d/` (dá para voltar a qualquer momento).

## Prompts (em inglês, que é como o modelo entende melhor)

**Preâmbulo da imagem inicial** (igual, palavra por palavra):

```
Isometric low-poly 3D diorama floating as a small rounded island on a plain solid #EFEEEA background with a soft contact shadow beneath it. Soft matte clay 3D render, rounded toy-model shapes, tilt-shift miniature look, soft natural light matching the time of day described below, soft long shadows. Cohesive muted coastal palette: warm sand #E4D6CB, coral pink #E9C7BE, dusty rose #D9AFA6, sea-glass green #BFD3CC, stone grey #96958E, charcoal #2A2C2B, with clear turquoise water and deep green palm fronds. Highly detailed, centered composition, absolutely no text, no letters, no numbers, no logos.
Subject: dawn at a tiny coastal village of eight small whitewashed beach houses with pale clay-tile roofs and wooden verandas, scattered among tall coconut palms and low green coastal shrubs on a wide strip of pale sand. On one side a calm river curves in and meets the sea; just offshore a low dark coral reef line with gentle white foam. First soft pink-and-gold dawn light, a thin mist over the river, warm light glowing in two windows, two small wooden fishing boats pulled up on the sand. No people.
```

**Final de todos os trechos** (colar no fim de cada prompt abaixo):

```
Soft matte clay 3D diorama, rounded toy-model shapes, tilt-shift miniature look. Muted coastal palette of warm sand #E4D6CB, coral pink #E9C7BE, dusty rose #D9AFA6, sea-glass green #BFD3CC and stone grey #96958E, with clear turquoise water and deep green palm fronds. Smooth, graceful, slow motion, subtle parallax. No text, no captions.
```

**Trecho 1 — 5h30, a maré acorda a Vila** (começa na imagem inicial)

```
Single continuous cinematic camera move, no cuts. The camera starts high and far, looking at the whole tiny island village from outside like a miniature model at dawn, then slowly glides forward and descends over the palm trees toward one small whitewashed house with a wooden veranda. As it moves, the pink dawn light turns into soft early-morning light. In the final second, settle into a slow, steady forward glide toward the veranda of that house.
```

**Trecho 2 — 7h, café na varanda** (começa no último quadro do trecho 1)

```
Single continuous cinematic camera move, no cuts. Continue the same slow, steady forward glide. The camera glides along the side of the small whitewashed house and reveals its wooden veranda, where a breakfast table is set with a coffee pot, cups, a bowl of tropical fruit and a cake, a striped hammock hanging nearby, empty, no people. It pushes gently toward the table in bright fresh morning light, then eases past it. In the final second, settle back into a slow, steady forward glide toward the beach and the sea beyond the veranda.
```

**Trecho 3 — 10h, piscinas naturais** (começa no último quadro do trecho 2)

```
Single continuous cinematic camera move, no cuts. Continue the same slow, steady forward glide. The camera glides out over the pale sand beach and low over a coral reef flat exposed at low tide, where shallow natural rock basins hold crystal-clear turquoise water with small fish, empty, no people, in sparkling mid-morning sunlight. It tracks low and level along the reef. In the final second, settle back into a slow, steady forward glide along the shoreline toward a river mouth.
```

**Trecho 4 — 16h, canoa no rio** (começa no último quadro do trecho 3)

```
Single continuous cinematic camera move, no cuts. Continue the same slow, steady forward glide. The camera enters a calm river mouth and glides upriver between mangroves and coconut palms, passing alongside a long wooden canoe with a tiny clothed boatman standing at the stern with a pole, in warm golden late-afternoon light with long soft shadows. In the final second, settle back into a slow, steady forward glide, rising gently above the mangroves toward the village.
```

**Trecho 5 — 20h, jantar** (começa no último quadro do trecho 4)

```
Single continuous cinematic camera move, no cuts. Continue the same slow, steady forward glide. As dusk turns to night, the camera glides back over the village toward a palm-thatched pergola lit by warm string lights and lanterns, where a long wooden dinner table is set with candles, plates, clay pots and a whole grilled fish; the windows of the little houses glow warm. The camera slowly comes to rest facing the lit table.
```

## Onde cada arquivo entra

| Arquivo em `public/mundo/` | Cena no site |
|---|---|
| `trecho-1.mp4`, `trecho-1.webp`, `calmo-1.webp` | 5h30 — A maré acorda a Vila |
| `trecho-2.mp4`, `trecho-2.webp`, `calmo-2.webp` | 7h — Café na varanda |
| `trecho-3.mp4`, `trecho-3.webp`, `calmo-3.webp` | 10h — Piscinas naturais |
| `trecho-4.mp4`, `trecho-4.webp`, `calmo-4.webp` | 16h — Canoa no rio |
| `trecho-5.mp4`, `trecho-5.webp`, `calmo-5.webp` | 20h — Jantar com o peixe do dia |

Textos e ritmo (quanto cada cena dura na rolagem) ficam em `src/mundo/cenas.js`. Não precisam mudar.

## Versão para celular (opcional, depois)

Hoje o celular mostra o centro do vídeo deitado. Uma versão própria em pé (9:16) é outra série de 5 trechos gerados do mesmo jeito, com `aspect_ratio 9:16`: mais ~370 créditos. Os arquivos entram como `trecho-N-m.mp4` e `trecho-N-m.webp`, e basta preencher `videoCelular` e `posterCelular` de cada cena em `src/mundo/cenas.js` — o motor já sabe usar.
