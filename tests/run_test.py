"""Test de bout en bout : sert le site avec les en-têtes de _headers (dont la CSP),
génère une fausse sauvegarde, la déchiffre dans Chromium et vérifie le résultat.
Usage : pip install cryptography playwright && playwright install chromium
        python tests/run_test.py
"""
import asyncio, http.server, os, subprocess, sys, threading
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
HEADERS = [l.strip().split(": ", 1) for l in open(os.path.join(ROOT, "_headers")) if ": " in l]

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        for k, v in HEADERS:
            if k != "Strict-Transport-Security": self.send_header(k, v)
        super().end_headers()
    def log_message(self, *a): pass

def main():
    subprocess.run([sys.executable, os.path.join(HERE, "gen_backup.py")], check=True, stdout=subprocess.DEVNULL)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8765), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    ok = asyncio.run(run())
    srv.shutdown(); sys.exit(0 if ok else 1)

async def run():
    out = os.path.join(HERE, "out"); errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto("http://127.0.0.1:8765/?lang=fr"); await pg.wait_for_timeout(500)
        await pg.set_input_files("#dirInput", os.path.join(out, "SignalBackups"))
        await pg.fill("#aep", open(os.path.join(out, "aep.txt")).read())
        await pg.click("#go"); await pg.wait_for_timeout(1500)
        status = await pg.inner_text("#status")
        await pg.click(".chatbtn:nth-child(2)"); await pg.wait_for_timeout(800)
        conv = await pg.inner_text("#msgs")
        imgs = await pg.eval_on_selector_all("#msgs img", "e => e.map(x => x.naturalWidth)")
        await pg.fill("#aep", "A" * 64); await pg.click("#go"); await pg.wait_for_timeout(800)
        bad = await pg.inner_text("#status")
        await b.close()
    checks = {
        "déchiffrement": "déchiffrée" in status,
        "texte": "Voici la photo" in conv,
        "image": imgs == [8],
        "mauvaise clé refusée": "incorrecte" in bad,
        "aucune erreur console/CSP": not errs,
    }
    for k, v in checks.items(): print(("OK   " if v else "ÉCHEC"), k)
    if errs: print("Erreurs :", errs)
    return all(checks.values())

if __name__ == "__main__": main()
