"""Version hors ligne et langue. Usage : python tests/run_offline_test.py
1. Construit le zip, vérifie ses empreintes, l'extrait, puis l'ouvre en file:// sans réseau dans chaque moteur
   installé (playwright install chromium firefox webkit) : déchiffrement, image, export, navigation.
2. Redirection de langue : navigateurs, choix mémorisé, robots, hreflang.
3. Aucune requête réseau pendant le déchiffrement, service worker, CSP identique partout.
"""
import asyncio, hashlib, http.server, os, pathlib, re, subprocess, sys, tempfile, threading, zipfile
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools")); sys.path.insert(0, HERE)
from site_files import public_files, version
import run_test
RES = []
BASE = "http://127.0.0.1:8766"
GOOGLE = "Mozilla/5.0 (Linux; Android 6.0.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
LOCAL = ("blob:", "data:")


def check(name, ok, info=""):
    RES.append(bool(ok)); print("OK   " if ok else "ÉCHEC", name, "" if ok else info)


def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f: return f.read()


def digest(p):
    with open(p, "rb") as f: return hashlib.sha256(f.read()).hexdigest()


async def decrypt(pg):
    out = os.path.join(HERE, "out")
    await pg.set_input_files("#dirInput", os.path.join(out, "SignalBackups"))
    await pg.fill("#aep", open(os.path.join(out, "aep.txt")).read())
    await pg.click("#go")
    await pg.wait_for_selector("#status.ok", timeout=15000)
    await pg.click(".chatbtn:nth-child(2)")
    await pg.wait_for_selector("#msgs img", state="attached", timeout=8000)
    await pg.wait_for_timeout(500)
    return "Voici la photo" in await pg.inner_text("#msgs") and await pg.eval_on_selector_all("#msgs img", "e => e.map(x => x.naturalWidth)") == [8]


async def offline(p, engine, folder):
    try: b = await getattr(p, engine).launch()
    except Exception: print("PASSÉ", engine, "non installé"); return
    errs, reqs = [], []

    async def context(**k):
        # L'émulation hors ligne de WebKit bloque aussi file:// : on y coupe http(s) par interception.
        cx = await b.new_context(offline=engine != "webkit", **k)
        if engine == "webkit": await cx.route(re.compile("^https?:"), lambda r: r.abort())
        return cx
    try:
        cx = await context(locale="fr-FR", accept_downloads=True); pg = await cx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.on("request", lambda r: reqs.append(r.url))
        home = (pathlib.Path(folder) / "index.html").as_uri()
        await pg.goto(home); await pg.wait_for_timeout(1000)
        check(f"{engine} file:// : feuille de style", await pg.evaluate("getComputedStyle(document.querySelector('.tool')).display === 'grid'"))
        before = len(reqs)
        check(f"{engine} file:// : déchiffrement et image", await decrypt(pg))
        async with pg.expect_download() as d: await pg.click("#dlHtml")
        check(f"{engine} file:// : export HTML", os.path.getsize(await (await d.value).path()) > 500)
        check(f"{engine} file:// : rien hors blob:/data: au déchiffrement", all(u.startswith(LOCAL) for u in reqs[before:]), reqs[before:])
        check(f"{engine} file:// : aucune erreur console/CSP", not errs, errs)
        # WebKit fait correspondre 'self' à tout sur file:// : limite documentée dans SECURITY.md.
        if engine == "webkit": print("LIMITE webkit file:// : la CSP ne bloque pas le réseau")
        else: check(f"{engine} file:// : CSP active", await pg.evaluate("""new Promise(r => {
            document.addEventListener('securitypolicyviolation', e => r(e.effectiveDirective === 'connect-src'));
            fetch('https://example.org/').catch(() => setTimeout(() => r(false), 800)); })"""))
        # navigateur anglais : accueil → anglais → français → guide français
        en = await (await context(locale="en-US")).new_page()
        await en.goto(home, wait_until="commit"); await en.wait_for_timeout(1200)
        check(f"{engine} file:// : accueil anglais", "/en/index.html" in en.url, en.url)
        await en.click("#lang-fr"); await en.wait_for_timeout(1000)
        await en.click('footer p[data-l="fr"] a:has-text("Android")'); await en.wait_for_timeout(1000)
        check(f"{engine} file:// : langue et liens", "sauvegarde-signal-android/index.html" in en.url, en.url)
    except Exception as e: check(f"{engine} file://", False, e)
    await b.close()


async def languages(p):
    b = await p.chromium.launch()

    async def land(path, locale, ua=None, steps=None):
        cx = await b.new_context(locale=locale, **({"user_agent": ua} if ua else {})); pg = await cx.new_page()
        await pg.goto(BASE + path, wait_until="commit"); await pg.wait_for_timeout(800)
        if steps: await steps(pg)
        u = pg.url.replace(BASE, ""); await cx.close(); return u

    for path, loc, ua, want in [
        ("/", "fr-FR", None, "/"), ("/", "fr-CA", None, "/"), ("/", "en-US", None, "/en/"), ("/", "de-DE", None, "/en/"),
        ("/?x=1#faq", "es-ES", None, "/en/?x=1#faq"), ("/en/", "fr-FR", None, "/en/"), ("/?lang=fr", "en-US", None, "/?lang=fr"),
        ("/?lang=en", "fr-FR", None, "/en/"), ("/en/?lang=fr", "en-US", None, "/"),
        ("/sauvegarde-signal-android/", "en-US", None, "/en/signal-backup-android/"),
        ("/lire-sauvegarde-signal/", "pt-BR", None, "/en/read-signal-backup/"),
        ("/", "en-US", GOOGLE, "/"), ("/confidentialite/", "en-US", GOOGLE, "/confidentialite/"),
        ("/", "en-US", "Mozilla/5.0 (compatible; bingbot/2.0)", "/")]:
        got = await land(path, loc, ua); check(f"langue {loc}{' robot' if ua else ''} {path} -> {want}", got == want, got)

    async def pick(pg, l):
        await pg.click(f"#lang-{l}"); await pg.wait_for_timeout(800)
        await pg.goto(BASE + "/", wait_until="commit"); await pg.wait_for_timeout(800)
    got = await land("/", "en-US", steps=lambda pg: pick(pg, "fr")); check("choix FR mémorisé", got == "/", got)
    got = await land("/", "fr-FR", steps=lambda pg: pick(pg, "en")); check("choix EN mémorisé", got == "/en/", got)

    async def link(pg):
        await pg.click('a[hreflang="fr"]'); await pg.wait_for_timeout(800)
    got = await land("/en/privacy/", "en-US", steps=link); check("lien « Version française » d'un guide", got == "/confidentialite/", got)

    async def old(pg):
        await pg.evaluate("localStorage.setItem('lanterne-lang','fr')")
        await pg.goto(BASE + "/", wait_until="commit"); await pg.wait_for_timeout(800)
    got = await land("/en/", "en-US", steps=old); check("ancienne valeur automatique ignorée", got == "/en/", got)

    cx = await b.new_context(locale="fr-FR"); pg = await cx.new_page(); reqs = []
    await pg.goto(BASE + "/"); await pg.wait_for_timeout(1500)
    cx.on("request", lambda r: reqs.append(r.url))
    ok = await decrypt(pg)
    check("aucune requête réseau pendant le déchiffrement", ok and all(u.startswith(LOCAL) for u in reqs), reqs)
    await pg.click("#lang-en"); await pg.wait_for_timeout(500)
    check("changer de langue garde la sauvegarde ouverte", pg.url == BASE + "/" and "Voici la photo" in await pg.inner_text("#msgs"))
    await pg.evaluate("navigator.serviceWorker.ready.then(() => 1)"); await pg.wait_for_timeout(800)
    await cx.set_offline(True); await pg.goto(BASE + "/en/")
    check("service worker : /en/ hors connexion", "Read your Signal" in await pg.inner_text("h1:visible"))
    await b.close()


def static():
    csp = re.search(r"Content-Security-Policy: (.*)", read("_headers"))[1].strip()
    meta = csp.replace("; frame-ancestors 'none'", "")
    pages = [p for p in public_files() if p.endswith("index.html")]
    check("CSP identique dans les pages et SECURITY.md", all(f'content="{meta}"' in read(p) for p in pages) and csp in read("SECURITY.md"))
    check("aucun chemin absolu dans les pages", not [p for p in pages if re.search(r'(?:href|src)="/', read(p))])
    alt = {}
    for p in pages:
        alt[re.search(r'rel="canonical" href="([^"]+)"', read(p))[1]] = dict(re.findall(r'rel="alternate" hreflang="([^"]+)" href="([^"]+)"', read(p)))
    check("hreflang réciproques, x-default anglais", all(set(a) == {"fr", "en", "x-default"} and a["x-default"] == a["en"] and c in (a["fr"], a["en"]) and alt[a["fr"]] == alt[a["en"]] == a for c, a in alt.items()), alt)


async def main():
    subprocess.run([sys.executable, os.path.join(HERE, "gen_backup.py")], check=True, stdout=subprocess.DEVNULL)
    static()
    build = [sys.executable, os.path.join(ROOT, "tools", "build_offline.py")]
    name = f"lanterne-offline-v{version()}"; zname = os.path.join(ROOT, "dist", name + ".zip")
    subprocess.run(build, check=True, stdout=subprocess.DEVNULL); first = digest(zname)
    subprocess.run(build, check=True, stdout=subprocess.DEVNULL); check("zip reproductible", first == digest(zname))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8766), run_test.H); threading.Thread(target=srv.serve_forever, daemon=True).start()
    with tempfile.TemporaryDirectory() as tmp:
        tmp = os.path.realpath(tmp); folder = os.path.join(tmp, name)
        with zipfile.ZipFile(zname) as z: z.extractall(tmp)
        got = sorted(os.path.relpath(os.path.join(d, n), folder).replace(os.sep, "/") for d, _, ns in os.walk(folder) for n in ns)
        check("zip : fichiers publics uniquement", got == sorted(public_files() + ["SHA256SUMS"]), got)
        with open(os.path.join(ROOT, "dist", "SHA256SUMS"), encoding="utf-8") as f: lines = [l.split("  ", 1) for l in f.read().splitlines()]
        check("SHA256SUMS correct", len(lines) == len(got) + 1 and all(digest(zname if n.endswith(".zip") else os.path.join(tmp, n)) == h for h, n in lines))
        async with async_playwright() as p:
            for e in ("chromium", "firefox", "webkit"): await offline(p, e, folder)
            await languages(p)
    srv.shutdown()
    print(f"{sum(RES)}/{len(RES)}"); return all(RES)


if __name__ == "__main__": sys.exit(0 if asyncio.run(main()) else 1)
