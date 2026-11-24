# Lanterne : consignes pour Claude Code

## Le projet
Site statique (aucun serveur) qui déchiffre et affiche les **sauvegardes locales Signal au format v2**
(Signal 8.30+, Android, iOS, Desktop) entièrement dans le navigateur, avec la clé de récupération (AEP).
Lit aussi, à titre expérimental, l'export en clair `main.jsonl`.

- `index.html` : page outil + landing (FR/EN via `data-l`)
- `assets/app.js` : toute la logique (crypto WebCrypto, protobuf minimal, rendu)
- `assets/style.css` : styles (jetons de couleur clair/sombre en tête)
- `lire-sauvegarde-signal/`, `en/read-signal-backup/` : pages de guide SEO
- `_headers` : en-têtes Cloudflare Pages (CSP stricte), `sw.js` : cache hors ligne
- `tests/gen_backup.py` : fabrique une fausse sauvegarde ; `tests/run_test.py` : test de bout en bout

## Règles absolues
1. **Ne jamais demander, lire, afficher ni enregistrer** la clé de récupération de l'utilisateur, ni le contenu
   de ses messages ou de ses fichiers de sauvegarde. Pour déboguer une vraie sauvegarde, l'utilisateur lance
   lui-même la page dans son navigateur et te colle **uniquement** les lignes du journal technique
   (étapes, tailles, messages d'erreur). Si tu as besoin de plus d'informations, ajoute au code un diagnostic
   qui n'affiche que des informations de structure (tailles, numéros de champs protobuf, étape qui échoue),
   jamais de contenu.
2. Aucun script, police, image ou service externe. Tout est servi depuis le domaine. La CSP de `_headers`
   doit rester stricte (`connect-src 'self' blob:`, `script-src 'self'`). Pas de régie publicitaire ni
   d'outil d'analyse tiers sur `index.html`.
3. Ne pas copier de code de libsignal (licence AGPL). On réimplémente à partir du format.
4. Après chaque modification : `python tests/run_test.py` doit afficher 5 × OK.
5. Pas de « Signal » dans le nom de domaine ni dans le logo ; mention « non affilié » conservée.

## Le format (référence : github.com/slurdge/signal-backup-decrypt, MIT)
- AEP normalisée : espaces retirés, `#`→`O`, `=`→`0`, minuscules, 64 caractères.
- `backupKey = HKDF-SHA256(ikm=AEP utf-8, salt=∅, info="20240801_SIGNAL_BACKUP_KEY", 32)`
- `metadataKey = HKDF(backupKey, info="20241011_SIGNAL_LOCAL_BACKUP_METADATA_KEY", 32)`
- `metadata` = protobuf { 1: version, 2: { 1: iv (12 o), 2: encryptedId } } ;
  `backupId = AES-256-CTR(metadataKey, iv ‖ 00000000)` déchiffre `encryptedId`
- `messageKey = HKDF(backupKey, info="20241007_SIGNAL_BACKUP_ENCRYPT_MESSAGE_BACKUP:" ‖ backupId, 64)`
  → HMAC = octets 0-31, AES = octets 32-63
- `main` = IV(16) ‖ AES-256-CBC ‖ HMAC-SHA256(32) sur IV‖chiffré ; magic `SBACKUP\x01` = confidentialité
  persistante (sauvegarde distante, non prise en charge)
- clair = gzip → trames protobuf préfixées par une longueur varint : BackupInfo puis Frame (schéma Backup.proto)
- médias : `files/xx/hex(SHA-256(plaintextHash ‖ localKey))`, même enveloppe (clés AES = localKey[0:32],
  HMAC = localKey[32:64]), tronqués à `locatorInfo.size`

## Pistes de travail (dans l'ordre)
1. Valider sur une vraie sauvegarde (voir règle 1).
2. Export HTML autonome d'une conversation (Premium plus tard).
3. Recherche globale plus rapide, pagination, rendu des styles de texte (gras, italique, spoiler).
4. Pages de guide supplémentaires (Android, iPhone, Desktop, « échec de restauration »).
