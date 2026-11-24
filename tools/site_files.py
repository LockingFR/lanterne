"""Liste unique des fichiers publics : sert au zip hors ligne, au déploiement et aux tests."""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ["404.html", "LICENSE", "index.html", "manifest.webmanifest", "robots.txt", "sitemap.xml", "sw.js"]
DIRS = ["assets", "confidentialite", "en", "lire-sauvegarde-signal", "restauration-signal-echouee",
        "sauvegarde-signal-android", "sauvegarde-signal-desktop", "sauvegarde-signal-iphone"]


def public_files():
    out = list(FILES)
    for d in DIRS:
        for base, _, names in os.walk(os.path.join(ROOT, d)):
            out += [os.path.relpath(os.path.join(base, n), ROOT).replace(os.sep, "/") for n in names]
    return sorted(out)


def version():
    with open(os.path.join(ROOT, "VERSION"), encoding="utf-8") as f:
        return f.read().strip()
