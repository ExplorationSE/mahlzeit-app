// Holt die Mittagskarten der vier Lokale in Berlin-Adlershof und schreibt site/data/<id>.json.
// Aufruf: node scripts/fetch-menus.mjs   (benötigt Node ≥ 20 und für die Speisemanufaktur „pdftotext“ aus poppler-utils)
// Schlägt eine Quelle fehl, bleibt der letzte gute Stand erhalten (lokal oder von der veröffentlichten Seite, PREV_BASE).
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'site', 'data');
const PREV_BASE = process.env.PREV_BASE ?? 'https://explorationse.github.io/mahlzeit-app/data/';
const UA = 'Mozilla/5.0 (compatible; ExplorationSE-Mahlzeit/0.1; +https://explorationse.github.io/mahlzeit-app/)';
const DAYS = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag'];

// ---------- Hilfsfunktionen ----------
async function get(url, binary = false) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'de' }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
      if (!r.ok) throw new Error(`HTTP ${r.status} bei ${url}`);
      return binary ? Buffer.from(await r.arrayBuffer()) : await r.text();
    } catch (e) { if (i === 2) throw e; await new Promise(res => setTimeout(res, 2000 * (i + 1))); }
  }
}
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', szlig: 'ß', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', euro: '€', ndash: '–', mdash: '—', eacute: 'é', egrave: 'è', agrave: 'à', aacute: 'á', ntilde: 'ñ', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', hellip: '…', shy: '' };
const unesc = s => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] ?? m));
const clean = s => unesc(s.replace(/<[^>]+>/g, ' ')).replace(/[\s\u00a0]+/g, ' ').trim();
// HTML → Textzeilen (Blockelemente und <br> werden zu Zeilenumbrüchen)
const htmlLines = h => unesc(h.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr|td|th|table|section)>/gi, '\n').replace(/<[^>]+>/g, ' '))
  .split('\n').map(l => l.replace(/[\s\u00a0]+/g, ' ').trim());
const iso = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
const addDays = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
const dayIndex = s => DAYS.indexOf(s.toLowerCase().replace(/[^a-zäöüß]/g, ''));
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

// Wochenzeitraum wie „19.10. - 23.10.2026“, „19. – 23.10.2026“, „19.10.-23.10.26“ → Montag (UTC-Datum) + Freitag
function weekRange(text) {
  const m = text.match(/(\d{1,2})\.\s*(?:(\d{1,2})\.)?\s*(?:\d{2,4})?\s*(?:-|–|—|bis)\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4}|\d{2})/);
  if (!m) return null;
  let y = +m[5]; if (y < 100) y += 2000;
  const end = new Date(Date.UTC(y, +m[4] - 1, +m[3]));
  let start = new Date(Date.UTC(y, (m[2] ? +m[2] : +m[4]) - 1, +m[1]));
  if (start > end) start = new Date(Date.UTC(y - 1, start.getUTCMonth(), start.getUTCDate()));
  const wd = (start.getUTCDay() + 6) % 7; // 0 = Montag
  const monday = wd === 0 ? start : addDays(end, -((end.getUTCDay() + 6) % 7));
  return { monday, from: iso(start), to: iso(end) };
}
function tagsFrom(text) {
  const t = []; const s = text.toLowerCase();
  if (/\bvegan\b/.test(s)) t.push('vegan');
  else if (/\bveg(etarisch|\.)/.test(s)) t.push('vegetarisch');
  if (/glutenfrei/.test(s)) t.push('glutenfrei');
  if (/laktosefrei/.test(s)) t.push('laktosefrei');
  return t;
}
function dated(range, perDay) { // perDay: Array[5] von Gerichtlisten → { 'YYYY-MM-DD': {items} }
  const days = {};
  perDay.forEach((items, i) => { if (items && items.length) days[iso(addDays(range.monday, i))] = { items }; });
  return days;
}

// ---------- Kamee ----------
async function kamee() {
  const url = 'https://www.kamee-caffe.de/';
  const lines = htmlLines(await get(url));
  const k = lines.findIndex(l => /Wochenkarte/i.test(l) && weekRange(l));
  if (k < 0) throw new Error('Kamee: keine „Wochenkarte vom …“ gefunden');
  const range = weekRange(lines[k]);
  const per = [[], [], [], [], []]; let cur = -1, empty = 0;
  for (const l of lines.slice(k + 1)) {
    if (!l) { if (cur >= 0 && ++empty >= 4) break; continue; }
    empty = 0;
    const d = dayIndex(l);
    if (d >= 0 && l.length < 15) { cur = d; continue; }
    if (/^(samstag|sonntag)/i.test(l) || l.length > 220) break;
    if (cur < 0) continue;
    const veg = /^veg\.?\s/i.test(l) || /\bvegetarisch\b/i.test(l);
    const name = cap(l.replace(/^veg\.?\s*/i, '').trim());
    const tags = tagsFrom(l); if (veg && !tags.includes('vegan') && !tags.includes('vegetarisch')) tags.unshift('vegetarisch');
    per[cur].push({ name, tags });
  }
  if (!per.some(x => x.length)) throw new Error('Kamee: Wochenkarte ohne Gerichte');
  return { source: url, format: 'HTML (Wochenkarte auf der Startseite)', weekFrom: range.from, weekTo: range.to, days: dated(range, per), weekly: [] };
}

// ---------- esswirtschaft ----------
async function esswirtschaft() {
  const url = 'https://www.forum-esswirtschaft.de/wochenkarte/';
  const h = await get(url);
  const head = clean(h.match(/WOCHENKARTE[^<]{0,40}\d{1,2}\.[^<]{0,30}\d{4}/i)?.[0] ?? '');
  const range = weekRange(head) || weekRange(clean(h));
  if (!range) throw new Error('esswirtschaft: kein Wochenzeitraum gefunden');
  const per = [[], [], [], [], []], weekly = []; let label = '';
  const LABELS = { wochengericht: 'Wochengericht', suppen: 'Suppe', suppe: 'Suppe', wochensalat: 'Wochensalat' };
  for (const tr of h.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const td = tr.match(/<td[\s\S]*?<\/td>/gi); if (!td || td.length < 2) continue;
    const l = clean(td[0]); if (l) label = l;
    const icons = (td[2] ?? '').match(/(?:data-orig-src|src)="[^"]*\/([A-Za-z]+)\.png"/gi)?.map(x => x.match(/\/([A-Za-z]+)\.png/)[1].toLowerCase()) ?? [];
    const di = dayIndex(label), wl = LABELS[label.toLowerCase()];
    if (di < 0 && !wl) continue;
    for (const part of td[1].split(/<br\s*\/?>/i).map(clean).filter(Boolean)) {
      const tags = tagsFrom(part + ' ' + icons.join(' '));
      if (icons.includes('vegan') && !tags.includes('vegan')) { tags.splice(tags.indexOf('vegetarisch'), tags.includes('vegetarisch') ? 1 : 0); tags.unshift('vegan'); }
      const name = part.replace(/\s*\((?:(?:vegan|vegetarisch|glutenfrei|laktosefrei)[,\s]*)+\)\s*/gi, ' ').trim();
      if (di >= 0) per[di].push({ name, tags }); else weekly.push({ name, tags, label: wl });
    }
  }
  if (!per.some(x => x.length)) throw new Error('esswirtschaft: keine Tagesgerichte erkannt');
  return { source: url, format: 'HTML (Tabellen)', weekFrom: range.from, weekTo: range.to, days: dated(range, per), weekly };
}

// ---------- Speisemanufaktur (PDF-Wochenkarte) ----------
async function speisemanufaktur() {
  const page = 'https://speisemanufaktur-adlershof.de/wochenkarte';
  const h = await get(page);
  const rel = h.match(/["'](\/?[^"']*Wochenkarte[^"']*\.pdf)["']/i)?.[1];
  if (!rel) throw new Error('Speisemanufaktur: kein PDF-Link auf der Wochenkarten-Seite');
  const pdfUrl = new URL(rel, page).href;
  const f = join(tmpdir(), 'speisemanufaktur.pdf');
  await writeFile(f, await get(pdfUrl, true));
  const { stdout } = await run('pdftotext', ['-bbox-layout', f, '-']);
  const lines = [...stdout.matchAll(/<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/line>/g)].map(m => ({
    x0: +m[1], y: +m[2], x1: +m[3], t: unesc([...m[5].matchAll(/>([^<]*)<\/word>/g)].map(w => w[1]).join(' ')).trim()
  }));
  const squash = s => s.replace(/\s+/g, '').toUpperCase();
  const all = lines.map(l => l.t).join('\n');
  const range = weekRange(all.replace(/(\d)\s+(?=[\d.])/g, '$1').replace(/\.\s+/g, '.'));
  if (!range) throw new Error('Speisemanufaktur: kein Wochenzeitraum im PDF');
  const heads = lines.filter(l => dayIndex(squash(l.t)) >= 0 && squash(l.t).length < 12).map(l => ({ d: dayIndex(squash(l.t)), y: l.y })).sort((a, b) => a.y - b.y);
  if (heads.length < 5) throw new Error(`Speisemanufaktur: nur ${heads.length} Wochentage im PDF erkannt`);
  const fl = lines.find(l => /FLAMMKUCHEN/.test(squash(l.t)));
  const colX = fl ? fl.x0 - 5 : Infinity;
  const legendY = Math.min(...lines.filter(l => /^vegetarisch$|mit Fleisch =/i.test(l.t)).map(l => l.y), Infinity);
  const meat = all.match(/#\s*mit Fleisch\s*=\s*([\d,]+)\s*€/i)?.[1];
  const per = [[], [], [], [], []];
  heads.forEach((hd, i) => {
    const yEnd = Math.min(heads[i + 1]?.y ?? Infinity, legendY);
    const body = lines.filter(l => l.y > hd.y + 2 && l.y < yEnd - 2 && l.x1 < colX).sort((a, b) => a.y - b.y || a.x0 - b.x0);
    let buf = '', mark = null, pending = null;
    for (const l of body) {
      let t = l.t;
      if (/^[🥕🥦]+$/u.test(t)) { pending = t.includes('🥦') ? 'vegan' : 'vegetarisch'; continue; }
      if (/^[🥕🥦]/u.test(t)) { mark = t.includes('🥦') ? 'vegan' : 'vegetarisch'; t = t.replace(/^[🥕🥦]\s*/u, ''); }
      buf += (buf ? ' ' : '') + t;
      const pm = buf.match(/^(.*?)\s*(?:I|\|)?\s*(\d+,\d{2})\s*€\s*(#|\*)?\s*$/);
      if (!pm) continue;
      let name = pm[1].replace(/\s+I\s*$/, '').replace(/\s+[I|]\s+/g, ', ').trim();
      const soup = /^Tagessuppe/i.test(name);
      let tags = mark ? [mark] : [];
      if (!mark && pending && !soup) { tags = [pending]; pending = null; }
      let price = pm[2] + ' €';
      if (soup && pm[3] === '#' && meat) price += ` (mit Fleisch ${meat} €)`;
      per[hd.d].push({ name, price, tags });
      buf = ''; mark = null;
    }
  });
  const weekly = [];
  if (fl) {
    const box = lines.filter(l => l.x0 >= colX && l.y > fl.y + 2 && l.y < fl.y + 160).sort((a, b) => a.y - b.y);
    const pi = box.findIndex(l => /\d\s*,\s*\d\s*\d\s*€/.test(l.t));
    if (pi > 0) {
      // Zeilenumbrüche in der Zutatenliste trennen ebenfalls Zutaten
      const title = box[0].t, desc = box.slice(1, pi).map(l => l.t.replace(/\s+[I|]\s*$/, '')).join(' I ').replace(/\s+[I|]\s+/g, ', ');
      const SMALL = new Set(['di', 'e', 'con', 'al', 'alla', 'mit', 'und']);
      const tc = s => s.toLowerCase().split(' ').map((w, i) => i && SMALL.has(w) ? w : cap(w)).join(' ');
      weekly.push({ name: `Flammkuchen Spezial „${tc(title)}“ (${tc(desc)})`, price: box[pi].t.replace(/\s+/g, '').replace('€', ' €'), tags: [], label: 'Wochenangebot, nur in der Manufaktur' });
    }
  }
  if (!per.some(x => x.length)) throw new Error('Speisemanufaktur: keine Gerichte im PDF erkannt');
  return { source: pdfUrl, sourcePage: page, format: 'PDF (Text, per Position ausgewertet)', weekFrom: range.from, weekTo: range.to, days: dated(range, per), weekly };
}

// ---------- Mensa HU Oase (Studierendenwerk Berlin) ----------
async function mensa() {
  const url = 'https://www.stw.berlin/mensen/einrichtungen/humboldt-universit%C3%A4t-zu-berlin/mensa-hu-oase-adlershof.html';
  const h = await get(url);
  const days = {};
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let j; try { j = JSON.parse(m[1]); } catch { continue; }
    for (const g of [j, ...(j['@graph'] ?? [])]) {
      if (g['@type'] !== 'Menu') continue;
      const date = g['@id']?.match(/(\d{4}-\d{2}-\d{2})$/)?.[1]; if (!date) continue;
      const items = [];
      for (const sec of g.hasMenuSection ?? []) for (const it of [].concat(sec.hasMenuItem ?? [])) {
        const desc = (it.description ?? '').trim();
        const [rest, allergens] = desc.split(/\s*Enthält:\s*/);
        const name = [it.name, rest].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        const diet = [].concat(it.suitableForDiet ?? []).join(' ');
        const tags = /VeganDiet/.test(diet) ? ['vegan'] : /VegetarianDiet/.test(diet) ? ['vegetarisch'] : [];
        if (/GlutenFreeDiet/.test(diet)) tags.push('glutenfrei');
        const offers = [].concat(it.offers ?? []);
        const price = offers.length ? offers.map(o => (+o.price).toFixed(2).replace('.', ',')).join(' / ') + ' €' : null;
        items.push({ name, price, tags, group: sec.name, allergens: allergens?.replace(/\.$/, '') || null });
      }
      if (items.length) days[date] = { items };
    }
  }
  if (!Object.keys(days).length) throw new Error('Mensa: kein Speiseplan (JSON-LD) auf der Seite gefunden');
  const ds = Object.keys(days).sort();
  return { source: url, format: 'HTML mit strukturierten Daten (schema.org/Menu, mehrere Tage)', weekFrom: ds[0], weekTo: ds.at(-1), priceNote: 'Studierende / Beschäftigte / Gäste', days, weekly: [] };
}

// ---------- Ablauf ----------
const SOURCES = { kamee, speisemanufaktur, esswirtschaft, mensa };
async function previous(id) {
  try { return JSON.parse(await readFile(join(OUT, id + '.json'), 'utf8')); } catch {}
  try { const r = await fetch(PREV_BASE + id + '.json', { signal: AbortSignal.timeout(15000) }); if (r.ok) return await r.json(); } catch {}
  return null;
}
await mkdir(OUT, { recursive: true });
const only = process.argv.slice(2);
// Bei Teilläufen (nur einzelne Quellen) bleiben die Einträge der übrigen Quellen erhalten
let oldSources = {};
if (only.length) try { oldSources = JSON.parse(await readFile(join(OUT, 'status.json'), 'utf8')).sources ?? {}; } catch {}
const status = { fetched: new Date().toISOString(), sources: oldSources };
let failed = 0, ran = 0;
for (const [id, fn] of Object.entries(SOURCES)) {
  if (only.length && !only.includes(id)) continue;
  const t0 = Date.now(); ran++;
  try {
    const d = await fn();
    const out = { id, fetched: status.fetched, ok: true, ...d };
    await writeFile(join(OUT, id + '.json'), JSON.stringify(out, null, 1));
    const n = Object.values(d.days).reduce((a, x) => a + x.items.length, 0);
    status.sources[id] = { ok: true, days: Object.keys(d.days), items: n, weekly: d.weekly.length };
    console.log(`✓ ${id}: ${Object.keys(d.days).length} Tage, ${n} Gerichte, ${d.weekly.length} Wochenangebote (${Date.now() - t0} ms)`);
  } catch (e) {
    failed++;
    const prev = await previous(id);
    const out = prev ? { ...prev, ok: false, error: String(e.message ?? e), lastTry: status.fetched } : { id, ok: false, error: String(e.message ?? e), fetched: status.fetched, days: {}, weekly: [] };
    await writeFile(join(OUT, id + '.json'), JSON.stringify(out, null, 1));
    status.sources[id] = { ok: false, error: out.error, keptPrevious: !!prev };
    console.log(`✗ ${id}: ${out.error}${prev ? ' – letzter Stand bleibt erhalten' : ''}`);
  }
}
await writeFile(join(OUT, 'status.json'), JSON.stringify(status, null, 1));
if (ran && failed === ran) process.exitCode = 1;
