// Prüft das Layout bei 320/360/412 px: kein horizontales Scrollen, keine Seitenscrollbar, Fußzeile einzeilig, keine Konsolenfehler.
// Aufruf: node tools/test-layout.js [Basis-URL] [Screenshot-Verzeichnis]
const { chromium } = require(process.env.PW || '/workspace/shot/node_modules/playwright');
const BASE = process.argv[2] || 'http://localhost:8765/mahlzeit-app/';
const OUT = process.argv[3] || require('path').join(__dirname, '..');
const DATE = process.env.DATUM ? '?datum=' + process.env.DATUM : '';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  let bad = 0;
  for (const w of [320, 360, 412]) for (const tab of ['kamee', 'speisemanufaktur', 'esswirtschaft', 'mensa']) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = [];
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('requestfailed', r => errs.push('requestfailed: ' + r.url()));
    await p.goto(BASE + DATE + (tab === 'kamee' ? '' : '#' + tab), { waitUntil: 'networkidle' });
    await p.waitForSelector('.dish, .note', { timeout: 5000 });
    await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(() => {
      const de = document.documentElement, f = document.querySelector('footer'), m = document.querySelector('main');
      const tabs = [...document.querySelectorAll('nav button')].map(b => b.scrollWidth > b.clientWidth + 1 ? b.textContent : null).filter(Boolean);
      const wide = [...m.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 0.5).map(e => e.className || e.tagName).slice(0, 3);
      return { hScroll: de.scrollWidth > innerWidth, vScroll: de.scrollHeight > innerHeight, footerOneLine: f.scrollWidth <= f.clientWidth && f.clientHeight < 30,
        footerH: f.clientHeight, tabOverflow: tabs, wide, mainScrollX: m.scrollWidth > m.clientWidth, selected: document.querySelector('nav button[aria-selected=true]').dataset.id };
    });
    const ok = !r.hScroll && !r.vScroll && r.footerOneLine && !r.tabOverflow.length && !r.wide.length && !r.mainScrollX && !errs.length && r.selected === tab;
    if (!ok) bad++;
    console.log(`${ok ? '✓' : '✗'} ${w}px ${tab}`, ok ? '' : JSON.stringify({ ...r, errs }));
    if (w === 360 && tab === 'kamee') await p.screenshot({ path: OUT + '/screenshot-0.1-360.png' });
    if (w === 360 && tab === 'mensa') await p.screenshot({ path: OUT + '/screenshot-0.1-mensa.png' });
    await ctx.close();
  }
  await b.close();
  process.exitCode = bad ? 1 : 0;
})();
