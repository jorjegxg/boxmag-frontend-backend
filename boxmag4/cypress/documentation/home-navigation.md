# Home navigation (`HeroSizeSection`)

**Spec:** `cypress/e2e/home-navigation.cy.ts`  
**UI:** `/` — `HeroSizeSection` în `boxmag4/app/page.tsx`; target `/business` inputs `#package-length|width|height`  
**State:** `boxmag.language=en`; CTA query `length` / `width` / `height`

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| Default selects | length/width/height = `400` |
| Schimbare select | CTA `href` actualizează query params |
| Click GET STARTED | navigare `/business?length=&width=&height=` |
| `/business` citește query | `#package-*` pre-completează din URL |

---

## Scenarii Cypress

### 1. Hero: titlu, selects, CTA

1. `cy.visit("/")` cu `boxmag.language=en`
2. **CHECK:** `h1` E-commerce shipping; Length / Width / Height
3. **CHECK:** 3 `select` = `400`
4. **CHECK:** GET STARTED `href` include `/business`, `length=400`, `width=400`, `height=400`

### 2. Selects actualizează href

1. Select 600 / 500 / 300
2. **CHECK:** CTA `href` include acele valori

### 3. CTA default → inputs pe /business

1. Click `a[href^="/business?"]`
2. **CHECK:** URL `/business?length=400&width=400&height=400`
3. **CHECK:** `#package-length|width|height` = `400`

### 4. CTA custom → inputs pe /business

1. Select 800 / 200 / 1000; click GET STARTED
2. **CHECK:** URL cu acele query params
3. **CHECK:** `#package-length=800`, `#package-width=200`, `#package-height=1000`

### 5. Secțiuni home

1. **CHECK:** hero, shipping, eco, testimonials, services copy

### 6. CTA links shop / business / contact

1. Mock `GET **/api/box-types`
2. **CHECK:** shop menu, `/business`, `/business?`, `/contact`

### 7. Newsletter

1. Mock `POST **/api/newsletter/subscribe`
2. **CHECK:** body email/consent/source; success message
3. Fără consent → eroare accept consent

---

## Selectori utili

```ts
cy.contains("h1", /E-commerce shipping/i)
  .closest("section")
  .find("select");
cy.contains("a", /GET STARTED/i);
cy.get('a[href^="/business?"]');
cy.get("#package-length");
cy.get("#package-width");
cy.get("#package-height");
```

---

## Rulare

```bash
cd boxmag4 && npx cypress run --spec cypress/e2e/home-navigation.cy.ts
```
