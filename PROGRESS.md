# Lanterne — état du projet

Mis à jour le **25 novembre 2026**. Lire ce fichier avant `CLAUDE.md`, puis respecter toutes ses règles.

Site : https://lanterne-backup.com · Code : https://github.com/LockingFR/lanterne · Licence MIT.
Dossier de travail : `G:\Sites\lanterne`.

## Fait

### Produit et historique vérifiés dans le dépôt

- `440d1c0` : première version du lecteur statique, déchiffrement WebCrypto, rendu des conversations,
  CSP, cache hors ligne et test de bout en bout avec une sauvegarde fictive.
- `e882f1e` : domaine `lanterne-backup.com`, liens GitHub et retrait de Ko-fi.
- `1d93ef8` : message pour une sauvegarde vide, page 404 et notes de validation officielle.
- `fd866cf` : nouvelle présentation, police servie localement et corrections de la FAQ anglaise.
- `b285d8d` : export HTML autonome d'une conversation, diagnostic technique sans contenu,
  améliorations pour les fichiers volumineux, accueil anglais et guides FR/EN générés.

Le code propose la lecture des sauvegardes **locales v2**, la lecture expérimentale de `main.jsonl`,
la recherche, un affichage progressif des messages, la lecture des médias et l'export HTML.
La présence de ces fonctions ne constitue pas une validation exhaustive de toutes les sauvegardes.
L'export HTML est déjà implémenté : l'ancienne piste « export HTML » dans `CLAUDE.md` ne signifie
donc pas qu'il reste à créer. Un export HTML contient des données déchiffrées et doit rester privé.

### Mise en ligne et diffusion

- [x] Site en ligne et dépôt GitHub public.
- [x] Achat du domaine et déploiement Cloudflare terminés (faits fournis par le propriétaire ;
  domaine et projet Pages également constatés pendant cette intervention).
- [x] Google Search Console configuré — fait confirmé par le propriétaire, sans nouvel audit du compte.
- [x] Annonce publiée côté Signal — fait confirmé par le propriétaire, sans publication supplémentaire ici.

### Rangement et vérifications du 24 novembre

- [x] Copie complète vers `G:\Sites\lanterne`, y compris `.git` et le cache local `.wrangler`.
  Avant les modifications : 157 fichiers identiques par SHA-256, 121 dossiers conservés,
  dépôt propre et historique de cinq commits présent.
- [x] Original conservé dans les Téléchargements. Aucune suppression autorisée ou effectuée.
- [x] `AGENTS.md` rappelle la lecture des consignes et de cet état des lieux.
- [x] `python tests/run_test.py` exécuté depuis le nouveau dossier : **5 OK**
  (déchiffrement, texte, image, refus d'une mauvaise clé, absence d'erreur console/CSP).
- [x] Redéploiement direct depuis le nouveau dossier via Wrangler sur `lanterne-backup`,
  branche `main`. Déploiement de contrôle de la version applicative `b285d8d` :
  https://25ea363a.lanterne-backup.pages.dev ; domaine de production : https://lanterne-backup.com.
- [x] Les mêmes cinq contrôles ont réussi dans Chromium sur le domaine public, en utilisant
  exclusivement la sauvegarde fictive des tests.
- [x] Les 26 fichiers publics servis correspondent aux empreintes locales ; la CSP HTTP correspond
  à `_headers`. Ce dernier est un fichier de configuration Cloudflare et n'est pas servi comme ressource.

### Retours utilisateur du 25 novembre (v1.0.0, commit `c835398`)

- [x] Langue : `assets/lang.js` envoie un navigateur non francophone vers la page anglaise, guides compris,
  sauf choix mémorisé (clic sur un sélecteur ou `?lang=`). Pas de redirection pour les robots ; hreflang
  réciproques avec x-default. L'ancienne clé `lanterne-lang` était écrite à chaque visite sans choix : ignorée.
- [x] Version hors ligne : chemins relatifs, pas de service worker sur file://, CSP aussi en balise meta.
- [x] `tools/build_offline.py` : zip reproductible (même SHA-256 depuis un clone neuf), SHA256SUMS, `dist/site`.
- [x] Release https://github.com/LockingFR/lanterne/releases/tag/v1.0.0 — zip SHA-256
  `f9e497000f69025d684cf99329cf0f67b71f1caf9270d5bae6e4ebe7fb2344d2`.
- [x] `tools/verify-deployment.py` : **27/27** fichiers et CSP identiques entre la production et la release.
- [x] `SECURITY.md` (EN/FR) et section « Vérifier / Verify » sur l'accueil.
- [x] `run_test.py` : 5 OK. `run_offline_test.py` : 50/50 (file:// dans Chromium, Firefox et WebKit ; langue ;
  aucune requête pendant le déchiffrement). Les 21 contrôles de langue, réseau et service worker passent aussi
  sur le domaine public.
- Déploiement : https://5dfe597b.lanterne-backup.pages.dev (aperçu de contrôle laissé sur la branche Pages `verif`).

Limites constatées : sur file://, WebKit n'applique pas la CSP au réseau (documenté) ; testé avec le WebKit de
Playwright sous Windows, pas avec Safari. Le domaine garde les assets 4 h dans le cache du navigateur
(`max-age=14400`) : un visiteur récent peut garder l'ancien `app.js` pendant ce délai.

- [ ] À décider : le signalement privé GitHub est désactivé sur le dépôt. SECURITY.md propose en attendant un
  ticket sans détail. Pour l'activer : Settings › Advanced Security › Private vulnerability reporting.
- [ ] Les empreintes ne sont pas signées indépendamment de GitHub.

Cloudflare indique **Git Provider: No** : un push GitHub ne déclenche pas de déploiement automatique.
Déployer uniquement `dist/site` (construit par `tools/build_offline.py`), jamais les données de test ou les caches.
Les rapports de copie et de déploiement restent dans `G:\Sites`, hors du dépôt. La vérification du
déploiement associé au commit de documentation est consignée dans `verification-deploiement.json`.

## Limites de validation et travail technique restant

Les cinq OK de cette intervention couvrent une **sauvegarde synthétique**. Ils ne prouvent pas le bon
fonctionnement sur une vraie sauvegarde utilisateur ni sur tous les appareils, navigateurs et volumes.
Aucune vraie sauvegarde ni clé personnelle n'a été demandée, lue ou ajoutée au dépôt.

`CLAUDE.md` rapporte des comparaisons antérieures avec des vecteurs connus, 97 champs du schéma protobuf
et des fichiers de test officiels. Ces résultats sont des notes historiques : ils n'ont pas été rejoués
ici et leur suite reproductible n'est pas présente dans ce dépôt.

- [ ] Écrire `tests/kat_test.mjs` avec les vecteurs connus, puis automatiser les comparaisons avec les
  fixtures officielles en respectant les licences ; ne pas copier de code AGPL de libsignal.
- [ ] Compléter la validation des médias officiels, des groupes avec messages et des gros volumes.
- [ ] Étendre les contrôles à l'export HTML, au JSONL, à la pagination/recherche et aux différents navigateurs.
- [ ] Recueillir, si des volontaires se présentent, uniquement un diagnostic technique sans clé,
  nom ni message, selon la règle 1 de `CLAUDE.md`. Ne jamais demander une vraie sauvegarde.

Les anciens fichiers Android `.backup` à clé de 30 chiffres et les sauvegardes distantes
**Secure Backups** avec confidentialité persistante ne sont pas pris en charge. Lanterne lit et
exporte ; il ne restaure pas une sauvegarde dans l'application Signal. Le format local v2 est la cible ;
aucune compatibilité exhaustive Android/iPhone/Desktop n'est revendiquée par les tests actuels.

## Diffusion restant à faire

- [ ] Poster le commentaire anglais ci-dessous dans
  https://github.com/bepaald/signalbackup-tools/issues/382 (fil sur le nouveau format v2).
- [ ] Publier le Show HN en anglais, avec l'URL https://lanterne-backup.com/en/ et le texte ci-dessous.
- [ ] Publier un journal LinuxFr en français avec le texte ci-dessous.
- [ ] Créer ou proposer la fiche AlternativeTo : nom Lanterne, site officiel, code MIT, plateforme Web,
  lecture locale v2, traitement dans le navigateur ; indiquer les formats non pris en charge.
- [ ] Ajouter `lanterne-backup.com` dans Bing Webmaster Tools, valider la propriété et soumettre
  https://lanterne-backup.com/sitemap.xml ; vérifier ensuite la prise en compte et les erreurs d'exploration.

Les textes suivants sont **prêts à copier**, sans aucune publication effectuée par cette intervention.
Après publication, cocher la ligne concernée et ajouter son URL et sa date ici.

## Commentaire GitHub — anglais

Thanks for documenting the work on the new backup format. I'm the author of Lanterne, a small MIT-licensed browser-based reader targeting the new **local v2** backups:

https://lanterne-backup.com/en/
Source: https://github.com/LockingFR/lanterne

It reads a local folder containing `main`, `metadata` and media files. Decryption and rendering happen in the browser using WebCrypto; there is no upload endpoint, external script, analytics or third-party font. It can also export a conversation as a standalone HTML file, which contains decrypted data and should be kept private.

This is a reader/exporter, not a restore tool. It does **not** support cloud Secure Backups with forward secrecy or the old Android `.backup` format with a 30-digit passphrase. Plaintext `main.jsonl` support is experimental.

The reproducible end-to-end test uses synthetic data. Project notes also record checks against known vectors and official test fixtures, but those checks are not yet automated in this repository; real-world media, groups and large backups still need more validation. I don't have a personal Signal backup to test with, so I don't want to overstate compatibility.

I'm sharing it here because this issue discusses the same new format. Bug reports and format corrections are welcome, but please never post a backup, recovery key or message contents. A technical diagnostic with only stages and counts is enough to start.

## Show HN — anglais

**Title:** Show HN: Lanterne – Read local Signal v2 backups in your browser

**URL:** https://lanterne-backup.com/en/

**First comment:**

I built Lanterne, a small MIT-licensed static web app for reading Signal's new local v2 backups outside the Signal app.

You choose the local backup folder and enter the recovery key in your browser. WebCrypto handles decryption locally. There is no application backend, upload endpoint, analytics or third-party script; fonts and other assets are served locally. After the first visit, the app can work offline. The source is available so you can inspect it and serve it locally:

https://github.com/LockingFR/lanterne

The app displays conversations and media, offers search, and exports a conversation as a standalone HTML file. That export is decrypted, so treat it as private. The interface and guides are available in English and French.

Current limits: it targets local v2 folders, not cloud Secure Backups or old Android `.backup` files. JSONL import is experimental. The automated browser test uses synthetic data; project notes record additional fixture checks, but broad real-world compatibility and large backups still need validation. I don't have a personal Signal backup, and I don't collect anyone else's backup or recovery key.

I'd welcome feedback on the format handling and the code. Please report only technical diagnostics without messages, names or keys.

## Journal LinuxFr — français

**Titre :** Lanterne : lire ses sauvegardes locales Signal dans son navigateur

Bonjour Nal,

J'ai développé Lanterne, un petit lecteur de sauvegardes locales Signal au nouveau format v2, sous licence MIT. L'idée est de pouvoir consulter ses conversations en dehors de l'application Signal, à partir du dossier de sauvegarde et de sa clé de récupération.

Le site est entièrement statique : HTML, CSS et JavaScript. Le déchiffrement se fait dans le navigateur avec WebCrypto, sans envoi de la sauvegarde ni de la clé à un serveur applicatif. Les scripts, les polices et les images sont servis depuis le même domaine, sans outil d'analyse ni publicité. Une CSP limite les connexions au site lui-même et aux ressources locales. Le code peut aussi être servi sur son propre ordinateur, et le lecteur fonctionne hors ligne après une première visite.

Lanterne affiche les conversations et les médias, permet la recherche et propose un export HTML autonome d'une conversation. Attention : cet export est déchiffré et doit être conservé comme un document privé. L'interface et les guides existent en français et en anglais.

Les limites sont importantes : l'outil cible les dossiers locaux v2 contenant `main`, `metadata` et les médias. Il ne lit ni les anciens fichiers Android `.backup` protégés par 30 chiffres, ni les sauvegardes distantes Secure Backups avec confidentialité persistante. La lecture de `main.jsonl` reste expérimentale. Il ne restaure rien dans l'application Signal.

Le test automatisé de bout en bout utilise une sauvegarde fictive. Les notes du projet rapportent aussi des vérifications avec des vecteurs connus et des fichiers de test officiels, mais ces contrôles restent à automatiser dans le dépôt. Les médias réels, les groupes et les gros volumes demandent encore des validations. Je n'ai pas de sauvegarde Signal personnelle : je préfère préciser cette limite plutôt que promettre une compatibilité générale.

Site : https://lanterne-backup.com

Code : https://github.com/LockingFR/lanterne

Les retours sur le code et les rapports de bogue sont les bienvenus. Merci de ne jamais joindre de sauvegarde réelle, de clé, de nom ou de message : uniquement les étapes, compteurs et erreurs du diagnostic technique. Lanterne n'est pas affilié à Signal Technology Foundation.
