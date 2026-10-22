// Rendert site/icon.svg als PNG-Symbole (Android/Chrome: nur PNG, separate maskable-Dateien) und eine Vorschau
// Aufruf: node tools/render-icons.js [Vorschau.png]   (benötigt Playwright, Pfad ggf. anpassen)
const { chromium } = require('/workspace/shot/node_modules/playwright'); const fs = require('fs');
const V = 'v1', S = __dirname + '/../site/', D = S + 'icons/', PREVIEW = process.argv[2] || __dirname + '/../icon-preview.png';
const u = 'data:image/svg+xml;base64,' + fs.readFileSync(S + 'icon.svg').toString('base64');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' }); const p = await b.newPage();
  const render = async (size, scale, path) => {
    await p.setViewportSize({ width: size, height: size });
    const inner = Math.round(size * scale), off = Math.round((size - inner) / 2);
    await p.setContent(`<body style="margin:0;background:#000;width:${size}px;height:${size}px;overflow:hidden"><img src="${u}" style="position:absolute;left:${off}px;top:${off}px;width:${inner}px;height:${inner}px"></body>`);
    await p.waitForTimeout(80); await p.screenshot({ path });
  };
  for (const s of [48, 96, 144, 192, 512]) await render(s, 1, `${D}icon-${V}-${s}.png`);
  for (const s of [192, 512]) await render(s, 0.82, `${D}maskable-${V}-${s}.png`); // Rand für runde Masken
  await render(180, 1, `${D}apple-touch-icon-${V}.png`);
  for (const s of [16, 32]) await render(s, 1, `${D}favicon-${V}-${s}.png`);
  // Vorschau: normal, maskable mit Kreis- und Squircle-Maske, Startbildschirm-Größe, Favicons
  const img = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  await p.setViewportSize({ width: 1260, height: 420 });
  await p.setContent(`<body style="margin:0;background:#202124;font:14px system-ui;color:#bbb;display:flex;gap:28px;padding:30px;align-items:flex-start">
   <figure style="margin:0;text-align:center"><img src="${img(D+'icon-'+V+'-512.png')}" width="300"><figcaption>icon 512</figcaption></figure>
   <figure style="margin:0;text-align:center"><img src="${img(D+'maskable-'+V+'-512.png')}" width="300" style="border-radius:50%"><figcaption>maskable, Kreis</figcaption></figure>
   <figure style="margin:0;text-align:center"><img src="${img(D+'maskable-'+V+'-512.png')}" width="300" style="border-radius:28%"><figcaption>maskable, Squircle</figcaption></figure>
   <figure style="margin:0;text-align:center"><img src="${img(D+'maskable-'+V+'-192.png')}" width="64" style="border-radius:50%"><figcaption>64 px</figcaption><div style="font-size:12px;color:#ddd;margin-top:6px">SE Mahlzeit</div>
     <img src="${img(D+'icon-'+V+'-48.png')}" width="48" style="margin-top:18px"><figcaption>48 px</figcaption>
     <img src="${img(D+'favicon-'+V+'-32.png')}" width="32" style="margin-top:14px"> <img src="${img(D+'favicon-'+V+'-16.png')}" width="16"><figcaption>32 / 16 px</figcaption></figure>
  </body>`);
  await p.waitForTimeout(150); await p.screenshot({ path: PREVIEW });
  await b.close();
})();
