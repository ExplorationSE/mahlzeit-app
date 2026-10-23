# ExplorationSE Mahlzeit

Mobile Web-App (PWA) mit den heutigen Mittagsangeboten in Berlin-Adlershof, kurz „SE Mahlzeit“.
Geplante Adresse: https://explorationse.github.io/mahlzeit-app/

| Reiter | Quelle | Format |
|---|---|---|
| **Speisemanufaktur** Adlershof (vorausgewählt) | https://speisemanufaktur-adlershof.de/wochenkarte | PDF-Wochenkarte, Link wird jede Woche neu auf der Seite gesucht |
| **Kamee** | https://www.kamee-caffe.de/ | HTML, Wochenkarte auf der Startseite (keine Preise; nur Barzahlung) |
| **Esswirtschaft** | https://www.forum-Esswirtschaft.de/wochenkarte/ | HTML-Tabelle (keine Preise) |
| **Mensa HU Oase** | https://www.stw.berlin/mensen/einrichtungen/humboldt-universit%C3%A4t-zu-berlin/mensa-hu-oase-adlershof.html | strukturierte Daten (schema.org/Menu) mit rund zwei Wochen Vorschau, Preise für Studierende / Beschäftigte / Gäste |

## So funktioniert es

- `scripts/fetch-menus.mjs` (Node 20, keine npm-Pakete; für das PDF wird `pdftotext` aus poppler-utils gebraucht) holt die vier Pläne, zerlegt sie nach Wochentagen und schreibt `site/data/<lokal>.json` sowie `site/data/status.json`.
  Schlägt eine Quelle fehl, bleibt ihr letzter Stand erhalten (lokal oder von der veröffentlichten Seite) und wird als „Aktualisierung fehlgeschlagen“ markiert.
- Die Seite (`site/`) liest nur diese JSON-Dateien und wählt den heutigen Tag nach Berliner Zeit. Wochenenden und Berliner Feiertage werden in der App berechnet.
- `.github/workflows/pages.yml` ruft die Pläne Mo–Fr gegen 09:30 und 10:45 Uhr (Berliner Zeit, Sommer- und Winterzeit), zusätzlich früh morgens und sonntags ab und veröffentlicht `site/` über GitHub Pages. Die Daten werden nicht ins Repository geschrieben.
- Service Worker (Cache `mahlzeit-v1`): Speisepläne immer zuerst aus dem Netz, offline der letzte Stand.

## Lokal ausprobieren

```sh
node scripts/fetch-menus.mjs            # alle Quellen (einzeln: node scripts/fetch-menus.mjs mensa)
mkdir -p /tmp/srv && ln -sfn "$PWD/site" /tmp/srv/mahlzeit-app
cd /tmp/srv && python3 -m http.server 8765
# http://localhost:8765/mahlzeit-app/            (anderer Tag: ?datum=2026-10-22, Reiter: #mensa)
node tools/test-layout.js                    # Layout-Test 320/360/412 px, erzeugt die Bildschirmfotos
```

Symbole neu erzeugen: `python3 tools/make-icon.py && node tools/render-icons.js icon-preview.png`.

## Veröffentlichen (noch nicht geschehen)

1. Öffentliches Repository `ExplorationSE/mahlzeit-app` anlegen und diesen Stand nach `main` pushen.
2. Unter *Settings → Pages* als Quelle „GitHub Actions“ wählen; der erste Lauf startet mit dem Push.
3. Hinweis: GitHub pausiert zeitgesteuerte Workflows nach 60 Tagen ohne Aktivität im Repository.

## Hinweise

Alle Angaben ohne Gewähr; maßgeblich ist der Aushang vor Ort. Kennzeichnungen (vegetarisch, vegan …) werden so übernommen, wie die Quelle sie angibt.
Lizenz: MIT (eigener Code, siehe [LICENSE](LICENSE)); Fremdbestandteile und Datenquellen: [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
