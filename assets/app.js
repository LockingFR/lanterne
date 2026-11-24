(() => {
"use strict";
const $ = s => document.querySelector(s);
const td = new TextDecoder();
const enc = new TextEncoder();

/* ---------- langue ---------- */
let LANG = window.LANTERNE.initial; // voir lang.js
const PAGE_LANG = document.documentElement.lang;
const SW_URL = new URL("../sw.js", document.currentScript.src).href;
const TX = {
  fr: { you:"Vous", unknown:"Contact inconnu", group:"Groupe", notes:"Note à soi", search:"Rechercher…", msgs:"messages", chats:"conversations",
    sample:"Exemple", sampleSum:"Données d'exemple : ouvrez votre sauvegarde pour voir les vôtres.", backupOf:"Sauvegarde du", none:"Aucun message.",
    pick:"Choisissez une conversation.", deleted:"Ce message a été supprimé.", viewonce:"Média à vue unique", payment:"Paiement", gift:"Badge cadeau",
    poll:"Sondage", contact:"Contact partagé", story:"Réponse à une story", sticker:"Autocollant", call:"Appel", gcall:"Appel de groupe",
    gchange:"Le groupe a été modifié", timer:"Le minuteur des messages éphémères a changé", profile:"a changé de nom", session:"Changement de session ou de numéro",
    event:"Événement", attach:"Pièce jointe", more:"Afficher les messages précédents", copied:"Conversation copiée.", copyFail:"Copie refusée : le texte est sélectionné, faites Ctrl+C.",
    needFiles:"Choisissez un dossier ou les fichiers main et metadata.", needKey:"La clé doit faire 64 caractères.", badKey:"Clé incorrecte pour cette sauvegarde (signature HMAC invalide).",
    fs:"Cette sauvegarde utilise la confidentialité persistante (sauvegarde distante) et ne peut pas être ouverte hors ligne.", noSnap:"Aucun sous-dossier contenant main et metadata n'a été trouvé.",
    done:"Sauvegarde déchiffrée.", working:"Déchiffrement en cours…", found:"Sauvegarde trouvée :", media:"fichiers médias indexés", derive:"Clés dérivées (HKDF-SHA256)",
    bid:"Identifiant de sauvegarde déchiffré (AES-256-CTR)", mac:"Intégrité vérifiée (HMAC-SHA256)", gz:"Décompressé :", frames:"trames lues", jsonl:"Export en clair main.jsonl détecté (lecture expérimentale)",
    oldfmt:"Ce fichier .backup est l'ancien format Android (30 chiffres) : utilisez signalbackup-tools.", mediaMissing:"média absent du dossier files", mediaFail:"média illisible",
    longtext:"(texte long dans un fichier joint)", diagOk:"Diagnostic copié : aucune clé, aucun nom et aucun message dedans.", exporting:"Export en cours…", exportOk:"Conversation exportée. Ce fichier n'est pas chiffré : rangez-le en lieu sûr.", exportBig:"Cette conversation est volumineuse : l'export peut échouer si la mémoire manque.", exportFail:"L'export a échoué (mémoire insuffisante ?).", emptyBackup:"Sauvegarde déchiffrée, mais elle ne contient aucun message.", noCrypto:"Votre navigateur ne prend pas en charge WebCrypto ou DecompressionStream. Utilisez une version récente de Chrome, Firefox, Edge ou Safari." },
  en: { you:"You", unknown:"Unknown contact", group:"Group", notes:"Note to self", search:"Search…", msgs:"messages", chats:"chats",
    sample:"Example", sampleSum:"Example data: open your backup to see your own.", backupOf:"Backup from", none:"No messages.",
    pick:"Pick a chat.", deleted:"This message was deleted.", viewonce:"View-once media", payment:"Payment", gift:"Gift badge",
    poll:"Poll", contact:"Shared contact", story:"Story reply", sticker:"Sticker", call:"Call", gcall:"Group call",
    gchange:"The group was changed", timer:"Disappearing message timer changed", profile:"changed their name", session:"Session or number change",
    event:"Event", attach:"Attachment", more:"Show earlier messages", copied:"Chat copied.", copyFail:"Copy refused: the text is selected, press Ctrl+C.",
    needFiles:"Choose a folder or the main and metadata files.", needKey:"The key must be 64 characters.", badKey:"Wrong key for this backup (invalid HMAC signature).",
    fs:"This backup uses forward secrecy (remote backup) and can't be opened offline.", noSnap:"No subfolder containing main and metadata was found.",
    done:"Backup decrypted.", working:"Decrypting…", found:"Backup found:", media:"media files indexed", derive:"Keys derived (HKDF-SHA256)",
    bid:"Backup ID decrypted (AES-256-CTR)", mac:"Integrity verified (HMAC-SHA256)", gz:"Decompressed:", frames:"frames read", jsonl:"Plaintext main.jsonl export detected (experimental)",
    oldfmt:"This .backup file is the old Android format (30 digits): use signalbackup-tools.", mediaMissing:"media missing from files folder", mediaFail:"unreadable media",
    longtext:"(long text in an attached file)", diagOk:"Diagnostic copied: no key, names or messages in it.", exporting:"Exporting…", exportOk:"Chat exported. This file is not encrypted: keep it somewhere safe.", exportBig:"This chat is large: the export may fail if memory runs out.", exportFail:"Export failed (out of memory?).", emptyBackup:"Backup decrypted, but it contains no messages.", noCrypto:"Your browser lacks WebCrypto or DecompressionStream. Use a recent Chrome, Firefox, Edge or Safari." }
};
const T = k => (TX[LANG] && TX[LANG][k]) || TX.fr[k] || k;
function setLang(l) {
  LANG = l; document.documentElement.setAttribute("data-l", l); document.documentElement.lang = l;
  $("#lang-fr").setAttribute("aria-pressed", l === "fr"); $("#lang-en").setAttribute("aria-pressed", l === "en");
  $("#q").placeholder = T("search");
  if (MODEL) renderAll();
}
function pickLang(l) {
  const saved = window.LANTERNE.choose(l);
  // Rien d'ouvert ni de saisi : on va sur la page de cette langue. Sinon on traduit sur place pour ne rien perdre.
  const idle = MODEL && MODEL.sample && !FILES.length && !$("#aep").value;
  if (idle && l !== LANG && l !== PAGE_LANG && window.LANTERNE.go(l, !saved)) return;
  setLang(l);
}
$("#lang-fr").onclick = () => pickLang("fr");
$("#lang-en").onclick = () => pickLang("en");

/* ---------- utilitaires ---------- */
const hex = u => Array.from(u, b => b.toString(16).padStart(2, "0")).join("");
function b64ToBytes(s) { try { const bin = atob(String(s).replace(/-/g, "+").replace(/_/g, "/")); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; } catch (e) { return new Uint8Array(0); } }
const asBytes = v => v instanceof Uint8Array ? v : (typeof v === "string" ? b64ToBytes(v) : new Uint8Array(0));
const num = v => v == null ? 0 : Number(v);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
function concat(...arrs) { const n = arrs.reduce((a, b) => a + b.length, 0); const o = new Uint8Array(n); let p = 0; for (const a of arrs) { o.set(a, p); p += a.length; } return o; }

/* ---------- crypto (réimplémentation du format v2) ---------- */
const INFO_BACKUP_KEY = enc.encode("20240801_SIGNAL_BACKUP_KEY");
const INFO_LOCAL_META = enc.encode("20241011_SIGNAL_LOCAL_BACKUP_METADATA_KEY");
const INFO_MSG_PREFIX = enc.encode("20241007_SIGNAL_BACKUP_ENCRYPT_MESSAGE_BACKUP:");
const normAEP = s => s.replace(/\s+/g, "").replace(/#/g, "O").replace(/=/g, "0").toLowerCase();

async function hkdf(ikm, len, info) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  // sel absent = 32 octets nuls (RFC 5869), identique à Hkdf::new(None, ikm)
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info }, k, len * 8));
}
async function hmacOk(keyBytes, data, tag) {
  const k = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", k, tag, data);
}
// AES-256-CBC sans contrôle du bourrage : on ajoute un bloc qui se déchiffre en bourrage PKCS7 valide.
async function cbcRaw(keyBytes, iv, ct) {
  if (ct.length % 16) throw new Error("ciphertext length");
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-CBC", false, ["encrypt", "decrypt"]);
  const last = ct.length ? ct.subarray(ct.length - 16) : iv;
  const extra = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv: last }, key, new Uint8Array(16).fill(16))).subarray(0, 16);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, concat(ct, extra)));
}
function stripPkcs7(u) { const n = u[u.length - 1]; if (n >= 1 && n <= 16 && n <= u.length) { for (let i = 1; i <= n; i++) if (u[u.length - i] !== n) return u; return u.subarray(0, u.length - n); } return u; }
async function gunzip(u8) {
  const ds = new DecompressionStream("gzip");
  const w = ds.writable.getWriter(); w.write(u8).catch(() => {}); w.close().catch(() => {});
  const r = ds.readable.getReader(); const chunks = []; let n = 0;
  try { for (;;) { const { done, value } = await r.read(); if (done) break; chunks.push(value); n += value.length; } }
  catch (e) { if (!n) throw e; } // octets parasites après la fin du flux gzip : on garde ce qui est décompressé
  const o = new Uint8Array(n); let p = 0; for (const c of chunks) { o.set(c, p); p += c.length; } return o;
}

/* ---------- protobuf minimal ---------- */
function rv(b, p) { let r = 0, m = 1, x; do { if (p >= b.length) throw new Error("varint"); x = b[p++]; r += (x & 0x7f) * m; m *= 128; } while (x & 0x80); return [r, p]; }
function* fields(b) {
  let p = 0;
  while (p < b.length) {
    let t; [t, p] = rv(b, p); const f = Math.floor(t / 8), w = t % 8; let v;
    if (w === 0) [v, p] = rv(b, p);
    else if (w === 2) { let l; [l, p] = rv(b, p); v = b.subarray(p, p + l); p += l; }
    else if (w === 5) { v = b.subarray(p, p + 4); p += 4; }
    else if (w === 1) { v = b.subarray(p, p + 8); p += 8; }
    else throw new Error("wire " + w);
    yield [f, w, v];
  }
}
// Schéma partiel de Backup.proto (numéros de champs). v=varint s=texte b=octets, sinon sous-message ; 3e élément = répété.
const S = {
  BackupInfo: { 1:["version","v"], 2:["backupTimeMs","v"] },
  Frame: { 2:["recipient","Recipient"], 3:["chat","Chat"], 4:["chatItem","ChatItem"] },
  Recipient: { 1:["id","v"], 2:["contact","Contact"], 3:["group","Group"], 4:["distributionList","E"], 5:["self","E"], 6:["releaseNotes","E"], 7:["callLink","E"] },
  Contact: { 1:["aci","b"], 3:["username","s"], 4:["e164","v"], 11:["profileGivenName","s"], 12:["profileFamilyName","s"], 16:["nickname","Name"], 18:["systemGivenName","s"], 19:["systemFamilyName","s"], 20:["systemNickname","s"] },
  Name: { 1:["given","s"], 2:["family","s"] },
  Group: { 5:["snapshot","GroupSnapshot"] }, GroupSnapshot: { 2:["title","Blob"] }, Blob: { 1:["title","s"] },
  Chat: { 1:["id","v"], 2:["recipientId","v"] },
  ChatItem: { 1:["chatId","v"], 2:["authorId","v"], 3:["dateSent","v"], 8:["incoming","E"], 9:["outgoing","E"], 10:["directionless","E"],
    11:["standardMessage","SM"], 12:["contactMessage","E"], 13:["stickerMessage","StM"], 14:["remoteDeletedMessage","E"], 15:["updateMessage","Upd"],
    16:["paymentNotification","E"], 17:["giftBadge","E"], 18:["viewOnceMessage","E"], 19:["directStoryReplyMessage","E"], 20:["poll","E"], 22:["adminDeletedMessage","E"] },
  SM: { 1:["quote","Quote"], 2:["text","Text"], 3:["attachments","MA",1], 4:["linkPreview","LP",1], 5:["longText","FP"], 6:["reactions","Rx",1] },
  Text: { 1:["body","s"], 2:["bodyRanges","BR",1] }, BR: { 1:["start","v"], 2:["length","v"], 3:["mentionAci","b"], 4:["style","v"] },
  Quote: { 1:["targetSentTimestamp","v"], 2:["authorId","v"], 3:["text","Text"], 4:["attachments","QA",1] }, QA: { 1:["contentType","s"], 2:["fileName","s"] },
  Rx: { 1:["emoji","s"], 2:["authorId","v"] },
  MA: { 1:["pointer","FP"], 2:["flag","v"] },
  FP: { 4:["contentType","s"], 7:["fileName","s"], 8:["width","v"], 9:["height","v"], 10:["caption","s"], 13:["locatorInfo","LI"] },
  LI: { 3:["size","v"], 9:["localKey","b"], 10:["plaintextHash","b"] },
  LP: { 1:["url","s"], 2:["title","s"], 3:["image","FP"], 4:["description","s"] },
  StM: { 1:["sticker","Sticker"], 2:["reactions","Rx",1] }, Sticker: { 4:["emoji","s"], 5:["data","FP"] },
  Upd: { 1:["simpleUpdate","E"], 2:["groupChange","E"], 3:["expirationTimerChange","E"], 4:["profileChange","PC"], 5:["threadMerge","E"], 6:["sessionSwitchover","E"], 7:["individualCall","E"], 8:["groupCall","E"], 9:["learnedProfileChange","E"], 10:["pollTerminate","E"], 11:["pinMessage","E"] },
  PC: { 1:["previousName","s"], 2:["newName","s"] },
  E: {}
};
function dec(b, name) {
  const sch = S[name], o = {};
  for (const [f, w, v] of fields(b)) {
    const d = sch[f]; if (!d) continue;
    const [k, t, rep] = d; let val;
    if (t === "v") { if (w !== 0) continue; val = v; }
    else if (w !== 2) continue;
    else if (t === "s") val = td.decode(v);
    else if (t === "b") val = v.slice();
    else val = dec(v, t);
    if (rep) (o[k] || (o[k] = [])).push(val); else o[k] = val;
  }
  return o;
}

/* ---------- modèle ---------- */
let MODEL = null, CUR = null, SHOWN = 300, MEDIA = null;
function newModel() { return { info: {}, rec: new Map(), chats: new Map(), items: new Map(), aci: new Map(), sample: false, nItems: 0 }; }
function addFrame(M, fr) {
  if (fr.recipient) {
    const r = fr.recipient; M.rec.set(String(r.id), r);
    if (r.contact && r.contact.aci) M.aci.set(hex(asBytes(r.contact.aci)), String(r.id));
  } else if (fr.chat) M.chats.set(String(fr.chat.id), fr.chat);
  else if (fr.chatItem) { const it = fr.chatItem, k = String(it.chatId); let a = M.items.get(k); if (!a) M.items.set(k, a = []); a.push(it); M.nItems++; }
}
function recName(r) {
  if (!r) return T("unknown");
  if (r.self) return T("you");
  if (r.releaseNotes) return "Signal";
  const c = r.contact;
  if (c) {
    const nick = c.nickname && [c.nickname.given, c.nickname.family].filter(Boolean).join(" ");
    return nick || [c.systemGivenName, c.systemFamilyName].filter(Boolean).join(" ") || c.systemNickname ||
      [c.profileGivenName, c.profileFamilyName].filter(Boolean).join(" ") || (c.e164 ? "+" + c.e164 : "") || c.username || T("unknown");
  }
  if (r.group) return (r.group.snapshot && r.group.snapshot.title && r.group.snapshot.title.title) || T("group");
  return T("unknown");
}
function chatName(ch) { const r = MODEL.rec.get(String(ch.recipientId)); return r && r.self ? T("notes") : recName(r); }
const COLORS = ["#2f6f9f", "#8a4fb0", "#b34a5c", "#2f8a5b", "#b07a1f", "#4a5fc1", "#8f5a3c", "#1f7f8a"];
function colorFor(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; }
function bodyText(t) {
  if (!t || !t.body) return "";
  let s = t.body;
  const ranges = (t.bodyRanges || []).filter(r => r.mentionAci).sort((a, b) => num(b.start) - num(a.start));
  for (const r of ranges) { const id = MODEL.aci.get(hex(asBytes(r.mentionAci))); const nm = "@" + recName(MODEL.rec.get(id)); s = s.slice(0, num(r.start)) + nm + s.slice(num(r.start) + num(r.length || 1)); }
  return s;
}
function itemSummary(it) {
  const sm = it.standardMessage;
  if (sm) { const tx = bodyText(sm.text); if (tx) return tx; if (sm.attachments && sm.attachments.length) return "📎 " + T("attach"); if (sm.longText) return T("longtext"); return ""; }
  if (it.stickerMessage) return (it.stickerMessage.sticker && it.stickerMessage.sticker.emoji || "") + " " + T("sticker");
  if (it.remoteDeletedMessage || it.adminDeletedMessage) return T("deleted");
  if (it.viewOnceMessage) return T("viewonce");
  if (it.contactMessage) return T("contact");
  if (it.paymentNotification) return T("payment");
  if (it.giftBadge) return T("gift");
  if (it.poll) return T("poll");
  if (it.directStoryReplyMessage) return T("story");
  if (it.updateMessage) return updText(it);
  return "";
}
function updText(it) {
  const u = it.updateMessage || {};
  if (u.individualCall) return "📞 " + T("call");
  if (u.groupCall) return "📞 " + T("gcall");
  if (u.groupChange) return T("gchange");
  if (u.expirationTimerChange) return T("timer");
  if (u.profileChange) return `${u.profileChange.previousName || "?"} ${T("profile")} → ${u.profileChange.newName || "?"}`;
  if (u.sessionSwitchover || u.threadMerge) return T("session");
  return T("event");
}

/* ---------- médias ---------- */
const mediaCache = new Map();
async function mediaUrl(fp) {
  if (!MEDIA || !fp || !fp.locatorInfo) return null;
  const li = fp.locatorInfo, lk = asBytes(li.localKey), ph = asBytes(li.plaintextHash);
  if (lk.length !== 64 || !ph.length) return null;
  const name = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", concat(ph, lk))));
  if (mediaCache.has(name)) return mediaCache.get(name);
  const f = MEDIA.get(name) || MEDIA.get(hex(ph));
  if (!f) { mediaCache.set(name, "missing"); return "missing"; }
  try {
    const buf = new Uint8Array(await f.arrayBuffer());
    let plain;
    if (MEDIA.plain) plain = buf; // export en clair : fichier non chiffré
    else {
      const iv = buf.subarray(0, 16), ct = buf.subarray(16, buf.length - 32), tag = buf.subarray(buf.length - 32);
      if (!(await hmacOk(lk.subarray(32), buf.subarray(0, buf.length - 32), tag))) throw new Error("mac");
      plain = await cbcRaw(lk.subarray(0, 32), iv, ct);
      const size = num(li.size); if (size && size <= plain.length) plain = plain.subarray(0, size); else plain = stripPkcs7(plain);
    }
    const url = URL.createObjectURL(new Blob([plain], { type: fp.contentType || "application/octet-stream" }));
    mediaCache.set(name, url); return url;
  } catch (e) { mediaCache.set(name, "fail"); return "fail"; }
}

/* ---------- rendu ---------- */
const fmtDay = ms => new Date(ms).toLocaleDateString(LANG === "fr" ? "fr-FR" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtTime = ms => new Date(ms).toLocaleTimeString(LANG === "fr" ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit" });
function chatOrder() {
  const arr = [];
  for (const [id, ch] of MODEL.chats) { const it = MODEL.items.get(id) || []; if (!it.length) continue; arr.push({ id, ch, n: it.length, last: num(it[it.length - 1].dateSent) }); }
  return arr.sort((a, b) => b.last - a.last);
}
function renderAll() {
  const order = chatOrder(); const q = $("#q").value.trim().toLowerCase();
  if (!CUR && order.length) CUR = order[0].id;
  const sum = $("#sum");
  sum.innerHTML = (MODEL.sample ? `<span class="sample">${T("sample")}</span> ${esc(T("sampleSum"))}<br>` : "") +
    `${order.length} ${T("chats")} · ${MODEL.nItems.toLocaleString(LANG)} ${T("msgs")}` +
    (MODEL.info.backupTimeMs ? ` · ${T("backupOf")} ${new Date(num(MODEL.info.backupTimeMs)).toLocaleDateString(LANG === "fr" ? "fr-FR" : "en-GB")}` : "");
  const list = $("#chatlist"); list.innerHTML = "";
  if (!order.length) { list.innerHTML = `<div class="empty">${esc(T("emptyBackup"))}</div>`; $("#convTitle").textContent = "—"; $("#msgs").innerHTML = `<div class="empty">${esc(T("emptyBackup"))}</div>`; return; }
  for (const o of order) {
    const nm = chatName(o.ch);
    let hits = 0;
    if (q) { if (!nm.toLowerCase().includes(q)) { for (const it of MODEL.items.get(o.id)) if (itemSummary(it).toLowerCase().includes(q)) hits++; if (!hits) continue; } }
    const items = MODEL.items.get(o.id); const lastTxt = itemSummary(items[items.length - 1]);
    const b = document.createElement("button"); b.type = "button"; b.className = "chatbtn"; b.setAttribute("aria-current", o.id === CUR ? "true" : "false");
    b.innerHTML = `<span class="av" style="background:${colorFor(nm)}">${esc((nm.trim()[0] || "?").toUpperCase())}</span><div><div class="nm">${esc(nm)}</div><div class="pv">${esc(lastTxt)}</div></div><span class="ct">${hits ? hits + "✓" : o.n}</span>`;
    b.onclick = () => { CUR = o.id; SHOWN = 300; renderAll(); };
    list.appendChild(b);
  }
  renderConv();
}
function renderConv() {
  const box = $("#msgs"); box.innerHTML = "";
  if (!CUR || !MODEL.chats.get(CUR)) { $("#convTitle").textContent = "—"; box.innerHTML = `<div class="empty">${T("pick")}</div>`; return; }
  const ch = MODEL.chats.get(CUR); $("#convTitle").textContent = chatName(ch);
  const isGroup = !!(MODEL.rec.get(String(ch.recipientId)) || {}).group;
  const items = MODEL.items.get(CUR) || []; const q = $("#q").value.trim().toLowerCase();
  if (!items.length) { box.innerHTML = `<div class="empty">${T("none")}</div>`; return; }
  const start = Math.max(0, items.length - SHOWN);
  if (start > 0) { const mb = document.createElement("button"); mb.type = "button"; mb.className = "btn small more"; mb.textContent = T("more") + ` (${start})`; mb.onclick = () => { SHOWN += 500; renderConv(); }; box.appendChild(mb); }
  let lastDay = "";
  const frag = document.createDocumentFragment(); const pend = [];
  for (let i = start; i < items.length; i++) {
    const it = items[i], ms = num(it.dateSent), day = fmtDay(ms);
    if (day !== lastDay) { const d = document.createElement("div"); d.className = "day"; d.textContent = day; frag.appendChild(d); lastDay = day; }
    if (it.updateMessage) { const d = document.createElement("div"); d.className = "sys"; d.textContent = updText(it) + " · " + fmtTime(ms); frag.appendChild(d); continue; }
    const out = !!it.outgoing; const m = document.createElement("div"); m.className = "m" + (out ? " out" : "");
    let html = "";
    if (!out && isGroup) { const an = recName(MODEL.rec.get(String(it.authorId))); html += `<div class="au" style="color:${colorFor(an)}">${esc(an)}</div>`; }
    const sm = it.standardMessage;
    if (sm) {
      if (sm.quote) { const qa = MODEL.rec.get(String(sm.quote.authorId)); html += `<div class="qt"><strong>${esc(recName(qa))}</strong><br>${esc(bodyText(sm.quote.text) || ((sm.quote.attachments || []).length ? T("attach") : "…"))}</div>`; }
      (sm.attachments || []).forEach((a, j) => { html += `<div class="att" data-att="${j}">📎 ${esc((a.pointer && (a.pointer.fileName || a.pointer.contentType)) || T("attach"))}</div>`; });
      let tx = bodyText(sm.text);
      if (q && tx.toLowerCase().includes(q)) { const k = tx.toLowerCase().indexOf(q); html += `<div class="hit">${esc(tx.slice(0, k))}<mark>${esc(tx.slice(k, k + q.length))}</mark>${esc(tx.slice(k + q.length))}</div>`; }
      else if (tx) html += `<div class="tx">${esc(tx)}</div>`;
      (sm.linkPreview || []).forEach(lp => { if (lp.url) html += `<div class="att">🔗 ${esc(lp.title || lp.url)}</div>`; });
      if (sm.reactions && sm.reactions.length) html += `<div class="rx">${sm.reactions.map(r => esc(r.emoji || "")).join(" ")}</div>`;
      if (sm.attachments && sm.attachments.length) pend.push([m, sm.attachments.map(a => a.pointer)]);
      if (sm.longText) pend.push([m, [sm.longText], true]);
    } else if (it.stickerMessage) {
      html += `<div class="att" data-att="0">${esc((it.stickerMessage.sticker && it.stickerMessage.sticker.emoji) || "")} ${T("sticker")}</div>`;
      if (it.stickerMessage.sticker && it.stickerMessage.sticker.data) pend.push([m, [it.stickerMessage.sticker.data]]);
    } else html += `<div class="ph">${esc(itemSummary(it) || T("event"))}</div>`;
    html += `<div class="tm">${fmtTime(ms)}</div>`;
    m.innerHTML = html; frag.appendChild(m);
  }
  box.appendChild(frag); box.scrollTop = box.scrollHeight;
  if (MEDIA) for (const [m, fps, isLong] of pend) fps.forEach(async (fp, j) => {
    const url = await mediaUrl(fp); const slot = isLong ? null : m.querySelector(`[data-att="${j}"]`);
    if (!url) return;
    if (url === "missing" || url === "fail") { if (slot) slot.textContent += " · " + T(url === "missing" ? "mediaMissing" : "mediaFail"); return; }
    if (isLong) { try { const t = await (await fetch(url)).text(); const tx = m.querySelector(".tx"); if (tx) tx.textContent = t; } catch (e) {} return; }
    const ct = (fp.contentType || "").toLowerCase(); let el;
    if (ct.startsWith("image/")) { el = document.createElement("img"); el.alt = fp.caption || fp.fileName || ""; el.loading = "lazy"; }
    else if (ct.startsWith("video/")) { el = document.createElement("video"); el.controls = true; el.preload = "metadata"; }
    else if (ct.startsWith("audio/")) { el = document.createElement("audio"); el.controls = true; }
    else { el = document.createElement("a"); el.href = url; el.download = fp.fileName || "fichier"; el.textContent = "📎 " + (fp.fileName || T("attach")); el.className = "att"; }
    if (el.tagName !== "A") el.src = url;
    slot && slot.replaceWith(el);
  });
}
function convText() {
  if (!CUR) return "";
  const ch = MODEL.chats.get(CUR); const lines = [chatName(ch), ""];
  for (const it of MODEL.items.get(CUR) || []) {
    const ms = num(it.dateSent); const who = it.outgoing ? T("you") : recName(MODEL.rec.get(String(it.authorId)));
    lines.push(`[${new Date(ms).toLocaleString(LANG === "fr" ? "fr-FR" : "en-GB")}] ${it.updateMessage ? "— " : who + " : "}${itemSummary(it)}`);
  }
  return lines.join("\n");
}
$("#copyTxt").onclick = async () => {
  const s = convText(); if (!s) return;
  try { await navigator.clipboard.writeText(s); status(T("copied"), "ok"); }
  catch (e) { const ta = document.createElement("textarea"); ta.value = s; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); status(T("copyFail")); setTimeout(() => ta.remove(), 8000); }
};
$("#dlTxt").onclick = () => {
  const s = convText(); if (!s) return;
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([s], { type: "text/plain;charset=utf-8" }));
  a.download = (chatName(MODEL.chats.get(CUR)) || "conversation").replace(/[^\w\- ]+/g, "_") + ".txt"; document.body.appendChild(a); a.click(); a.remove();
};
let qTimer; $("#q").addEventListener("input", () => { clearTimeout(qTimer); qTimer = setTimeout(() => { if (MODEL) renderAll(); }, 150); });

/* ---------- export HTML autonome ---------- */
const safeMime = s => /^[a-z0-9]+\/[a-z0-9.+-]+$/i.test(s || "") ? s.toLowerCase() : "application/octet-stream";
const dataUri = (blob, mime) => new Promise((res, rej) => { const r = new FileReader(); r.onerror = () => rej(r.error); r.onload = () => { const s = String(r.result); res("data:" + mime + ";base64," + s.slice(s.indexOf(",") + 1)); }; r.readAsDataURL(blob); });
async function exportMedia(fp, label) {
  const name = esc(fp && (fp.fileName || fp.contentType) || label);
  const url = await mediaUrl(fp);
  if (!url || url === "missing" || url === "fail") return `<div class="att">📎 ${name}${url ? " · " + esc(T(url === "missing" ? "mediaMissing" : "mediaFail")) : ""}</div>`;
  const mime = safeMime(fp.contentType), uri = await dataUri(await (await fetch(url)).blob(), mime);
  if (mime.startsWith("image/")) return `<img alt="${name}" src="${uri}">`;
  if (mime.startsWith("video/")) return `<video controls src="${uri}"></video>`;
  if (mime.startsWith("audio/")) return `<audio controls src="${uri}"></audio>`;
  return `<a class="att" download="${name}" href="${uri.replace(/^data:[^;]+/, "data:application/octet-stream")}">📎 ${name}</a>`;
}
async function exportHtml() {
  const id = CUR, ch = MODEL.chats.get(id), items = MODEL.items.get(id) || [], title = chatName(ch);
  const group = !!(MODEL.rec.get(String(ch.recipientId)) || {}).group;
  const parts = [`<!doctype html><html lang="${LANG}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; media-src data:; style-src 'unsafe-inline'"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{margin:0 auto;max-width:760px;padding:24px 16px;font:16px/1.5 system-ui,sans-serif;background:#f1f3ee;color:#18211d;display:flex;flex-direction:column;gap:8px}h1{font-size:1.6rem}.d,.s{align-self:center;color:#56615b;font-size:.85rem}.d{margin-top:16px;font-weight:700}.m{align-self:flex-start;max-width:80%;background:#fff;border-radius:16px;padding:9px 14px;overflow-wrap:anywhere;break-inside:avoid}.o{align-self:flex-end;background:#0d6b5c;color:#fff}.x{white-space:pre-wrap}.a{font-weight:700;font-size:.8rem}.t{font-size:.72rem;opacity:.7;text-align:right}.q{border-left:3px solid #b9770e;padding-left:8px;font-size:.88rem;opacity:.85}.att{display:block;color:inherit}img,video{display:block;max-width:100%;max-height:480px;border-radius:8px}@media print{body{background:#fff}.m{border:1px solid #ccc}.o{background:#fff;color:#000}}</style></head><body><h1>${esc(title)}</h1>`];
  let day = "", tick = performance.now(), buf = "";
  for (const it of items) {
    const ms = num(it.dateSent), dd = fmtDay(ms);
    if (dd !== day) { buf += `<div class="d">${esc(dd)}</div>`; day = dd; }
    if (it.updateMessage) { buf += `<div class="s">${esc(updText(it))} · ${fmtTime(ms)}</div>`; continue; }
    buf += `<div class="m${it.outgoing ? " o" : ""}">`;
    if (!it.outgoing && group) buf += `<div class="a">${esc(recName(MODEL.rec.get(String(it.authorId))))}</div>`;
    const sm = it.standardMessage;
    if (sm) {
      if (sm.quote) buf += `<div class="q"><b>${esc(recName(MODEL.rec.get(String(sm.quote.authorId))))}</b><br>${esc(bodyText(sm.quote.text) || ((sm.quote.attachments || []).length ? T("attach") : "…"))}</div>`;
      for (const a of sm.attachments || []) buf += await exportMedia(a.pointer, T("attach"));
      let tx = bodyText(sm.text);
      if (sm.longText) { const u = await mediaUrl(sm.longText); if (u && u.startsWith("blob:")) tx = await (await fetch(u)).text(); }
      if (tx) buf += `<div class="x">${esc(tx)}</div>`;
      for (const lp of sm.linkPreview || []) if (lp.url) buf += `<div class="att">🔗 ${esc(lp.title || lp.url)}</div>`;
      if (sm.reactions && sm.reactions.length) buf += `<div>${sm.reactions.map(r => esc(r.emoji || "")).join(" ")}</div>`;
    } else if (it.stickerMessage && it.stickerMessage.sticker && it.stickerMessage.sticker.data) buf += await exportMedia(it.stickerMessage.sticker.data, T("sticker"));
    else buf += `<i>${esc(itemSummary(it) || T("event"))}</i>`;
    buf += `<div class="t">${fmtTime(ms)}</div></div>\n`;
    if (buf.length > 1e6) { parts.push(new Blob([buf])); buf = ""; }
    if (performance.now() - tick > 60) { await pause(); tick = performance.now(); }
  }
  parts.push(buf, "</body></html>");
  const u = URL.createObjectURL(new Blob(parts, { type: "text/html;charset=utf-8" })), a = document.createElement("a");
  a.href = u; a.download = (title || "conversation").replace(/[^\p{L}\p{N}_\- ]+/gu, "_") + ".html"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000);
}
$("#dlHtml").onclick = async () => {
  if (!CUR) return;
  const b = $("#dlHtml"); b.disabled = true; status(T((MODEL.items.get(CUR) || []).length > 20000 ? "exportBig" : "exporting"));
  try { await exportHtml(); status(T("exportOk"), "ok"); } catch (e) { status(T("exportFail"), "err"); }
  b.disabled = false;
};

/* ---------- entrée ---------- */
let FILES = [];
function status(msg, kind) { const s = $("#status"); s.textContent = msg; s.className = "status" + (kind ? " " + kind : ""); }
/* Diagnostic : uniquement des informations de structure (tailles, compteurs, étapes), jamais de clé, nom, chemin ni contenu. */
let DIAG = null;
const pause = () => new Promise(r => setTimeout(r, 0));
function diagText() {
  const d = DIAG || {}, types = {}; let media = 0;
  if (MODEL && !MODEL.sample && d.ok) for (const arr of MODEL.items.values()) for (const it of arr) {
    const k = ["standardMessage","contactMessage","stickerMessage","remoteDeletedMessage","updateMessage","paymentNotification","giftBadge","viewOnceMessage","directStoryReplyMessage","poll","adminDeletedMessage"].find(x => it[x]) || "inconnu";
    types[k] = (types[k] || 0) + 1; if (it.standardMessage && it.standardMessage.attachments) media += it.standardMessage.attachments.length;
  }
  const st = { ok: 0, missing: 0, fail: 0 }; mediaCache.forEach(v => { st[v === "missing" || v === "fail" ? v : "ok"]++; });
  return ["Lanterne diagnostic 1", "ua: " + navigator.userAgent, "etape: " + (d.step || "-"), "resultat: " + (d.ok ? "ok" : d.ok === false ? "echec" : "-"), "erreur: " + (d.error || "-"),
    "tailles: main=" + (d.main || 0) + " metadata=" + (d.meta || 0) + " clair=" + (d.raw || 0), "trames: " + (d.frames || 0) + " illisibles=" + (d.bad || 0),
    "champs inconnus (trame): " + JSON.stringify(d.unknown || {}), "types: " + JSON.stringify(types), "pieces jointes: " + media + " indexees=" + (MEDIA ? MEDIA.size : 0) + " ouvertes=" + JSON.stringify(st)].join("\n");
}
$("#diag").onclick = async () => {
  const s = diagText();
  try { await navigator.clipboard.writeText(s); status(T("diagOk"), "ok"); }
  catch (e) { const ta = document.createElement("textarea"); ta.value = s; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); status(T("copyFail")); setTimeout(() => ta.remove(), 8000); }
};
const logEl = $("#log"); const log = m => { const li = document.createElement("li"); li.textContent = m; logEl.appendChild(li); };
function updGo() {
  const n = normAEP($("#aep").value).length;
  const kc = $("#keycount"); kc.textContent = n + " / 64"; kc.className = n === 64 ? "good" : "";
  const hasJsonl = FILES.some(f => /\.jsonl$/i.test(f.name));
  $("#go").disabled = !(FILES.length && (n === 64 || hasJsonl));
}
$("#aep").addEventListener("input", updGo);
function setFiles(list) {
  FILES = Array.from(list || []);
  const snaps = FILES.filter(f => f.name === "main").length;
  $("#picked").textContent = FILES.length ? `${FILES.length} fichier(s)` + (snaps ? ` · ${snaps}× main` : "") : "";
  updGo();
}
$("#dirInput").addEventListener("change", e => setFiles(e.target.files));
$("#fileInput").addEventListener("change", e => setFiles(e.target.files));
const drop = $("#drop");
drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", async e => {
  e.preventDefault(); drop.classList.remove("over");
  const items = Array.from(e.dataTransfer.items || []); const out = [];
  async function walk(entry, path) {
    if (entry.isFile) { const f = await new Promise((res, rej) => entry.file(res, rej)); out.push(Object.assign(f, { _path: path + f.name })); }
    else if (entry.isDirectory) { const r = entry.createReader(); for (;;) { const ents = await new Promise((res, rej) => r.readEntries(res, rej)); if (!ents.length) break; for (const en of ents) await walk(en, path + entry.name + "/"); } }
  }
  const entries = items.map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  if (entries.length) { for (const en of entries) await walk(en, ""); setFiles(out); } else setFiles(e.dataTransfer.files);
});
const pathOf = f => f._path || f.webkitRelativePath || f.name;
function dirOf(p) { const i = p.lastIndexOf("/"); return i < 0 ? "" : p.slice(0, i); }

function indexMedia(files, plain) {
  const map = new Map(); map.plain = plain;
  for (const f of files) {
    const parts = pathOf(f).split("/");
    if (parts.length >= 3 && parts[parts.length - 3] === "files" && parts[parts.length - 2].length === 2) map.set(parts[parts.length - 1].toLowerCase(), f);
  }
  return map.size ? map : null;
}

async function openV2(aepRaw) {
  const aep = normAEP(aepRaw); DIAG.step = "cle";
  if (aep.length !== 64 || !/^[a-z0-9]+$/.test(aep)) throw new Error(T("needKey"));
  // regroupe main + metadata par dossier, garde le plus récent
  const byDir = new Map();
  for (const f of FILES) if (f.name === "main" || f.name === "metadata") { const d = dirOf(pathOf(f)); const o = byDir.get(d) || {}; o[f.name] = f; byDir.set(d, o); }
  const snaps = [...byDir.entries()].filter(([, o]) => o.main && o.metadata).sort((a, b) => a[0] < b[0] ? 1 : -1);
  if (!snaps.length) throw new Error(T("noSnap"));
  const [dir, snap] = snaps[0]; DIAG.step = "metadata"; DIAG.main = snap.main.size; DIAG.meta = snap.metadata.size;
  log(`${T("found")} ${dir || "main + metadata"}`);
  MEDIA = indexMedia(FILES, false); if (MEDIA) log(`${MEDIA.size} ${T("media")}`);

  const backupKey = await hkdf(enc.encode(aep), 32, INFO_BACKUP_KEY);
  const metaKey = await hkdf(backupKey, 32, INFO_LOCAL_META);
  log(T("derive"));
  const meta = new Uint8Array(await snap.metadata.arrayBuffer());
  let iv = null, ct = null;
  for (const [f, w, v] of fields(meta)) if (f === 2 && w === 2) for (const [f2, , v2] of fields(v)) { if (f2 === 1) iv = v2; else if (f2 === 2) ct = v2; }
  if (!iv || !ct) throw new Error("metadata : encryptedBackupId absent");
  const counter = iv.length === 12 ? concat(iv, new Uint8Array(4)) : iv;
  const ck = await crypto.subtle.importKey("raw", metaKey, "AES-CTR", false, ["decrypt"]);
  const backupId = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CTR", counter, length: 32 }, ck, ct));
  log(T("bid"));
  const mk = await hkdf(backupKey, 64, concat(INFO_MSG_PREFIX, backupId));
  const hmacKey = mk.subarray(0, 32), aesKey = mk.subarray(32);

  DIAG.step = "hmac"; await pause();
  const main = new Uint8Array(await snap.main.arrayBuffer());
  if (td.decode(main.subarray(0, 8)) === "SBACKUP\x01") throw new Error(T("fs"));
  const body = main.subarray(0, main.length - 32), tag = main.subarray(main.length - 32);
  if (!(await hmacOk(hmacKey, body, tag))) throw new Error(T("badKey"));
  log(T("mac"));
  DIAG.step = "aes";
  const plain = stripPkcs7(await cbcRaw(aesKey, main.subarray(0, 16), main.subarray(16, main.length - 32)));
  DIAG.step = "gzip";
  const raw = await gunzip(plain); DIAG.raw = raw.length; DIAG.step = "trames";
  log(`${T("gz")} ${(raw.length / 1048576).toFixed(1)} ${LANG === "fr" ? "Mo" : "MB"}`);

  const M = newModel(); let p = 0, n = 0, first = true;
  let tick = performance.now();
  while (p < raw.length) {
    let len, q;
    try { [len, q] = rv(raw, p); } catch (e) { DIAG.bad = (DIAG.bad || 0) + 1; break; }
    if (q + len > raw.length) { DIAG.bad = (DIAG.bad || 0) + 1; break; } // fin tronquée : on garde ce qui est lu
    p = q; const chunk = raw.subarray(p, p + len); p += len;
    try {
      if (first) { M.info = dec(chunk, "BackupInfo"); first = false; }
      else { const fr = dec(chunk, "Frame"); if (fr.recipient || fr.chat || fr.chatItem) addFrame(M, fr); else if (chunk.length) { const f = chunk[0] >> 3; DIAG.unknown = DIAG.unknown || {}; DIAG.unknown[f] = (DIAG.unknown[f] || 0) + 1; } n++; }
    } catch (e) { DIAG.bad = (DIAG.bad || 0) + 1; }
    if ((n & 255) === 0 && performance.now() - tick > 40) { status(`${T("working")} ${Math.floor(p / raw.length * 100)} %`); await pause(); tick = performance.now(); }
  }
  DIAG.frames = n;
  log(`${n.toLocaleString(LANG)} ${T("frames")}`);
  return M;
}

async function openJsonl(file) {
  log(T("jsonl"));
  const M = newModel(); const text = await file.text(); let first = true;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let o; try { o = JSON.parse(line); } catch (e) { continue; }
    if (first && (o.version != null || o.backupTimeMs != null)) { M.info = o; first = false; continue; }
    first = false; addFrame(M, o);
  }
  MEDIA = indexMedia(FILES, true);
  return M;
}

$("#form").addEventListener("submit", async e => {
  e.preventDefault();
  logEl.innerHTML = "";
  if (!window.crypto || !crypto.subtle || typeof DecompressionStream === "undefined") return status(T("noCrypto"), "err");
  if (!FILES.length) return status(T("needFiles"), "err");
  if (FILES.some(f => /\.backup$/i.test(f.name)) && !FILES.some(f => f.name === "main")) return status(T("oldfmt"), "err");
  $("#go").disabled = true; status(T("working")); DIAG = { step: "debut" }; $("#diag").hidden = false;
  try {
    const jsonl = FILES.find(f => /\.jsonl$/i.test(f.name));
    const M = jsonl && !FILES.some(f => f.name === "main") ? await openJsonl(jsonl) : await openV2($("#aep").value);
    if ($("#wipe").checked) $("#aep").value = "";
    mediaCache.forEach(u => { if (u && u.startsWith && u.startsWith("blob:")) URL.revokeObjectURL(u); }); mediaCache.clear();
    MODEL = M; CUR = null; SHOWN = 300;
    DIAG.ok = true; DIAG.step = "fin"; status(T(M.nItems ? "done" : "emptyBackup"), "ok"); renderAll();
    document.querySelector(".viewer").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) { DIAG.ok = false; DIAG.error = String(err && err.name || "") + ": " + String(err && err.message || err); status(err && err.message ? err.message : String(err), "err"); }
  updGo();
});

/* ---------- exemple affiché au chargement ---------- */
function sample() {
  const M = newModel(); M.sample = true;
  const now = Date.UTC(2026, 10, 21, 18, 0); const H = 3600e3, D = 24 * H;
  [[1, { self: {} }], [2, { contact: { systemGivenName: "Camille", systemFamilyName: "Roux" } }], [3, { contact: { profileGivenName: "Yanis" } }],
   [4, { group: { snapshot: { title: { title: "Rando Vercors" } } } }], [5, { contact: { profileGivenName: "Inès", profileFamilyName: "B." } }]]
    .forEach(([id, r]) => M.rec.set(String(id), Object.assign({ id }, r)));
  M.chats.set("10", { id: 10, recipientId: 2 }); M.chats.set("11", { id: 11, recipientId: 4 }); M.chats.set("12", { id: 12, recipientId: 1 });
  const add = (chat, author, t, text, extra) => { const it = Object.assign({ chatId: chat, authorId: author, dateSent: t }, author === 1 ? { outgoing: {} } : { incoming: {} }, text != null ? { standardMessage: { text: { body: text } } } : {}, extra || {}); let a = M.items.get(String(chat)); if (!a) M.items.set(String(chat), a = []); a.push(it); M.nItems++; };
  add(10, 2, now - 2 * D, "Tu as pu récupérer tes messages après le changement de téléphone ?");
  add(10, 1, now - 2 * D + 6e5, "Pas encore, la restauration échoue. Mais j'ai le dossier de sauvegarde et ma clé.");
  add(10, 2, now - 2 * D + 9e5, "Ouf. Garde bien la clé dans ton gestionnaire de mots de passe.");
  add(10, 1, now - D, null, { updateMessage: { individualCall: {} } });
  add(10, 2, now - D + 4e5, "Photo du chalet pour samedi 👇", { standardMessage: { text: { body: "Photo du chalet pour samedi 👇" }, attachments: [{ pointer: { contentType: "image/jpeg", fileName: "IMG_2041.jpg" } }], reactions: [{ emoji: "❤️", authorId: 1 }] } });
  add(11, 3, now - 3 * D, "Départ 7 h au parking de la Molière ?");
  add(11, 5, now - 3 * D + 3e5, "Ok pour moi, je prends les bâtons.");
  add(11, 1, now - 3 * D + 9e5, null, { standardMessage: { text: { body: "Parfait, je réserve le refuge." }, quote: { authorId: 3, text: { body: "Départ 7 h au parking de la Molière ?" } } } });
  add(11, 3, now - 2 * H, null, { updateMessage: { expirationTimerChange: {} } });
  add(12, 1, now - 5 * D, "Code du portail : voir carnet bleu.");
  return M;
}

if (location.protocol !== "file:" && "serviceWorker" in navigator) navigator.serviceWorker.register(SW_URL).catch(() => {});
setLang(LANG);
MODEL = sample(); renderAll();
updGo();
})();
