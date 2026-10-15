# lightweight – Test-Frontend für die nopCommerce Headless API

Schlankes E-Commerce-Frontend zum Testen der Headless API (`../API.md`, nopCommerce 4.90/5.00).

**Stack:** Vite · React 19 · TypeScript · React Router · TanStack Query · reines CSS (Hell/Dunkel)

## Start

```bash
npm install
npm run dev
```

Das Frontend läuft auf http://localhost:5173. Aufrufe an `/api/*` leitet der Vite-Dev-Server an
`API_TARGET` (Standard `http://localhost:5000`) weiter, daher ist im Plugin keine CORS-Freigabe nötig.
Einstellungen stehen in `.env` und lassen sich in `.env.local` überschreiben.

## Funktionen

- **Katalog:** Startseite, Kategorien, Hersteller, Händler, Tags, neue Produkte, Suche (inkl. erweiterter Suche
  und Autovervollständigung), Filter (Preis, Spezifikationen, Hersteller), Sortierung, Ansicht, Paging
- **Produktseite:** Bilder, Attribute aller Typen inkl. Bedingungen und Datei-Upload, Preisneuberechnung,
  Staffelpreise, Geschenkkarten, Miete, Preis nach Kundenwunsch, Versandschätzung, Bewertungen (inkl. Hilfreich-Votes),
  Verfügbarkeitsbenachrichtigung, Weiterempfehlen, ähnliche Produkte, gruppierte Produkte
- **Warenkorb:** Mengen, Bestellattribute, Gutscheine, Geschenkkarten, Versandschätzung mit Auswahl, Händlerauswahl, Summen, Mini-Warenkorb
- **Wunschliste** (inkl. mehrerer Listen, Teilen, E-Mail) und **Produktvergleich**
- **Checkout:** alle Schritte laut `nextStep` (Adressen, Abholung, Versand, Zahlung, Zahlungsdaten, Bestätigung), Abschlussseite
- **Konto:** Registrierung, Login/Logout, Passwort vergessen, Kundendaten, Adressen, Bestellungen (PDF, erneut bestellen,
  stornieren, Zahlung wiederholen), Sendungen, Retouren, Downloads, Bonuspunkte, Abos, Bewertungen, Avatar, DSGVO,
  Geschenkkarten-Guthaben, Händlerkonto, private Nachrichten
- **Inhalte:** SEO-URLs (`/{slug}`), Themenseiten, Blog, Sitemap, Kontakt, Händlerkontakt, Profile, Newsletter
- **Seiten für E-Mail-Links:** `/password-recovery`, `/account/activation`, `/account/email-revalidation`,
  `/newsletter/activation`, `/account/orders/{id}`, `/account/shipments/{id}`, `/checkout/completed/{id}`, `/cart`
- **API-Log** (Button unten links): alle Aufrufe mit Status, Dauer, Request- und Response-Body

Die Routen entsprechen den Storefront-URLs, damit Menü-, Sitemap- und E-Mail-Links aus der API direkt funktionieren.

## Struktur

- `src/api/client.ts` – fetch-Wrapper: Bearer-Token, automatisches Gast-Token, 401-Behandlung, Problem Details, Up-/Downloads, Request-Log
- `src/api/types.ts` – Modelle des Plugins und der Storefront
- `src/api/hooks.ts` – gemeinsame Queries (Layout, Kontext, Länder) und Cache-Aktualisierung
- `src/session.tsx` – Token-Status, Login/Logout
- `src/components/` – Layout, Formulare (Attribute, Adressen, Kundendaten), Produktlisten, UI-Bausteine
- `src/pages/` – Seiten nach Bereichen
