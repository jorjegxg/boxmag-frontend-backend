# Monedă EUR / RON

**Spec:** `cypress/e2e/currency-eur-ron.cy.ts`  
**UI:** TopBar `Selector` — `boxmag4/app/global/components/top-bar.tsx`  
**State:** `boxmag.currency` (localStorage) via `CurrencyProvider`  
**Format:** `€ X.XX` / `X.XX lei` — `boxmag4/lib/format-price.ts`

Viewport ≥ `lg` (TopBar selectors `max-md:hidden`). Cypress default: 1280×800.

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| TopBar select EUR / RON | `setCurrency` → localStorage `boxmag.currency` = `eur` \| `ron` |
| Mount `CurrencyProvider` | `GET /api/exchange-rate/eur-ron` (refresh 1h) |
| RON + rate OK | preț EUR × rate → afișare `X.XX lei` |
| RON + rate lipsă / eșec | rămâne suma EUR numerică, dar suffix `lei` (fallback grațios) |
| Checkout Place order | body Stripe include `currency: "eur"` \| `"ron"` |

---

## Scenarii Cypress

### 1. Switch TopBar → RON (shop, PDP, checkout)

1. Mock `GET **/api/exchange-rate/eur-ron` cu `rate: 5`
2. Mock catalog shop/PDP (preț `withTax: 11.9`)
3. Visit `/shop` cu moneda EUR
4. **CHECK:** `from € 11.90` (EN default `shop.priceFrom`; limba default = en)
5. Select `RON`
6. **CHECK:** `from 59.50 lei` (11.9 × 5)
7. Visit PDP `/products/standard?itemNo=STD-001`
8. **CHECK:** preț brut RON (`5950.00 lei` = 11.9 × 100 × 5)
9. Visit checkout (guest, cart seed `unitPrice: 12.5`, qty 100)
10. **CHECK:** subtotal RON (`6250.00 lei` = 1250 × 5)

### 2. Apel API curs de schimb

1. Intercept `**/api/exchange-rate/eur-ron`
2. Visit `/`
3. **CHECK:** request-ul e făcut (alias `@getExchangeRate`)
4. Switch RON → prețurile folosesc `rate` din mock

### 3. Eșec API curs (fallback)

1. Intercept rate → `500` / `ok: false`
2. Switch TopBar → `RON`
3. **CHECK:** UI rămâne pe RON; sumele numerice EUR cu suffix `lei` (ex. `€ 11.90` → `11.90 lei` pe shop)

### 4. Persist după reload

1. Switch TopBar → `RON`
2. **CHECK:** `localStorage boxmag.currency = ron`
3. Reload
4. **CHECK:** selector = `RON`; prețuri tot `lei`

### 5. Checkout trimite `currency: ron`

1. Set RON + cart seed + logged-in profile mock (VAT/company) + adresă salvată
2. **CHECK:** profile seeds `#checkout-vatNumber` / `#checkout-companyName` (fără re-type / `@vatLookup`)
3. Place order (mock `create-checkout-session`)
4. **CHECK:** `req.body.currency === "ron"` și `req.body.shipping.key === "standard"`

---

## Selectori utili

```ts
cy.contains("span", /Currency|Monedă|Währung/i).parent().find("select")
```

Opțiuni: `EUR` | `RON` (uppercase în `<select>`).

Storage: `boxmag.currency` = `eur` | `ron` (lowercase).

---

## Rulare

```bash
cd boxmag4
npx cypress run --spec cypress/e2e/currency-eur-ron.cy.ts
```

Frontend pe `:3006`. Backend pe `:3005` (sau mock full pe exchange-rate). Spec-ul mock-uiește rate + catalog — nu depinde de date DB reale.
