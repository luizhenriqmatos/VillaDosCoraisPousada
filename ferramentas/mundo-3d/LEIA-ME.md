# Maquete 3D do "Um dia na Vila"

Esta pasta **não vai para o site**. Ela guarda a maquete 3D (Three.js) que gerou os cinco vídeos de `public/mundo/`, para dar para ajustar e renderizar de novo.

- `cena.html` + `cena.js` — a maquete: ilha, 8 casas, coqueiros, recife com piscinas naturais, rio com mangue e canoa, pérgola do jantar, luz mudando do amanhecer à noite. O caminho da câmera está em `PONTOS`, as horas em `HORAS`, as cores da luz em `LUZ`.
- `renderizar.py` — abre a maquete num Chromium sem tela e salva quadro por quadro.

Tudo é determinístico: o mesmo quadro sai sempre igual, e o último quadro de um trecho é o primeiro do seguinte. Por isso as emendas não pulam.

## Renderizar de novo (Linux/macOS com Python)

```
npm install
pip install playwright pillow && python3 -m playwright install chromium
python3 ferramentas/mundo-3d/renderizar.py previa --n 20 --saida /tmp/previa        # folha de contato rápida
python3 ferramentas/mundo-3d/renderizar.py quadros --saida /tmp/quadros              # 1081 quadros em 1920x1080
```

Depois, para cada trecho N (216 quadros cada, 24 por segundo; o trecho N vai do quadro 216·(N−1) ao 216·N):

```
ffmpeg -framerate 24 -start_number INICIO -i /tmp/quadros/q%05d.jpg -frames:v 217 \
  -an -vf "unsharp=5:5:0.8:5:5:0.0" -c:v libx264 -preset slow -tune animation -crf 22 -pix_fmt yuv420p \
  -g 8 -keyint_min 8 -sc_threshold 0 -movflags +faststart public/mundo/trecho-N.mp4
```

Sem placa de vídeo, cada quadro em 1080p leva ~3 s (≈ 55 min no total).
