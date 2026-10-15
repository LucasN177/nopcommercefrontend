# nopCommerce Headless Frontend

Test-Frontends für das Headless-API-Plugin (`Misc.HeadlessApi`) von nopCommerce. Das Plugin stellt die Funktionen des nopCommerce-Storefronts als JSON-API bereit; die Frontends in diesem Repository nutzen diese API, um sie in einem echten Shop-Ablauf zu testen.

## Inhalt des Repositorys

| Pfad | Beschreibung |
|---|---|
| [`API.md`](API.md) | Dokumentation der Headless API: Anmeldung mit Tokens, Fehlerformat, Konventionen, typische Abläufe, alle Endpunkte und die Modelle des Plugins |
| [`lightweight/`](lightweight/) | Schlankes E-Commerce-Test-Frontend mit Vite, React und TypeScript |

## lightweight

Ein vollständiger Shop auf Basis der Headless API, ohne UI-Bibliothek und mit möglichst wenig Abhängigkeiten.

**Stack:** [Vite](https://vite.dev) · [React 19](https://react.dev) · TypeScript · [React Router](https://reactrouter.com) · [TanStack Query](https://tanstack.com/query) · reines CSS mit Hell- und Dunkelmodus

### Voraussetzungen

- Node.js 20.19+ oder 22.12+
- Ein nopCommerce-Shop mit aktiviertem Headless-API-Plugin (*Konfiguration → Lokale Plugins → Headless API*), standardmäßig unter `http://localhost:5000`

### Schnellstart

```bash
cd lightweight
npm install
npm run dev
```

Das Frontend läuft danach auf http://localhost:5173.

Der Vite-Dev-Server leitet alle Aufrufe an `/api/*` an den Shop weiter. Deshalb muss im Plugin keine CORS-Herkunft (*Allowed origins*) eingetragen werden.

### Konfiguration

Die Werte stehen in `lightweight/.env`. Eigene Werte gehören in `lightweight/.env.local`; diese Datei wird nicht eingecheckt.

| Variable | Standard | Bedeutung |
|---|---|---|
| `API_TARGET` | `http://localhost:5000` | Ziel des Dev-Proxys, also der nopCommerce-Shop |
| `VITE_API_BASE` | `/api/headless/v1` | Basispfad der API aus Sicht des Browsers |
| `VITE_STORE_URL` | `http://localhost:5000` | Storefront-URL, um relative Bild- und Download-URLs der API aufzulösen |

### Skripte

| Befehl | Beschreibung |
|---|---|
| `npm run dev` | Dev-Server mit Hot Reload und API-Proxy |
| `npm run build` | Typprüfung und Produktions-Build nach `dist/` |
| `npm run preview` | Vorschau des Produktions-Builds |
| `npm run lint` | Linting mit oxlint |

### Funktionen

- **Katalog:** Startseite, Kategorien, Hersteller, Händler, Produkt-Tags, neue Produkte, zuletzt angesehene Produkte, Suche mit erweiterter Suche und Autovervollständigung, Filter nach Preis, Spezifikationen und Herstellern, Sortierung, Ansicht und Paging
- **Produktseite:** Bildergalerie, Produktattribute aller Typen inklusive Bedingungen und Datei-Upload, Neuberechnung von Preis, SKU und Lagerbestand, Staffelpreise, Geschenkkarten, Mietprodukte, Preis nach Kundenwunsch, Versandkostenschätzung, Bewertungen mit Hilfreich-Abstimmung, Benachrichtigung bei Verfügbarkeit, Weiterempfehlen per E-Mail, ähnliche und gruppierte Produkte
- **Warenkorb:** Mengen ändern, Bestellattribute, Gutscheine, Geschenkkarten, Versandschätzung mit Auswahl der Versandart, Händlerauswahl, Summen und Mini-Warenkorb im Header
- **Wunschliste und Vergleich:** mehrere Wunschlisten, Teilen per Link oder E-Mail, Übernahme in den Warenkorb, Produktvergleich mit Spezifikationen
- **Checkout:** One-Page-Checkout nach dem `nextStep` der API mit Rechnungs- und Lieferadresse, Abholung im Geschäft, Versandart, Zahlungsart, Zahlungsdaten und Bestätigung sowie die Abschlussseite
- **Kundenkonto:** Registrierung, Login und Logout, Passwort vergessen, Kundendaten, Adressen, Bestellungen (PDF-Rechnung, erneut bestellen, stornieren, Zahlung wiederholen), Sendungen, Retouren, Downloads, Bonuspunkte, Abonnements, eigene Bewertungen, Avatar, DSGVO-Werkzeuge, Geschenkkarten-Guthaben, Händlerkonto und private Nachrichten
- **Inhalte:** SEO-URLs (`/{slug}`), Themenseiten, Blog mit Tags, Archiv und Kommentaren, Sitemap, Kontaktformular, Händlerkontakt, öffentliche Profile und Newsletter
- **Kontext:** Auswahl von Sprache, Währung und Steueranzeige
- **API-Log:** Der Button unten links listet alle API-Aufrufe der Sitzung mit Status, Dauer, Request- und Response-Body

### URLs

Die Routen entsprechen den URLs des nopCommerce-Storefronts. Links aus Menüs, der Sitemap und den Antworten der API funktionieren dadurch ohne Umschreiben.

Für Links in den nopCommerce-E-Mails kann das Frontend in der Plugin-Konfiguration (Bereich *Frontend*) als Frontend-URL eingetragen werden. Die Standard-Pfadvorlagen des Plugins werden unterstützt:

| Seite | Pfad |
|---|---|
| Passwort zurücksetzen | `/password-recovery?token={token}&guid={guid}` |
| Kontoaktivierung | `/account/activation?token={token}&guid={guid}` |
| E-Mail-Bestätigung | `/account/email-revalidation?token={token}&guid={guid}` |
| Newsletter-Bestätigung | `/newsletter/activation?token={token}&active={active}` |
| Bestelldetails | `/account/orders/{orderId}` |
| Sendungsdetails | `/account/shipments/{shipmentId}` |
| Produktseite | `/{seName}` |
| Bestellung abgeschlossen | `/checkout/completed/{orderId}` |
| Warenkorb | `/cart` |

### Anmeldung und Tokens

Das Frontend arbeitet wie in [`API.md`](API.md#anmeldung-mit-tokens) beschrieben:

1. Beim ersten Aufruf holt es ein Gast-Token (`POST /auth/guest`) und speichert es im `localStorage`.
2. Login, Registrierung und Passwortänderung ersetzen das Token durch das neue Token aus der Antwort.
3. Antwortet die API mit `401`, holt das Frontend automatisch ein neues Gast-Token und wiederholt den Aufruf.
4. Beim Wechsel des Kunden werden alle geladenen Daten neu abgerufen.

### Projektstruktur

```text
lightweight/
├── src/
│   ├── api/
│   │   ├── client.ts      # fetch-Wrapper: Tokens, Fehler (Problem Details), Up- und Downloads, Request-Log
│   │   ├── hooks.ts       # gemeinsame Queries (Layout, Kontext, Länder) und Cache-Aktualisierung
│   │   └── types.ts       # Modelle des Plugins und der Storefront
│   ├── components/        # Layout, Formulare (Attribute, Adressen, Kundendaten), Produktlisten, UI-Bausteine
│   ├── pages/             # Seiten nach Bereichen (Katalog, Produkt, Warenkorb, Checkout, Konto, ...)
│   ├── session.tsx        # Token-Status, Login und Logout
│   ├── App.tsx            # Routen
│   └── index.css          # Styles
├── .env                   # Standardkonfiguration
└── vite.config.ts         # Dev-Server und API-Proxy
```

### Bekannte Einschränkungen

Einige Einschränkungen ergeben sich aus der API (siehe [`API.md`](API.md#einschränkungen)):

- Kein CAPTCHA, keine Zwei-Faktor-Anmeldung und keine SMS-Bestätigung.
- Zahlungsarten, die ein Formular per POST an den Anbieter senden, funktionieren nicht.
- Die Felder der Zahlungsdaten sind in der API nicht beschrieben. Das Frontend bietet deshalb einen freien Feld/Wert-Editor an, für `Payments.Manual` mit vorbelegten Feldnamen.
- `GET /account/addresses` liefert kein leeres Adressformular mit den Feldeinstellungen des Shops. Neue Adressen im Kundenkonto verwenden deshalb die nopCommerce-Standardeinstellungen; Abweichungen meldet erst der Server beim Speichern.
- Für Funktionen, die im Shop deaktiviert sind, zeigt das Frontend die Fehlermeldung der API an.
