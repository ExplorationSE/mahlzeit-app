# Erzeugt site/icon.svg für „ExplorationSE Mahlzeit“ (Text als Pfade, keine Schriftabhängigkeit):
# „SE“ in Marcellus weiß, darunter dezent in Preußischblau Teller mit Gabel und Messer
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
FONT = '/usr/share/fonts/truetype/sand-box/google/Marcellus/Marcellus-Regular.ttf'
f = TTFont(FONT); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
def text_path(txt, size, cx, baseline, track=0):
    """Text als SVG-Pfad; waagerecht nach der tatsächlichen Glyphen-Umrandung zentriert (nicht nach Vorschubbreiten)."""
    s = size / upm; names = [cmap[ord(c)] for c in txt]
    def draw(pen, x0):
        x = x0
        for n in names:
            gs[n].draw(TransformPen(pen, (s, 0, 0, -s, x, baseline))); x += gs[n].width * s + track
    bp = BoundsPen(gs); draw(bp, 0); x0, y0, x1, y1 = bp.bounds
    pen = SVGPathPen(gs); draw(pen, cx - (x0 + x1) / 2)
    return pen.getCommands(), (y0, y1)
TXT, (ty0, ty1) = text_path('SE', 178, 256, 236, track=22)
print(f'Schrift: oben {ty0:.1f}, unten {ty1:.1f}')
cx, cy = 256, 330  # Tellermitte
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>
  <radialGradient id="glow" cx="50%" cy="60%" r="55%"><stop offset="0" stop-color="#001a2c" stop-opacity=".9"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="bl" x1="150" y1="0" x2="362" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#003153"/><stop offset=".55" stop-color="#14527c"/><stop offset="1" stop-color="#2a6f9f"/></linearGradient>
  <radialGradient id="plate" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#1f5f8b" stop-opacity=".30"/><stop offset="1" stop-color="#003153" stop-opacity=".05"/></radialGradient>
  <linearGradient id="tx" x1="0" y1="110" x2="0" y2="240" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9d3dc"/></linearGradient>
  <linearGradient id="rule" x1="150" y1="0" x2="362" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1f5f8b" stop-opacity="0"/><stop offset=".5" stop-color="#2a6f9f"/><stop offset="1" stop-color="#1f5f8b" stop-opacity="0"/></linearGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
</defs>
<rect width="512" height="512" fill="#000"/>
<rect width="512" height="512" fill="url(#glow)"/>
<path d="{TXT}" fill="url(#tx)"/>
<rect x="150" y="256" width="212" height="1.6" fill="url(#rule)"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 8)">
  <circle cx="{cx}" cy="{cy}" r="56" stroke="#1f5f8b" stroke-width="8" opacity=".28" filter="url(#soft)"/>
  <circle cx="{cx}" cy="{cy}" r="56" fill="url(#plate)" stroke="url(#bl)" stroke-width="3.6"/>
  <circle cx="{cx}" cy="{cy}" r="38" stroke="#14527c" stroke-width="1.8" opacity=".8"/>
  <!-- Gabel -->
  <path d="M168 280 V304 M178 280 V304 M188 280 V304 M168 304 Q168 316 178 316 Q188 316 188 304 M178 316 V384" stroke="url(#bl)" stroke-width="3.6"/>
  <!-- Messer -->
  <path d="M336 384 V280 Q352 292 350 330 L336 334" stroke="url(#bl)" stroke-width="3.6"/>
</g>
</svg>'''
open(__file__.replace('tools/make-icon.py', 'site/icon.svg'), 'w').write(svg)
print('site/icon.svg geschrieben')
