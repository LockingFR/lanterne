"""Vérifie que le site en ligne sert exactement les fichiers d'une release GitHub.
Checks that the live site serves exactly the files of a GitHub release.

Usage : python tools/verify-deployment.py [--version X.Y.Z] [--site URL] [--release-dir DOSSIER]
Python 3.8+, bibliothèque standard uniquement. Code de sortie : 0 = identique, 1 = différence, 2 = erreur.

1. Télécharge (ou lit dans --release-dir) le zip et SHA256SUMS de la release, la dernière par défaut.
2. Recalcule les empreintes du zip et de chacun de ses fichiers et les compare à SHA256SUMS.
3. Télécharge chaque fichier du site et compare son SHA-256.
4. Vérifie que l'en-tête HTTP CSP vaut la CSP de la page publiée, plus frame-ancestors 'none'.

Limite : montre ce que le site sert à cette machine, maintenant, pas ce qu'il servira à quelqu'un d'autre.
"""
import argparse, hashlib, io, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request, zipfile
REPO = "LockingFR/lanterne"
UA = {"User-Agent": "Mozilla/5.0 (verify-deployment)", "Cache-Control": "no-cache"}


def sha(b): return hashlib.sha256(b).hexdigest()


def get(url, same_host=False):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                if same_host and urllib.parse.urlsplit(r.url)[:2] != urllib.parse.urlsplit(url)[:2]:
                    raise ValueError(f"redirigé vers {r.url}")
                return r.read(), r.headers
        except urllib.error.URLError as e:
            if attempt == 2 or (isinstance(e, urllib.error.HTTPError) and e.code < 500): raise
            time.sleep(2)


def load_release(a):
    ver = a.version
    if a.release_dir:
        def read(n):
            with open(os.path.join(a.release_dir, n), "rb") as f: return f.read()
        if not ver:
            ver = next(m[1] for m in (re.fullmatch(r"lanterne-offline-v(.+)\.zip", n) for n in os.listdir(a.release_dir)) if m)
    else:
        if not ver:
            ver = json.loads(get(f"https://api.github.com/repos/{REPO}/releases/latest")[0])["tag_name"].lstrip("v")
        def read(n): return get(f"https://github.com/{REPO}/releases/download/v{ver}/{n}")[0]
    return ver, read(f"lanterne-offline-v{ver}.zip"), read("SHA256SUMS").decode("utf-8")


def main():
    ap = argparse.ArgumentParser(description="Compare le site en ligne à une release GitHub.")
    ap.add_argument("--version"); ap.add_argument("--release-dir")
    ap.add_argument("--site", default="https://lanterne-backup.com")
    a = ap.parse_args(); site = a.site.rstrip("/")
    ver, blob, sums = load_release(a)
    name = f"lanterne-offline-v{ver}"; prefix = name + "/"
    want = {n: h for h, n in (l.split("  ", 1) for l in sums.splitlines() if l.strip())}
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        files = {i.filename: z.read(i) for i in z.infolist() if not i.is_dir()}
    bad = []
    if want.get(name + ".zip") != sha(blob): bad.append("le zip ne correspond pas à SHA256SUMS")
    if set(want) != set(files) | {name + ".zip"}: bad.append("le contenu du zip ne correspond pas à la liste de SHA256SUMS")
    bad += [f"{n} : différent de SHA256SUMS" for n, b in files.items() if want.get(n) != sha(b)]
    print(f"Release v{ver} : {'ÉCHEC' if bad else 'OK'} (zip {sha(blob)})")

    page = files[prefix + "index.html"].decode("utf-8")
    csp = re.search(r'http-equiv="Content-Security-Policy" content="([^"]*)"', page)[1] + "; frame-ancestors 'none'"
    good = total = 0
    for full in sorted(files):
        p = full[len(prefix):]
        if p == "SHA256SUMS": continue  # propre au zip, pas servi par le site
        total += 1; why = []
        url = f"{site}/" + (p[:-len("index.html")] if p.endswith("index.html") else p)
        try:
            body, head = get(url, True)
            if sha(body) != sha(files[full]): why.append(f"SHA-256 {sha(body)} au lieu de {sha(files[full])}")
            if p.endswith(".html") and head.get_all("Content-Security-Policy") != [csp]: why.append("CSP HTTP différente")
        except Exception as e:
            why.append(str(e))
        if why: bad.append(f"{p} : {', '.join(why)}")
        else: good += 1
        print("ÉCHEC" if why else "OK   ", p)
    print(f"\n{good}/{total} fichiers identiques sur {site}")
    print("\nDIFFÉRENCES :\n- " + "\n- ".join(bad) if bad else "Le site sert le même code que la release.")
    return 1 if bad else 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(errors="replace")
    try: sys.exit(main())
    except Exception as e: print("Vérification impossible :", e, file=sys.stderr); sys.exit(2)
