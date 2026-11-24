/* Langue et liens, chargé dans le <head> de chaque page. Aucune requête réseau.
   - Sans choix mémorisé et navigateur non francophone : page française → page anglaise.
   - Choix mémorisé : uniquement un clic sur un sélecteur de langue, ou ?lang=fr|en.
   - Robots d'indexation : jamais de redirection (les hreflang font le travail).
   - Ouvert depuis le disque (file://) : les liens de dossier visent leur index.html. */
(() => {
"use strict";
const KEY = "lanterne-lang-choice"; // l'ancienne clé « lanterne-lang » était écrite sans choix : ignorée
const isFile = location.protocol === "file:";
const root = new URL("../", document.currentScript.src);
const page = document.documentElement.lang;
const valid = l => (l === "fr" || l === "en" ? l : null);
const read = () => { try { return valid(localStorage.getItem(KEY)); } catch (e) { return null; } };
const choose = l => { try { localStorage.setItem(KEY, l); return localStorage.getItem(KEY) === l; } catch (e) { return false; } };
try { localStorage.removeItem("lanterne-lang"); } catch (e) {}

const asked = valid(new URLSearchParams(location.search).get("lang"));
if (asked) choose(asked);

// Même page dans l'autre langue, d'après les hreflang.
function go(l, keepLang) {
  const link = document.querySelector(`link[rel="alternate"][hreflang="${l}"]`);
  if (!link) return false;
  const u = new URL(new URL(link.href).pathname.slice(1) + (isFile ? "index.html" : ""), root);
  const p = new URLSearchParams(location.search); p.delete("lang"); if (keepLang || isFile) p.set("lang", l);
  u.search = p.toString(); u.hash = location.hash;
  location.replace(u.href);
  return true;
}

const bot = /bot\b|crawl|spider|slurp|bingpreview|google-|googleother|mediapartners|facebookexternalhit|embedly|whatsapp|lighthouse|yandex|baidu|archiver/i.test(navigator.userAgent);
if (!bot) {
  const browser = /^fr\b/i.test(navigator.language || "") ? "fr" : "en";
  // keepLang : si le choix n'a pas pu être mémorisé, il reste dans l'adresse.
  if (page === "fr" && (asked || read() || browser) === "en") go("en");
  else if (page === "en" && asked === "fr") go("fr", read() !== "fr");
}

window.LANTERNE = Object.freeze({ initial: asked || page, choose, go });

// Sur file://, certains navigateurs isolent le stockage de chaque fichier : la langue suit dans l'adresse.
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
  const l = valid(a.hreflang), saved = l && choose(l), u = new URL(a.href);
  const local = isFile && u.protocol === "file:" && !a.getAttribute("href").startsWith("#");
  const carry = local ? l || document.documentElement.lang : !saved && l;
  if (carry) { u.searchParams.set("lang", carry); a.href = u.href; }
}, true);

if (isFile) document.addEventListener("DOMContentLoaded", () => {
  for (const a of document.querySelectorAll("a[href]")) {
    const u = new URL(a.href);
    if (u.protocol === "file:" && u.pathname.endsWith("/")) { u.pathname += "index.html"; a.href = u.href; }
  }
});
else {
  // Ces ressources passent par CORS, refusé sur file:// : ajoutées sur le web uniquement.
  const add = o => document.head.append(Object.assign(document.createElement("link"), o));
  add({ rel: "manifest", href: new URL("manifest.webmanifest", root).href });
  add({ rel: "preload", as: "font", type: "font/woff2", crossOrigin: "anonymous", href: new URL("assets/fonts/bricolage.woff2", root).href });
}
})();
