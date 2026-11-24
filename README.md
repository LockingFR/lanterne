# Lanterne

Lecteur de sauvegardes locales Signal (format v2, Signal 8.30+) qui déchiffre tout **dans le navigateur**
avec la clé de récupération. Aucun serveur, aucun envoi de données, fonctionne hors ligne.

*Reads Signal local backups (v2 format) entirely in your browser using your recovery key. No server, no upload.*

## Lancer en local
```bash
python -m http.server 8000
# puis ouvrir http://localhost:8000 (ou ouvrir directement index.html)
```

## Tester
```bash
pip install cryptography playwright
playwright install chromium
python tests/run_test.py
```
Le test fabrique une fausse sauvegarde, la déchiffre dans Chromium avec la CSP de production et vérifie
texte, image et rejet d'une mauvaise clé.

`python tests/run_offline_test.py` teste la version hors ligne en `file://` (Chromium, Firefox, WebKit) et la langue.

## Version hors ligne / Offline version
[Télécharger la dernière version](https://github.com/LockingFR/lanterne/releases/latest), vérifier son empreinte,
extraire tout le zip, couper le réseau, ouvrir `index.html`. Détails : [SECURITY.md](SECURITY.md).

- `python tools/build_offline.py` : construit le zip (reproductible) et `SHA256SUMS` dans `dist/`.
- `python tools/verify-deployment.py` : compare le site en ligne à la release.

## Déployer
Site statique sur Cloudflare Pages. Le site doit rester identique à la dernière release : augmenter `VERSION`,
lancer `build_offline.py`, publier la release, puis
`npx wrangler pages deploy dist/site --project-name lanterne-backup --branch main` et `verify-deployment.py`.

## Sécurité
- Modèle de menace, CSP et signalement d'une faille : [SECURITY.md](SECURITY.md).
- Tout le déchiffrement passe par WebCrypto. `_headers` impose une CSP qui interdit toute connexion externe.
- Ne versionnez jamais une vraie sauvegarde ni une clé (voir `.gitignore`).

## Crédits
Format documenté par libsignal et par [signal-backup-decrypt](https://github.com/slurdge/signal-backup-decrypt).
Lanterne n'est pas affilié à Signal Technology Foundation.

Licence MIT.
