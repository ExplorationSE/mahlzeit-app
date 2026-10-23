'use strict';
// ExplorationSE Mahlzeit – liest nur die vorab erzeugten JSON-Dateien in data/ (siehe scripts/fetch-menus.mjs)
const PLACES = [
  { id: 'speisemanufaktur', tab: 'Speise\u00admanufaktur', name: 'Speisemanufaktur Adlershof',
    info: [['Adresse', 'Johann-Hittorf-Str. 8 (im ZPV), 12489 Berlin'], ['Geöffnet', 'Mo–Fr 08:00–14:30 Uhr'], ['Mittag', '11:00–14:00 Uhr'], ['Bistro', 'Albert-Einstein-Str. 4, Mo–Do 07:00–15:00, Fr 07:00–14:30 Uhr']] },
  { id: 'kamee', tab: 'Kamee', name: 'Kamee Caffè & Ess Bar',
    info: [['Adresse', 'Rudower Chaussee 25, 12489 Berlin'], ['Geöffnet', 'Mo–Fr 08:00–14:00 Uhr'], ['Mittag', 'ab 11:30 Uhr, solange der Vorrat reicht'], ['Bezahlung', 'nur Barzahlung'], ['Geschlossen', 'Sa, So und Feiertage']],
    noPrices: 'Preise stehen nicht auf der Wochenkarte.' },
  { id: 'esswirtschaft', tab: 'Ess\u00adwirtschaft', name: 'Esswirtschaft (Forum Adlershof)',
    info: [['Adresse', 'Rudower Chaussee 39, 12489 Berlin'], ['Geöffnet', 'Mo–Fr 09:00–15:00 Uhr'], ['Warme Küche', '11:00–14:00 Uhr']],
    noPrices: 'Preise stehen nicht auf der Wochenkarte.' },
  { id: 'mensa', tab: 'Mensa Oase', name: 'Mensa HU Oase Adlershof',
    info: [['Adresse', 'Rudower Chaussee 25 (Haus 2), 12489 Berlin'], ['Mittag', 'Mo–Fr 11:00–14:30 Uhr'], ['Bezahlung', 'MensaCard (Details beim Studierendenwerk)']] },
];
const TZ = 'Europe/Berlin';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cache = {};

// Heutiges Datum in Berlin (Testen: ?datum=JJJJ-MM-TT)
function berlinToday() {
  const q = new URLSearchParams(location.search).get('datum');
  if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
const iso = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
function easter(y) { // Gauß/Meeus
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
}
function holiday(s) { // gesetzliche Feiertage in Berlin
  const y = +s.slice(0, 4), e = easter(y);
  const h = { [`${y}-01-01`]: 'Neujahr', [`${y}-03-08`]: 'Internationaler Frauentag', [addDays(e, -2)]: 'Karfreitag', [addDays(e, 1)]: 'Ostermontag', [`${y}-05-01`]: 'Tag der Arbeit',
    [addDays(e, 39)]: 'Christi Himmelfahrt', [addDays(e, 50)]: 'Pfingstmontag', [`${y}-10-03`]: 'Tag der Deutschen Einheit', [`${y}-12-25`]: '1. Weihnachtstag', [`${y}-12-26`]: '2. Weihnachtstag' };
  return h[s];
}
const wd = s => new Date(s + 'T12:00:00Z').getUTCDay();
const fmtDay = (s, o = { weekday: 'long', day: 'numeric', month: 'long' }) => new Date(s + 'T12:00:00Z').toLocaleDateString('de-DE', { ...o, timeZone: 'UTC' });
const fmtStamp = t => new Date(t).toLocaleString('de-DE', { timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' Uhr';

const today = berlinToday();
$('#datum').textContent = fmtDay(today, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

async function load(id) {
  if (cache[id]) return cache[id];
  const r = await fetch(`data/${id}.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (cache[id] = await r.json());
}

function dishHtml(it, showAllergens) {
  const tags = (it.tags || []).map(t => `<span class="tag ${esc(t)}">${esc(t)}</span>`).join('');
  const lbl = it.label ? `<span class="lbl">${esc(it.label)}</span>` : '';
  const price = it.price ? `<span class="price${it.price.length > 12 ? ' long' : ''}">${esc(it.price)}</span>` : '';
  const meta = tags || lbl ? `<div class="meta">${lbl}${tags}</div>` : '';
  const al = showAllergens && it.allergens ? `<div class="allerg">Enthält: ${esc(it.allergens)}</div>` : '';
  return `<li class="dish"><div class="row"><span class="name">${esc(it.name)}</span>${price}</div>${meta}${al}</li>`;
}
function listHtml(items, grouped) {
  if (!grouped) return `<ul class="dishes">${items.map(i => dishHtml(i)).join('')}</ul>`;
  const groups = new Map();
  for (const i of items) { const g = i.group || 'Angebot'; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(i); }
  const ORDER = ['Aktionen', 'Essen', 'Suppen', 'Vorspeisen', 'Salate', 'Beilagen', 'Desserts'], rank = g => (ORDER.indexOf(g) + 1) || 99;
  return [...groups].sort((a, b) => rank(a[0]) - rank(b[0])).map(([g, l]) => `<h3>${esc(g)}</h3><ul class="dishes">${l.map(i => dishHtml(i, true)).join('')}</ul>`).join('');
}
function sourceLink(p, d) {
  const page = d?.sourcePage || d?.source;
  const pdf = d?.sourcePage && d.source !== d.sourcePage ? ` · <a href="${esc(d.source)}" target="_blank" rel="noopener">PDF</a>` : '';
  return page ? `<a href="${esc(page)}" target="_blank" rel="noopener">${esc(new URL(page).hostname.replace(/^www\./, ''))}</a>${pdf}` : '–';
}
function infoHtml(p, d) {
  const rows = [...p.info];
  if (d?.priceNote) rows.push(['Preise', d.priceNote]);
  rows.push(['Quelle', sourceLink(p, d)]);
  if (d?.format) rows.push(['Format', esc(d.format)]);
  if (d?.fetched) rows.push(['Stand', esc(fmtStamp(d.fetched))]);
  return `<dl class="info">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${k === 'Quelle' || k === 'Format' || k === 'Stand' ? v : esc(v)}</dd>`).join('')}</dl>`;
}
function emptyHtml(p, d, why) {
  return `<div class="note"><p>${why}</p><p>Aktuelle Infos direkt beim Lokal: ${sourceLink(p, d)}</p></div>`;
}

async function render(id) {
  const p = PLACES.find(x => x.id === id) || PLACES[0];
  document.querySelectorAll('nav button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.id === p.id)));
  const main = $('#panel');
  let d = null, err = null;
  try { d = await load(p.id); } catch (e) { err = e; }
  if (($('nav button[aria-selected="true"]')?.dataset.id) !== p.id) return; // inzwischen anderer Tab
  let body = '';
  const day = d?.days?.[today];
  const hol = holiday(today), w = wd(today);
  if (err) body = emptyHtml(p, null, 'Die Daten konnten gerade nicht geladen werden. Bitte später erneut versuchen.');
  else if (w === 0 || w === 6) body = emptyHtml(p, d, `Heute ist ${w === 6 ? 'Samstag' : 'Sonntag'} – am Wochenende gibt es hier keinen Mittagstisch. Schönes Wochenende!`);
  else if (hol) body = emptyHtml(p, d, `Heute ist ${esc(hol)} – das Lokal ist voraussichtlich geschlossen.`);
  else if (!day || !day.items?.length) body = emptyHtml(p, d, d?.weekTo && d.weekTo < today ? 'Der Speiseplan für diese Woche ist noch nicht veröffentlicht. Er wird werktags morgens automatisch abgerufen.' : 'Für heute ist kein Speiseplan hinterlegt.');
  else {
    body = (d.priceNote ? `<p class="hint">Preise: ${esc(d.priceNote)}</p>` : '') + listHtml(day.items, p.id === 'mensa');
    if (p.id !== 'mensa') body = `<h3>Heute</h3>` + body;
    if (d.weekly?.length && d.weekFrom <= today && today <= d.weekTo) body += `<h3>Die ganze Woche</h3>` + listHtml(d.weekly);
    if (p.noPrices) body += `<p class="hint">${esc(p.noPrices)}</p>`;
    if (p.id !== 'mensa' && day.items.some(i => i.tags?.length)) body += `<p class="hint">Kennzeichnungen (vegetarisch, vegan …) wie in der Quelle angegeben, ohne Gewähr.</p>`;
  }
  const warn = d && d.ok === false ? `<p class="warn">Aktualisierung fehlgeschlagen – angezeigt wird der letzte Stand${d.fetched ? ' vom ' + esc(fmtStamp(d.fetched)) : ''}.</p>` : '';
  main.innerHTML = `<h2>${esc(p.name)}</h2><p class="sub">${esc(fmtDay(today))}</p>${warn}${body}${infoHtml(p, d)}`;
  main.scrollTop = 0;
}

const nav = $('#tabs');
nav.innerHTML = PLACES.map(p => `<button role="tab" type="button" data-id="${p.id}" aria-controls="panel" title="${esc(p.name)}">${esc(p.tab)}</button>`).join('');
nav.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; history.replaceState(null, '', location.pathname + location.search + (b.dataset.id === 'speisemanufaktur' ? '' : '#' + b.dataset.id)); render(b.dataset.id); });
nav.addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const bs = [...nav.querySelectorAll('button')], i = bs.findIndex(b => b.getAttribute('aria-selected') === 'true');
  const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; n.focus(); n.click();
});
addEventListener('hashchange', () => render(location.hash.slice(1) || 'speisemanufaktur'));
render(location.hash.slice(1) || 'speisemanufaktur');
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
