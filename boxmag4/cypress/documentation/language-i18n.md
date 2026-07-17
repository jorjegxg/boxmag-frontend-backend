# Limbă i18n (EN / RO / DE)

**Spec:** `cypress/e2e/language-i18n.cy.ts`  
**UI:** TopBar `Selector` — `boxmag4/app/global/components/top-bar.tsx`  
**State:** `boxmag.language` (localStorage + cookie) via `LanguageProvider`

Viewport ≥ `lg` (TopBar selectors `max-md:hidden`). Cypress default: 1280×800.

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| TopBar select EN / RO / DE | `setLanguage` → localStorage + cookie + `document.documentElement.lang` |
| URL `/ro/...` sau `/de/...` | Middleware redirect fără prefix + Set-Cookie `boxmag.language` |
| Alte rute | Middleware **păstrează** cookie-ul existent; setează `en` doar dacă lipsește / invalid |

Client citește cookie la mount (prioritate față de localStorage), ca redirect-urile `/ro` `/de` să aplice limba.

---

## Scenarii Cypress

### 1. Switch TopBar → RO

1. Visit `/` cu limba EN
2. Select `RO` în selectorul lângă label Language / Limba / Sprache
3. **CHECK:** footer RO (`Informații magazin`, `Compania noastră`)
4. **CHECK:** `localStorage` + cookie = `ro`
5. Visit checkout (guest, cart seed)
6. **CHECK:** stringuri checkout RO (`Coș de cumpărături` / `Sumar comandă`)

### 2. Prefix `/ro/about`

1. Visit `/ro/about`
2. **CHECK:** pathname `/about`
3. **CHECK:** cookie `boxmag.language=ro`
4. **CHECK:** heading / text `Despre noi`; selector = `RO`

### 3. Prefix `/de/shop`

1. Visit `/de/shop` (API box-types mock ok)
2. **CHECK:** pathname `/shop`
3. **CHECK:** cookie `de`
4. **CHECK:** UI DE (`Verpackungen für E-Commerce` / `BoxFix Produkte` / `Sprache`); selector = `DE`

### 4. Persist după reload

1. Switch TopBar → `DE`
2. Reload
3. **CHECK:** tot DE (selector, footer, storage, cookie)

---

## Selectori utili

```ts
cy.contains("span", /Language|Limba|Sprache/i).parent().find("select")
```

Opțiuni: `EN` | `RO` | `DE` (uppercase în `<select>`).

---

## Rulare

```bash
cd boxmag4
npx cypress run --spec cypress/e2e/language-i18n.cy.ts
```

Frontend pe `:3006`. DB reset la start (ca restul suitei) — acest spec nu depinde de date DB.
