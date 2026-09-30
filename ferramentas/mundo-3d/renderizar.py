"""Renderiza a maquete 3D (cena.html) em quadros e monta os trechos de vídeo.

Uso (da raiz do projeto):
  python3 ferramentas/mundo-3d/renderizar.py previa --n 20          # folha de contato pequena
  python3 ferramentas/mundo-3d/renderizar.py quadros --de 0 --ate 1080 --saida /tmp/quadros
  python3 ferramentas/mundo-3d/renderizar.py montar --quadros /tmp/quadros --saida public/mundo

Precisa de: python3 + playwright (chromium) + ffmpeg + Pillow.
"""
import argparse, base64, functools, http.server, os, socketserver, subprocess, sys, threading, time
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
PORTA = 8765


def servidor():
    class Quieto(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a, **k):
            pass
    handler = functools.partial(Quieto, directory=str(RAIZ))
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", PORTA), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def abrir(p, w, h, fps, seg):
    b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 960, "height": 540})
    erros = []
    pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and erros.append(m.text))
    pg.goto(f"http://127.0.0.1:{PORTA}/ferramentas/mundo-3d/cena.html?w={w}&h={h}&fps={fps}&seg={seg}")
    try:
        pg.wait_for_function("window.cenaPronta === true", timeout=180000)
    except Exception:
        print("ERROS:", erros)
        raise
    if erros:
        print("avisos:", erros[:5])
    return b, pg


def grava(pg, f, destino, q=0.95):
    url = pg.evaluate(f"window.cena.quadro({f}, {q})")
    destino.write_bytes(base64.b64decode(url.split(",", 1)[1]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("modo", choices=["previa", "quadros", "montar", "info"])
    ap.add_argument("--n", type=int, default=20)
    ap.add_argument("--lista", default="")
    ap.add_argument("--w", type=int, default=1920)
    ap.add_argument("--h", type=int, default=1080)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--seg", type=float, default=9)
    ap.add_argument("--de", type=int, default=0)
    ap.add_argument("--ate", type=int, default=-1)
    ap.add_argument("--saida", default="")
    ap.add_argument("--quadros", default="")
    a = ap.parse_args()

    if a.modo == "montar":
        return montar(Path(a.quadros), Path(a.saida), a.fps, int(round(a.fps * a.seg)))

    from playwright.sync_api import sync_playwright
    httpd = servidor()
    with sync_playwright() as p:
        if a.modo == "previa":
            b, pg = abrir(p, 640, 360, a.fps, a.seg)
            info = pg.evaluate("window.cena.info()")
            print(info)
            total = info["TOTAL"]
            idx = [int(x) for x in a.lista.split(",")] if a.lista else [round(total * k / (a.n - 1)) for k in range(a.n)]
            out = Path(a.saida or "/tmp/previa"); out.mkdir(parents=True, exist_ok=True)
            t0 = time.time()
            for f in idx:
                grava(pg, f, out / f"q{f:05d}.jpg", 0.9)
            print(f"{len(idx)} quadros em {time.time() - t0:.1f}s")
            folha(out, idx)
        elif a.modo == "info":
            b, pg = abrir(p, a.w, a.h, a.fps, a.seg)
            print(pg.evaluate("window.cena.info()"))
            t0 = time.time(); grava(pg, 100, Path("/tmp/teste.jpg")); print(f"1 quadro {a.w}x{a.h}: {time.time() - t0:.2f}s")
            t0 = time.time(); grava(pg, 101, Path("/tmp/teste.jpg")); print(f"1 quadro {a.w}x{a.h}: {time.time() - t0:.2f}s")
        else:
            b, pg = abrir(p, a.w, a.h, a.fps, a.seg)
            info = pg.evaluate("window.cena.info()")
            ate = info["TOTAL"] if a.ate < 0 else a.ate
            out = Path(a.saida); out.mkdir(parents=True, exist_ok=True)
            t0 = time.time()
            for f in range(a.de, ate + 1):
                alvo = out / f"q{f:05d}.jpg"
                if alvo.exists() and alvo.stat().st_size > 0:
                    continue
                grava(pg, f, alvo)
                if f % 24 == 0:
                    feito = f - a.de + 1
                    print(f"quadro {f}/{ate}  {(time.time() - t0) / feito:.2f}s/quadro", flush=True)
            print(f"pronto: {a.de}..{ate} em {time.time() - t0:.0f}s", flush=True)
        b.close()
    httpd.shutdown()


def folha(pasta, idx):
    from PIL import Image, ImageDraw
    ims = [Image.open(pasta / f"q{f:05d}.jpg") for f in idx]
    w, h = ims[0].size
    cols = 5
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * h), "white")
    d = ImageDraw.Draw(sheet)
    for k, (f, im) in enumerate(zip(idx, ims)):
        x, y = (k % cols) * w, (k // cols) * h
        sheet.paste(im, (x, y))
        d.rectangle([x, y, x + 70, y + 18], fill="black")
        d.text((x + 4, y + 3), f"{f}", fill="white")
    sheet.save(pasta / "folha.jpg", quality=88)
    print("folha:", pasta / "folha.jpg")


def montar(quadros, saida, fps, fpl):
    """Um .mp4 por trecho. O último quadro de um trecho é o primeiro do seguinte."""
    saida.mkdir(parents=True, exist_ok=True)
    arquivos = sorted(quadros.glob("q*.jpg"))
    total = int(arquivos[-1].stem[1:])
    trechos = total // fpl
    for i in range(trechos):
        lista = quadros / f"lista_{i + 1}.txt"
        with lista.open("w") as fh:
            for f in range(i * fpl, (i + 1) * fpl + 1):
                fh.write(f"file '{quadros / f'q{f:05d}.jpg'}'\nduration {1 / fps:.6f}\n")
        mestre = quadros / f"mestre_{i + 1}.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-r", str(fps), "-f", "image2", "-start_number", str(i * fpl),
                        "-i", str(quadros / "q%05d.jpg"), "-frames:v", str(fpl + 1),
                        "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p", str(mestre)], check=True)
        print("mestre", mestre)


if __name__ == "__main__":
    main()
