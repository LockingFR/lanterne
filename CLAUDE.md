# Lanterne : consignes pour Claude Code

Lire PROGRESS.md en premier

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

## Déjà validé (24/11/2026)
- HKDF clé de sauvegarde et clé de messages : identiques aux vecteurs connus (KAT) de signal-backup-decrypt.
- `legacy-account.binproto.encrypted` (libsignal) ouvert dans la page, renommé `main`, avec un `metadata`
  fabriqué (AEP = 64 × « m », ACI = 16 × 0x11, backupId = HKDF(backupKey, "20241024_SIGNAL_BACKUP_ID:" ‖ ACI, 16)) :
  HMAC vérifié, déchiffrement, gzip, 3 trames lues.
- Schéma `S` : 97 numéros de champs comparés à `backup.proto`, aucun écart.
- `canonical-backup.binproto` (remis dans une enveloppe chiffrée de test) et le `.jsonl` officiel : conversation,
  2 messages et citations corrects.
- Non validé sur données officielles : médias, groupes avec messages, gros volumes. `tests/kat_test.mjs` reste à écrire.

## Validation sans vraie sauvegarde (le propriétaire n'utilise pas Signal)
Personne dans l'équipe n'a de sauvegarde Signal. On valide donc contre les données de test officielles :
1. Cloner `https://github.com/slurdge/signal-backup-decrypt` (avec `--recurse-submodules` : libsignal est
   dans `vendor/`). Lancer ses tests (`uv run pytest`).
2. Reprendre les vecteurs de test connus (KAT) de `tests/test_keys.py` et vérifier que les fonctions JS de
   `assets/app.js` (HKDF, clé de métadonnées, clé de messages, déchiffrement de l'identifiant) donnent
   exactement les mêmes octets. Écrire ce test dans `tests/kat_test.mjs` (Node 20+, WebCrypto natif).
3. Dans libsignal (`vendor/libsignal/rust/message-backup/tests/res/`), chercher les fichiers de test
   (`.binproto`, et toute sauvegarde chiffrée de test avec sa clé). Vérifier que le décodeur protobuf de
   `app.js` lit les trames sans erreur et retrouve destinataires, conversations et messages. Corriger les
   numéros de champs du schéma `S` si besoin, en les vérifiant dans `backup.proto`.
4. Fichiers officiels confirmés dans libsignal (`rust/message-backup/tests/res/`) :
   - `canonical-backup.binproto` + `canonical-backup.expected.json` : trames en clair et résultat attendu →
     vérifier que `dec()` de `app.js` retrouve les mêmes destinataires, conversations et messages.
   - `canonical-backup.takeout-export.expected.jsonl` → vérifier la lecture JSONL (`openJsonl`).
   - `test-cases/valid-encrypted/legacy-account.binproto.encrypted` : vrai fichier chiffré par le code de
     Signal, même enveloppe que `main` (sans confidentialité persistante). Retrouver dans les tests Rust
     de libsignal la clé (AEP ou BackupKey) et l'ACI utilisés, calculer le backupId
     (`HKDF(backupKey, "20241024_SIGNAL_BACKUP_ID:" ‖ ACI, 16)`), puis déchiffrer ce fichier avec les
     fonctions de `app.js` et comparer au `.source.jsonproto`. `new-account…` utilise la confidentialité
     persistante (`SBACKUP\x01`) : vérifier seulement que la page affiche le bon message d'erreur.
   - Seul le fichier `metadata` (propre aux sauvegardes locales) n'a pas de fichier officiel : son format
     vient de signal-backup-decrypt, testé par son auteur sur de vraies sauvegardes.
5. Résumer ce qui est validé et ce qui ne l'est pas. Ne rien publier si les KAT échouent.

## Pistes de travail (dans l'ordre)
1. Valider (section ci-dessus), et sur une vraie sauvegarde si un utilisateur volontaire en fournit le journal technique (voir règle 1).
2. Export HTML autonome d'une conversation (Premium plus tard).
3. Recherche globale plus rapide, pagination, rendu des styles de texte (gras, italique, spoiler).
4. Pages de guide supplémentaires (Android, iPhone, Desktop, « échec de restauration »).

## Pages générées
`python tools/build_pages.py` régénère `en/index.html` (depuis `index.html`), les guides, les pages de confidentialité et
`sitemap.xml`. À relancer après toute modification de `index.html`. Ne pas éditer ces fichiers à la main.
Le bouton « Copier le diagnostic » ne doit contenir que des tailles, compteurs et étapes. La carte Premium est masquée.
