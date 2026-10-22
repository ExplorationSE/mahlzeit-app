# Änderungen

## 0.1 – 22.10.2026

Erste Fassung (nur lokal, noch nicht veröffentlicht).

- Reiter Kamee (vorausgewählt), Speisemanufaktur Adlershof, esswirtschaft, Mensa HU Oase; passt ohne seitliches Scrollen auf 320–412 px breite Bildschirme.
- Je Lokal: heutige Gerichte, Preise (soweit angegeben), Kennzeichnung vegetarisch/vegan (Mensa zusätzlich glutenfrei und Allergene), Wochenangebote, Öffnungszeiten, Adresse, Bezahlhinweis, Link zur Quelle und Stand der Daten.
- Freundlicher Hinweis an Wochenenden, Berliner Feiertagen oder wenn noch kein Plan vorliegt.
- `scripts/fetch-menus.mjs` holt alle vier Speisepläne (HTML, PDF, schema.org-Daten) und schreibt `site/data/*.json`; bei einem Fehler bleibt der letzte Stand erhalten.
- GitHub-Workflow: Abruf Mo–Fr gegen 09:30 und 10:45 Uhr (Berliner Zeit) und Veröffentlichung über GitHub Pages.
- Installierbar als Web-App (Manifest, Service Worker `mahlzeit-v1`, Daten immer zuerst aus dem Netz), Symbole „S.E.“ mit Teller und Besteck in Preußischblau.
