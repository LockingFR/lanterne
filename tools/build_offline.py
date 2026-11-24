"""Construit dist/lanterne-offline-vX.Y.Z.zip, dist/SHA256SUMS et dist/site (dossier à déployer).

Usage : python tools/build_offline.py      (version lue dans VERSION)

Le zip ne contient que les fichiers publics et un SHA256SUMS interne. Il est reproductible : dates figées,
ordre fixe, aucune compression. dist/site contient exactement les mêmes fichiers publics, plus _headers.
"""
import hashlib, os, shutil, sys, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from site_files import ROOT, public_files, version


def sums(pairs):
    return "".join(f"{hashlib.sha256(b).hexdigest()}  {n}\n" for n, b in pairs)


def main():
    name = f"lanterne-offline-v{version()}"
    dist = os.path.join(ROOT, "dist"); site = os.path.join(dist, "site")
    shutil.rmtree(dist, ignore_errors=True); os.makedirs(site, exist_ok=True)
    files = []
    for p in public_files():
        with open(os.path.join(ROOT, p), "rb") as f:
            files.append((p, f.read()))
        if not p.endswith((".png", ".woff2")) and b"\r" in files[-1][1]:
            sys.exit(f"Fins de ligne CRLF dans {p} : le zip ne serait pas reproductible")
    inner = ("SHA256SUMS", sums(files).encode())
    zpath = os.path.join(dist, name + ".zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_STORED) as z:
        for p, b in files + [inner]:
            i = zipfile.ZipInfo(f"{name}/{p}", (2026, 1, 1, 0, 0, 0))
            i.create_system = 3; i.external_attr = 0o100644 << 16
            z.writestr(i, b)
    with open(zpath, "rb") as f:
        blob = f.read()
    outer = [(name + ".zip", blob)] + [(f"{name}/{p}", b) for p, b in files + [inner]]
    with open(os.path.join(dist, "SHA256SUMS"), "w", encoding="utf-8", newline="\n") as f:
        f.write(sums(outer))
    for p, b in files:
        d = os.path.join(site, p); os.makedirs(os.path.dirname(d), exist_ok=True)
        with open(d, "wb") as f:
            f.write(b)
    shutil.copyfile(os.path.join(ROOT, "_headers"), os.path.join(site, "_headers"))
    print(f"{zpath}\n{len(files)} fichiers publics\nSHA-256 {hashlib.sha256(blob).hexdigest()}")


if __name__ == "__main__":
    main()
