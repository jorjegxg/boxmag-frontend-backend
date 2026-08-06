# Video prezentare Boxmag (Playwright, RO)

Script dedicat de **demo**, nu înlocuiește Cypress. Înregistrează un walkthrough UI în română.

## Ce acoperă

1. Home (hero RO + scroll)
2. Magazin `/shop` → PDP produs
3. Adaugă în coș → `/checkout` (formular guest; Stripe mock, fără plată reală)
4. Configurator B2B `/business` → `/order-summary`
5. Shell `/account`

API-urile sunt mock-uite — **backend opțional**. Frontend pe `:3006` e obligatoriu.

## Prereq

```bash
cd boxmag4
npm ci   # sau npm install
npx playwright install chromium

# într-un alt terminal:
npm run dev   # http://localhost:3006
```

## Rulare

```bash
cd boxmag4
npm run demo:video
```

Video:

- `demo-videos/boxmag-prezentare-ro.webm` (copie prietenoasă)
- detalii run: `demo-videos/run/` (gitignore)

Durata aproximativă: **4–6 minute** (`slowMo` ~450ms + pauze).

## MP4 (opțional)

Dacă ai `ffmpeg`:

```bash
ffmpeg -i demo-videos/boxmag-prezentare-ro.webm -c:v libx264 -pix_fmt yuv420p demo-videos/boxmag-prezentare-ro.mp4
```

## Note

- Limbă: cookie + localStorage `boxmag.language=ro`
- Fără admin, fără Stripe Checkout UI live
- Pentru alt host: `DEMO_BASE_URL=http://127.0.0.1:3006 npm run demo:video`
