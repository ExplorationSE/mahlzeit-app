# Hinweise zu Fremdbestandteilen

Der eigene Code von ExplorationSE Mahlzeit (in der App kurz „SE Mahlzeit“), © 2026 Stefan Eilers, steht unter der MIT-Lizenz (siehe [LICENSE](LICENSE)). Es werden keine Bibliotheken und keine Schriften über ein CDN nachgeladen; die App selbst hat keine Abhängigkeiten.

## Mitgelieferte Schriften

| Bestandteil | Datei | Lizenz | Hinweise |
|---|---|---|---|
| Schrift Marcellus, © 2012 Brian J. Bonislawsky DBA Astigmatic (AOETI) | `site/fonts/explorationse-mahlzeit.woff2` (Teilmenge mit den Zeichen von „ExplorationSE Mahlzeit“, für Titel und Fußzeile) | SIL Open Font License 1.1 | Lizenztext: `site/fonts/OFL.txt`; veränderte Fassung unter eigenem Namen „ExplorationSE Mahlzeit Subset“ (siehe `site/fonts/LIESMICH.txt`) |

Die App-Symbole (`site/icon.svg`, `site/icons/`) enthalten die Buchstaben „S.E.“ aus Marcellus als Vektorpfade (nach OFL zulässig, da eingebettete Grafik, keine Schriftdatei).

## Werkzeuge (nur zur Erstellung, nicht mitgeliefert)

| Werkzeug | Zweck | Lizenz |
|---|---|---|
| Poppler `pdftotext` | Text der PDF-Wochenkarte der Speisemanufaktur auslesen (im GitHub-Workflow installiert) | GPL-2.0-or-later (separates Programm, wird nur aufgerufen) |
| fontTools | Schrift-Teilmenge und Symbolpfade erzeugen | MIT |
| Playwright / Chromium | Symbole rendern, Layout testen | Apache 2.0 / BSD |

## Daten (nicht von der MIT-Lizenz erfasst)

Die Speisepläne sind Angaben der jeweiligen Betriebe. Sie werden werktags automatisch von den öffentlichen Seiten abgerufen, nur zur Information angezeigt und jeweils mit Link zur Quelle versehen. Alle Angaben ohne Gewähr; maßgeblich ist der Aushang vor Ort.

| Quelle | Inhalt |
|---|---|
| Kamee Caffè & Ess Bar, https://www.kamee-caffe.de/ | Wochenkarte |
| Speisemanufaktur Adlershof, https://speisemanufaktur-adlershof.de/wochenkarte | Wochenkarte (PDF) |
| Forum esswirtschaft, https://www.forum-esswirtschaft.de/wochenkarte/ | Wochenkarte |
| studierendenWERK BERLIN, Mensa HU Oase Adlershof, https://www.stw.berlin/ | Speiseplan, Preise, Kennzeichnungen und Allergene |
