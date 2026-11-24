# Security

[Français](#français)

Lanterne decrypts Signal local backups in your browser. This page explains how it works, what it does **not** protect against, how to check it yourself and how to report a vulnerability.

**If you are cautious, use the [offline version](https://github.com/LockingFR/lanterne/releases/latest)**: check its fingerprint, disconnect from the network, then open `index.html`.

## Architecture

- **Everything runs in the browser.** The site is made of static files. There is no application server, account, upload endpoint, analytics or third-party resource.
- **Cryptography comes from WebCrypto**, built into the browser: HKDF-SHA256, HMAC-SHA256, AES-256-CBC and AES-256-CTR. The HMAC of `main` is checked before it is decrypted.
- **No network request is made during decryption.** The page's files are loaded beforehand. Your files are read through the browser's file API, and media are displayed through local `blob:` addresses. An automated test checks this.
- **Nothing sensitive is stored.** The key and decrypted messages stay in the tab's memory until you close or reload it. The only things stored are the language you picked and, on the website, a cache of the site's own files (service worker).
- **Exports are not encrypted.** An exported conversation is readable by anyone who gets the file.

### Exact Content Security Policy

Sent by the website as an HTTP header on every page:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self' blob:; worker-src 'self'; manifest-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

Pages also carry the same policy in a `<meta>` tag, so that it applies to the offline version too. The tag leaves out `frame-ancestors`, which browsers only accept in an HTTP header. The 404 page relies on the HTTP header alone.

**Offline limit in Safari:** in our tests, Chromium and Firefox enforce this policy on pages opened from disk, but WebKit (Safari's engine) treats `'self'` as any address there and does not block outside connections. Lanterne makes none, but disconnect from the network rather than rely on the policy.

The policy blocks scripts and connections to other domains. `'self'` still allows requests to lanterne-backup.com itself, and a CSP does not block every possible channel, such as navigating to another address. It limits accidents and injected code. It does not protect you from the site's own code if that code were changed.

## What Lanterne does not protect against

- **A compromised browser, operating system or device**: malware, keyloggers and screen capture can read the key and messages.
- **Malicious browser extensions**: an extension allowed to access the page can read everything in it. Use a profile without extensions.
- **The website changing in the future**: whoever controls the site, its domain, its hosting (Cloudflare) or the source repository (GitHub) could serve different code on your next visit. This is why the offline version exists.
- **A malicious release**: fingerprints prove that files were not altered after publication. They do not prove that the published code is honest. They are hosted on the same GitHub account as the zip and are not independently signed.
- **Recovery traces**: clearing the key field is not a guaranteed erasure of memory. The clipboard, swap file and your exports are outside Lanterne's control.
- **Someone who already has your backup and your recovery key.**

## Check it yourself

1. **Check the offline version.** Download the zip and `SHA256SUMS` from the [release](https://github.com/LockingFR/lanterne/releases/latest) into the same folder.
   - Linux: `sha256sum --ignore-missing -c SHA256SUMS`
   - macOS: `shasum -a 256 lanterne-offline-v*.zip`, then compare with `SHA256SUMS`
   - Windows (PowerShell): `Get-FileHash lanterne-offline-v*.zip`, then compare with `SHA256SUMS`
2. **Use it without a network.** Extract the whole zip, disconnect, open `index.html`.
3. **Rebuild it.** Check out the tag (for example `git checkout v1.0.0`) and run `python tools/build_offline.py`: the zip is reproducible and must have the same SHA-256.
4. **Check the website.** Run `python tools/verify-deployment.py` (Python 3.8+, no dependency). It downloads every file of the site and compares its SHA-256 with the release. This shows what the site serves to you at that moment; it cannot show what it serves to someone else or later.
5. **Watch the network.** Open the browser's developer tools, Network tab, then decrypt: only `blob:` and `data:` entries should appear.

## Report a vulnerability

Please do not publish details of a vulnerability in a public issue.

Use GitHub's [private vulnerability report](https://github.com/LockingFR/lanterne/security/advisories/new) (a GitHub account is required). Only the maintainer can read it.

Never send a real backup, recovery key, name or message. Use synthetic data such as that made by `tests/gen_backup.py`. Fixes go into the latest version only.

---

# Français

Lanterne déchiffre les sauvegardes locales Signal dans votre navigateur. Cette page explique son fonctionnement, ce qu'elle ne protège **pas**, comment vérifier vous-même et comment signaler une faille.

**Si vous êtes prudent, utilisez la [version hors ligne](https://github.com/LockingFR/lanterne/releases/latest)** : vérifiez son empreinte, coupez votre connexion, puis ouvrez `index.html`.

## Architecture du site

- **Tout se passe dans le navigateur.** Le site est fait de fichiers statiques : pas de serveur applicatif, de compte, de point d'envoi, d'outil d'analyse ni de ressource tierce.
- **La cryptographie vient de WebCrypto**, intégré au navigateur : HKDF-SHA256, HMAC-SHA256, AES-256-CBC et AES-256-CTR. Le HMAC de `main` est vérifié avant son déchiffrement.
- **Aucune requête réseau pendant le déchiffrement.** Les fichiers de la page sont chargés avant. Les vôtres sont lus par l'API de fichiers du navigateur, et les médias affichés par des adresses locales `blob:`. Un test automatisé le vérifie.
- **Rien de sensible n'est enregistré.** La clé et les messages déchiffrés restent en mémoire jusqu'à la fermeture ou au rechargement de l'onglet. Seuls sont enregistrés la langue choisie et, sur le site, un cache de ses propres fichiers (service worker).
- **Les exports ne sont pas chiffrés.** Quiconque obtient le fichier peut le lire.

### CSP exacte

En-tête HTTP envoyé par le site avec chaque page :

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self' blob:; worker-src 'self'; manifest-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

Les pages portent la même politique dans une balise `<meta>`, pour qu'elle s'applique aussi hors ligne. La balise omet `frame-ancestors`, que les navigateurs n'acceptent qu'en en-tête HTTP. La page 404 n'a que l'en-tête HTTP.

**Limite hors ligne avec Safari :** dans nos tests, Chromium et Firefox appliquent cette politique aux pages ouvertes depuis le disque, mais WebKit (le moteur de Safari) y traite `'self'` comme n'importe quelle adresse et ne bloque pas les connexions externes. Lanterne n'en fait aucune, mais coupez le réseau plutôt que de compter sur la politique.

La politique bloque les scripts et les connexions vers d'autres domaines. `'self'` autorise toujours les requêtes vers lanterne-backup.com, et une CSP ne ferme pas tous les canaux possibles, comme la navigation vers une autre adresse. Elle limite les accidents et le code injecté. Elle ne protège pas du code du site lui-même s'il était modifié.

## Ce que Lanterne ne protège pas

- **Un navigateur, un système ou un appareil compromis** : logiciels malveillants, enregistreurs de frappe et captures d'écran peuvent lire la clé et les messages.
- **Les extensions malveillantes** : une extension autorisée sur la page peut tout y lire. Utilisez un profil sans extension.
- **Un site modifié à l'avenir** : quiconque contrôle le site, son domaine, son hébergement (Cloudflare) ou le dépôt (GitHub) pourrait servir un autre code à votre prochaine visite. C'est la raison d'être de la version hors ligne.
- **Une release malveillante** : les empreintes prouvent que les fichiers n'ont pas été altérés après publication, pas que le code publié est honnête. Elles sont hébergées sur le même compte GitHub que le zip, sans signature indépendante.
- **Les traces** : effacer le champ de la clé ne garantit pas son effacement en mémoire. Le presse-papiers, le fichier d'échange et vos exports échappent à Lanterne.
- **Quelqu'un qui possède déjà votre sauvegarde et votre clé de récupération.**

## Vérifier vous-même

1. **Vérifier la version hors ligne.** Téléchargez le zip et `SHA256SUMS` depuis la [release](https://github.com/LockingFR/lanterne/releases/latest) dans le même dossier.
   - Linux : `sha256sum --ignore-missing -c SHA256SUMS`
   - macOS : `shasum -a 256 lanterne-offline-v*.zip`, puis comparez à `SHA256SUMS`
   - Windows (PowerShell) : `Get-FileHash lanterne-offline-v*.zip`, puis comparez à `SHA256SUMS`
2. **L'utiliser sans réseau.** Extrayez tout le zip, coupez la connexion, ouvrez `index.html`.
3. **La reconstruire.** Placez-vous sur l'étiquette (par exemple `git checkout v1.0.0`) et lancez `python tools/build_offline.py` : le zip est reproductible et doit avoir le même SHA-256.
4. **Vérifier le site.** Lancez `python tools/verify-deployment.py` (Python 3.8+, sans dépendance). Il télécharge chaque fichier du site et compare son SHA-256 à la release. Cela montre ce que le site vous sert à cet instant, pas ce qu'il sert à quelqu'un d'autre ou plus tard.
5. **Observer le réseau.** Ouvrez l'onglet Réseau des outils de développement, puis déchiffrez : seules des entrées `blob:` et `data:` doivent apparaître.

## Signaler une faille

Ne publiez pas les détails d'une faille dans un ticket public.

Utilisez le [signalement privé de GitHub](https://github.com/LockingFR/lanterne/security/advisories/new) (un compte GitHub est nécessaire). Seul le mainteneur peut le lire.

N'envoyez jamais de vraie sauvegarde, de clé de récupération, de nom ni de message. Utilisez des données fictives comme celles de `tests/gen_backup.py`. Les corrections ne concernent que la dernière version.
