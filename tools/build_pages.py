"""Régénère en/index.html, les guides, les pages de confidentialité et sitemap.xml. Usage : python tools/build_pages.py"""
import html, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://lanterne-backup.com"


def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()


def write(p, t):
    p = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(t)


# Même CSP que _headers, pour la version hors ligne (frame-ancestors n'est pas permis dans une balise meta).
CSP = re.search(r"Content-Security-Policy: (.*)", read("_headers"))[1].strip()
META = '<meta http-equiv="Content-Security-Policy" content="' + CSP.replace("; frame-ancestors 'none'", "") + '">\n'
META_RE = re.compile(r'<meta http-equiv="Content-Security-Policy" content="[^"]*">\n')


def relative(t, up):
    """Chemins /absolus → relatifs : le site doit aussi s'ouvrir depuis le disque (file://)."""
    return re.sub(r'((?:href|src)=")/(?!/)', lambda m: m[1] + up, t)


def sync_csp():
    for p in ("index.html", "lire-sauvegarde-signal/index.html", "en/read-signal-backup/index.html"):
        t, n = META_RE.subn(lambda m: META, read(p))
        assert n == 1, p
        write(p, t)


def build_en():
    t = read("index.html")
    t = t.replace('<html lang="fr" data-l="fr">', '<html lang="en" data-l="en">')
    t = t.replace(f'rel="canonical" href="{BASE}/"', f'rel="canonical" href="{BASE}/en/"')
    t = t.replace(f'og:url" content="{BASE}/"', f'og:url" content="{BASE}/en/"')
    t = re.sub(r"<title>.*?</title>", "<title>Lanterne, a reader for Signal local backups</title>", t)
    desc = "Read your Signal local backup (new format, Android, iPhone, Desktop) on a computer with your recovery key. Decrypted entirely in your browser, nothing is uploaded."
    t = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m[1] + desc, t)
    t = re.sub(r'(og:title" content=")[^"]*', r"\1Lanterne: read a Signal backup in your browser", t)
    t = re.sub(r'(og:description" content=")[^"]*', lambda m: m[1] + desc, t)
    faq = re.findall(r'<summary>.*?<span data-l="en">(.*?)</span></summary>.*?<p data-l="en">(.*?)</p>', t, re.S)
    clean = lambda s: html.unescape(re.sub(r"<[^>]+>", "", s))
    data = {"@context": "https://schema.org", "@graph": [
        {"@type": "SoftwareApplication", "name": "Lanterne", "applicationCategory": "UtilitiesApplication", "operatingSystem": "Web browser",
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"}, "description": desc, "inLanguage": ["fr", "en"]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": clean(q), "acceptedAnswer": {"@type": "Answer", "text": clean(a)}} for q, a in faq]}]}
    blob = json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")
    t = re.sub(r'(<script type="application/ld\+json">).*?(</script>)', lambda m: m[1] + "\n" + blob + "\n" + m[2], t, flags=re.S)
    t = re.sub(r'((?:href|src)=")(?!https?:|#|data:)', r'\1../', t)
    write("en/index.html", t)


CTA = {"fr": '<a class="cta" href="/">Ouvrir ma sauvegarde</a>', "en": '<a class="cta" href="/en/">Open my backup</a>'}
WARN = {"fr": '<p class="callout">Ne donnez jamais votre clé de récupération à quelqu\'un qui vous la demande par message ou par téléphone, même s\'il dit travailler pour Signal. Avec la sauvegarde, elle donne accès à tous vos messages.</p>',
        "en": '<p class="callout">Never give your recovery key to anyone who asks for it by message or phone, even if they claim to work for Signal. Together with the backup, it unlocks all your messages.</p>'}
NOTE = {"fr": '<p><small>Les libellés des menus peuvent varier selon la version. Référence : l\'<a href="https://support.signal.org/">assistance de Signal</a>.</small></p>',
        "en": '<p><small>Menu labels can vary between versions. Reference: <a href="https://support.signal.org/">Signal support</a>.</small></p>'}

# (chemin fr, chemin en, titre fr, titre en, description fr, description en, corps fr, corps en)
PAGES = [
 ("sauvegarde-signal-android", "en/signal-backup-android",
  "Sauvegarde Signal sur Android : la créer et la lire", "Signal backup on Android: create it and read it",
  "Créer une sauvegarde locale Signal sur Android, la copier sur ordinateur et relire vos messages avec la clé de récupération.",
  "Create a Signal local backup on Android, copy it to a computer and read your messages with the recovery key.",
  """<h2>Créer la sauvegarde</h2>
<ol><li>Dans Signal, ouvrez <strong>Réglages › Sauvegardes › Sauvegarde sur l'appareil</strong>.</li>
<li>Activez-la et choisissez le dossier de destination.</li>
<li>Notez la <strong>clé de récupération</strong> de 64 caractères et gardez-la hors du téléphone. Signal ne peut pas la retrouver pour vous.</li>
<li>Lancez une sauvegarde manuelle, ou programmez-la.</li></ol>
<h2>La copier sur l'ordinateur</h2>
<p>Branchez le téléphone en USB (mode transfert de fichiers) et copiez le dossier <strong>entier</strong>, avec <code>files</code>. Sans lui, les messages s'ouvrent mais pas les photos.</p>
<h2>La lire</h2>
<p>Dans Lanterne, choisissez ce dossier, collez la clé, puis cliquez sur « Déchiffrer et afficher ».</p>
<h2>Et l'ancien fichier .backup ?</h2>
<p>Les fichiers protégés par un code de 30 chiffres sont dans l'ancien format. Lanterne ne les lit pas ; <a href="https://github.com/bepaald/signalbackup-tools">signalbackup-tools</a> le fait.</p>""",
  """<h2>Create the backup</h2>
<ol><li>In Signal, open <strong>Settings › Backups › On-device backups</strong>.</li>
<li>Turn it on and choose the destination folder.</li>
<li>Save the 64-character <strong>recovery key</strong> somewhere other than the phone. Signal cannot recover it for you.</li>
<li>Create a backup manually, or set a schedule.</li></ol>
<h2>Copy it to your computer</h2>
<p>Connect the phone by USB (file transfer mode) and copy the <strong>whole</strong> folder, including <code>files</code>. Without it, messages open but photos don't.</p>
<h2>Read it</h2>
<p>In Lanterne, choose that folder, paste the key and click "Decrypt and view".</p>
<h2>What about the old .backup file?</h2>
<p>Files protected by a 30-digit passphrase use the old format. Lanterne doesn't read them; <a href="https://github.com/bepaald/signalbackup-tools">signalbackup-tools</a> does.</p>"""),
 ("sauvegarde-signal-iphone", "en/signal-backup-iphone",
  "Sauvegarde Signal sur iPhone : la créer et la lire", "Signal backup on iPhone: create it and read it",
  "Créer une sauvegarde locale Signal sur iPhone ou iPad, la transférer sur ordinateur et relire vos messages.",
  "Create a Signal local backup on iPhone or iPad, move it to a computer and read your messages.",
  """<p>Les sauvegardes sur l'appareil existent sur iPhone et iPad depuis Signal 8.30.</p>
<h2>Créer la sauvegarde</h2>
<ol><li>Ouvrez <strong>Réglages › Sauvegardes › Sauvegarde sur l'appareil</strong>.</li>
<li>Choisissez un dossier.</li>
<li>Enregistrez la <strong>clé de récupération</strong> dans un gestionnaire de mots de passe.</li></ol>
<h2>La transférer</h2>
<p>Retrouvez le dossier dans l'app Fichiers, puis copiez-le <strong>en entier</strong> vers l'ordinateur, par exemple sur une clé USB ou par AirDrop vers un Mac.</p>
<h2>La lire</h2>
<p>Ouvrez Lanterne sur l'ordinateur, choisissez le dossier qui contient <code>files</code>, collez la clé et déchiffrez.</p>""",
  """<p>On-device backups are available on iPhone and iPad since Signal 8.30.</p>
<h2>Create the backup</h2>
<ol><li>Open <strong>Settings › Backups › On-device backups</strong>.</li>
<li>Choose a folder.</li>
<li>Save the <strong>recovery key</strong> in a password manager.</li></ol>
<h2>Move it</h2>
<p>Find the folder in the Files app, then copy <strong>all of it</strong> to your computer, for example with a USB drive or AirDrop to a Mac.</p>
<h2>Read it</h2>
<p>Open Lanterne on the computer, choose the folder that contains <code>files</code>, paste the key and decrypt.</p>"""),
 ("sauvegarde-signal-desktop", "en/signal-backup-desktop",
  "Sauvegarde Signal Desktop : la créer et la lire", "Signal Desktop backup: create it and read it",
  "Sauvegarder Signal Desktop sur Windows, Mac ou Linux et relire les messages avec la clé de récupération.",
  "Back up Signal Desktop on Windows, Mac or Linux and read the messages with your recovery key.",
  """<h2>Créer la sauvegarde</h2>
<ol><li>Dans Signal Desktop, ouvrez <strong>Réglages › Sauvegardes</strong>, puis les <strong>autres moyens de sauvegarder</strong>.</li>
<li>Choisissez un dossier. Ne le renommez pas ensuite.</li>
<li>Enregistrez la <strong>clé de récupération</strong> de 64 caractères.</li></ol>
<h2>La lire</h2>
<p>Le dossier est déjà sur l'ordinateur : choisissez-le dans Lanterne, collez la clé, puis déchiffrez.</p>
<h2>La restaurer</h2>
<p>La restauration se fait dans l'application Signal. D'après l'assistance de Signal, restaurer une sauvegarde Desktop sur iPhone n'est pas pris en charge : vérifiez sa page pour l'état actuel.</p>""",
  """<h2>Create the backup</h2>
<ol><li>In Signal Desktop, open <strong>Settings › Backups</strong>, then <strong>Other ways to back up</strong>.</li>
<li>Choose a folder. Don't rename it afterwards.</li>
<li>Save the 64-character <strong>recovery key</strong>.</li></ol>
<h2>Read it</h2>
<p>The folder is already on your computer: choose it in Lanterne, paste the key and decrypt.</p>
<h2>Restore it</h2>
<p>Restoring happens in the Signal app. According to Signal support, restoring a Desktop backup on iPhone is not supported: check their page for the current status.</p>"""),
 ("restauration-signal-echouee", "en/signal-restore-failed",
  "Restauration Signal échouée : que vérifier", "Signal restore failed: what to check",
  "La restauration Signal échoue ? Dossier incomplet, mauvaise clé, étape passée : les vérifications, et comment relire vos messages quand même.",
  "Signal restore failing? Incomplete folder, wrong key, skipped step: what to check, and how to read your messages anyway.",
  """<h2>Les vérifications</h2>
<ul><li><strong>Le bon dossier.</strong> Sélectionnez le dossier de sauvegarde entier, pas un fichier à l'intérieur.</li>
<li><strong>Le bon appareil.</strong> Le dossier doit être présent sur le téléphone où vous restaurez. S'il n'apparaît pas, redémarrez-le.</li>
<li><strong>Le bon moment.</strong> La restauration se propose pendant l'inscription. Si vous avez passé l'étape, il faut en général recommencer l'inscription. <strong>Attention :</strong> réinstaller efface les messages présents ; ne le faites pas si le téléphone contient des messages non sauvegardés.</li>
<li><strong>La bonne clé.</strong> Une nouvelle clé n'ouvre pas les anciennes sauvegardes. Signal ne peut pas récupérer une clé perdue.</li></ul>
<h2>Relire vos messages quand même</h2>
<p>Gardez une copie intacte du dossier, puis ouvrez-la dans Lanterne. Si elle s'ouvre, la clé est bonne et le fichier des messages est intact. Vous pourrez lire et exporter vos conversations, mais pas les remettre dans Signal.</p>""",
  """<h2>What to check</h2>
<ul><li><strong>The right folder.</strong> Select the whole backup folder, not a file inside it.</li>
<li><strong>The right device.</strong> The folder must be on the phone you're restoring to. If it doesn't show up, restart the phone.</li>
<li><strong>The right moment.</strong> Restore is offered during registration. If you skipped it, you generally need to register again. <strong>Careful:</strong> reinstalling erases the messages on the phone; don't do it if it holds messages you haven't backed up.</li>
<li><strong>The right key.</strong> A new key doesn't open older backups. Signal cannot recover a lost key.</li></ul>
<h2>Read your messages anyway</h2>
<p>Keep an untouched copy of the folder, then open it in Lanterne. If it opens, the key is right and the message file is intact. You can read and export your chats, but not put them back into Signal.</p>"""),
 ("confidentialite", "en/privacy", "Confidentialité", "Privacy",
  "Ce que Lanterne fait, et ne fait pas, de vos données.", "What Lanterne does, and doesn't do, with your data.",
  """<h2>Vos sauvegardes et votre clé</h2><p>Elles restent dans votre navigateur. Lanterne ne les envoie pas et ne les enregistre pas. Fermer ou recharger l'onglet les retire de la page.</p>
<h2>Ce qui est enregistré sur votre appareil</h2><p>Votre langue, si vous la choisissez, et une copie des fichiers du site pour qu'il fonctionne hors ligne. Les exports que vous créez ne sont pas chiffrés : rangez-les en lieu sûr.</p>
<h2>Hébergement</h2><p>Le site est hébergé par Cloudflare, qui traite les données techniques nécessaires (dont l'adresse IP) pour livrer les pages et les protéger. Lanterne n'ajoute ni publicité, ni outil d'analyse, ni cookie de suivi.</p>
<h2>Le bouton de diagnostic</h2><p>Il copie des tailles, des compteurs, l'étape atteinte et la version de votre navigateur. Rien n'est envoyé : vous choisissez de le partager ou non.</p>""",
  """<h2>Your backups and key</h2><p>They stay in your browser. Lanterne does not send or store them. Closing or reloading the tab removes them from the page.</p>
<h2>What is stored on your device</h2><p>Your language, if you pick one, and a copy of the site's files so it works offline. Exports you create are not encrypted: keep them somewhere safe.</p>
<h2>Hosting</h2><p>The site is hosted by Cloudflare, which processes the technical data needed (including IP addresses) to deliver and protect pages. Lanterne adds no ads, analytics or tracking cookies.</p>
<h2>The diagnostic button</h2><p>It copies sizes, counters, the step reached and your browser version. Nothing is sent: you choose whether to share it.</p>"""),
]


def build_pages():
    for fr, en, tfr, ten, dfr, den, bfr, ben in PAGES:
        privacy = fr == "confidentialite"
        for l, me, title, desc, body in (("fr", fr, tfr, dfr, bfr), ("en", en, ten, den, ben)):
            other = [(p[0], p[2]) if l == "fr" else (p[1], p[3]) for p in PAGES if p[0] not in (fr, "confidentialite")]
            rel = " · ".join(f'<a href="/{u}/">{html.escape(x)}</a>' for u, x in other)
            aff = ("Lanterne n'est pas affilié à Signal Technology Foundation.", "English version") if l == "fr" else ("Lanterne is not affiliated with Signal Technology Foundation.", "Version française")
            home = "/" if l == "fr" else "/en/"
            up = "../" * (me.count("/") + 1)
            write(me + "/index.html", relative(f"""<!doctype html>
<html lang="{l}" data-l="{l}">
<head>
<meta charset="utf-8">
{META}<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{html.escape(title)} · Lanterne</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{BASE}/{me}/">
<link rel="alternate" hreflang="fr" href="{BASE}/{fr}/">
<link rel="alternate" hreflang="en" href="{BASE}/{en}/">
<link rel="alternate" hreflang="x-default" href="{BASE}/{en}/">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:image" content="{BASE}/assets/og.png">
<script src="/assets/lang.js"></script>
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/style.css">
<meta name="theme-color" content="#0d6b5c">
</head>
<body>
<div class="wrap">
<header class="top"><div class="brand"><a href="{home}"><img src="/assets/icon.svg" alt="" width="26" height="26">Lanterne</a></div></header>
<main class="article">
<h1>{html.escape(title)}</h1>
<p class="lead">{html.escape(desc)}</p>
{body}
{"" if privacy else WARN[l] + chr(10) + NOTE[l]}
{CTA[l]}
<p class="related">{rel}</p>
<p><small>{aff[0]} <a hreflang="{'en' if l == 'fr' else 'fr'}" href="/{en if l == 'fr' else fr}/">{aff[1]}</a></small></p>
</main>
</div>
</body>
</html>
""", up))


def build_sitemap():
    urls = ["", "en/", "lire-sauvegarde-signal/", "en/read-signal-backup/"] + [u + "/" for p in PAGES for u in p[:2]]
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(f"  <url><loc>{BASE}/{u}</loc></url>\n" for u in urls) + "</urlset>\n")


sync_csp()
build_en()
build_pages()
build_sitemap()
