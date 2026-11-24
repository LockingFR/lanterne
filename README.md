# Lanterne

Lecteur de sauvegardes locales Signal (format v2, Signal 8.30+) qui déchiffre tout **dans le navigateur**
avec la clé de récupération. Aucun serveur, aucun envoi de données, fonctionne hors ligne.

*Reads Signal local backups (v2 format) entirely in your browser using your recovery key. No server, no upload.*

## Lancer en local
```bash
python -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Tester
```bash
pip install cryptography playwright
playwright install chromium
python tests/run_test.py
```
Le test fabrique une fausse sauvegarde, la déchiffre dans Chromium avec la CSP de production et vérifie
texte, image et rejet d'une mauvaise clé.

## Déployer
Site statique : Cloudflare Pages (gratuit), sans étape de build, répertoire de sortie `/`.

## Sécurité
- Tout le déchiffrement passe par WebCrypto. `_headers` impose une CSP qui interdit toute connexion externe.
- Ne versionnez jamais une vraie sauvegarde ni une clé (voir `.gitignore`).

## Crédits
Format documenté par libsignal et par [signal-backup-decrypt](https://github.com/slurdge/signal-backup-decrypt).
Lanterne n'est pas affilié à Signal Technology Foundation.

Licence MIT.
