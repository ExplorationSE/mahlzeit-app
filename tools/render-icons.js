// Rendert site/icon.svg als PNG-Symbole (Android/Chrome: nur PNG, separate maskable-Dateien) und eine Vorschau
// Aufruf: node tools/render-icons.js [Vorschau.png]   (benötigt Playwright, Pfad ggf. anpassen)
const { chromium } = require('/workspace/shot/node_modules/playwright'); const fs = require('fs');
const V = 'v2', S = __dirname + '/../site/', D = S + 'icons/', PREVIEW = process.argv[2] || __dirname + '/../icon-preview.png';
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
  // Vorschau: groß, Android rund/maskable, echte Größen 96/64/48 (direkt aus dem SVG gerendert), Favicons
  const img = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const tmp = require('os').tmpdir() + '/mahlzeit-icon-';
  for (const s of [96, 64, 48]) { await render(s, 1, `${tmp}${s}.png`); await render(s, 0.82, `${tmp}m${s}.png`); }
  const cap = 'font-size:13px;color:#bbb;margin-top:6px';
  const small = (s, round) => `<figure style="margin:0;text-align:center"><img src="${img(tmp + (round ? 'm' : '') + s + '.png')}" width="${s}" height="${s}" style="${round ? 'border-radius:50%' : ''}"><figcaption style="${cap}">${s} px${round ? ' rund' : ''}</figcaption></figure>`;
  await p.setViewportSize({ width: 1240, height: 470 });
  await p.setContent(`<body style="margin:0;background:#202124;font:14px system-ui;color:#bbb;display:flex;gap:30px;padding:30px;align-items:flex-start">
   <figure style="margin:0;text-align:center"><img src="${img(D+'icon-'+V+'-512.png')}" width="360"><figcaption style="${cap}">Symbol (512 px, verkleinert)</figcaption></figure>
   <div style="display:flex;flex-direction:column;gap:22px;align-items:center">
     <figure style="margin:0;text-align:center"><img src="${img(D+'maskable-'+V+'-512.png')}" width="200" style="border-radius:50%"><figcaption style="${cap}">Android rund (maskable)</figcaption></figure>
     <figure style="margin:0;text-align:center"><img src="${img(D+'maskable-'+V+'-512.png')}" width="140" style="border-radius:30%"><figcaption style="${cap}">Android Squircle (maskable)</figcaption></figure>
   </div>
   <div style="display:grid;grid-template-columns:repeat(3,auto);gap:18px 26px;align-items:end;justify-items:center">
     ${small(96)}${small(64)}${small(48)}${small(96, true)}${small(64, true)}${small(48, true)}
     <figure style="margin:0;text-align:center;grid-column:1/-1"><div style="background:#2d3a4a;padding:14px 22px;border-radius:14px;display:inline-flex;gap:22px">
       <div style="text-align:center"><img src="${img(tmp+'m64.png')}" width="56" style="border-radius:50%"><div style="font-size:12px;color:#eee;margin-top:4px">SE Mahlzeit</div></div>
       <div style="text-align:center"><img src="${img(D+'apple-touch-icon-'+V+'.png')}" width="56" style="border-radius:13px"><div style="font-size:12px;color:#eee;margin-top:4px">iPhone</div></div>
       <div style="text-align:center;padding-top:18px"><img src="${img(D+'favicon-'+V+'-32.png')}" width="32"> <img src="${img(D+'favicon-'+V+'-16.png')}" width="16"><div style="font-size:12px;color:#eee;margin-top:6px">Favicon 32/16</div></div>
     </div><figcaption style="${cap}">Startbildschirm</figcaption></figure>
   </div>
  </body>`);
  await p.waitForTimeout(150); await p.screenshot({ path: PREVIEW });
  await b.close();
})();
