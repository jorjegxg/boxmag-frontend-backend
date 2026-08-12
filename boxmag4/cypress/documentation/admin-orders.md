# Admin — comenzi (listă + detalii)

**Spec:** `cypress/e2e/admin-orders.cy.ts`  
**UI listă:** `boxmag4/app/admin/orders/page.tsx` — `/admin/orders`  
**UI detalii:** `boxmag4/app/admin/orders/[id]/page.tsx`  
**Auth:** `cy.loginAdmin()` → cookie `boxmag-admin-session`

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| Visit `/admin/orders` | `GET /api/orders` + tabel paginat |
| Select status pe rând | `PATCH /api/orders/:id/status` |
| Click pe rând | Navigare la `/admin/orders/:id` |
| Stripe order | Badge „Plată Stripe”, fără select payment |
| Send offer | Form + `POST /api/orders/:id/send-offer` |

---

## Scenarii Cypress

### 1. Încarcă tabelul de comenzi

1. `cy.loginAdmin()`
2. Intercept `GET /api/orders` cu date mock
3. Visit `/admin/orders`
4. **CHECK:** titlu „Comenzi”, `ORD-0042`, client, tip cutie

### 1b. Link număr comandă → detaliu

1. Visit `/admin/orders`
2. Click `a` cu text `ORD-0042`
3. **CHECK:** pathname `/admin/orders/42`, „Detalii comandă”

### 2. Actualizează status din listă

1. Visit `/admin/orders`
2. În rândul `ORD-0042`, select „in progress”
3. **CHECK:** `PATCH` body `{ status: "in progress" }`

### 3. Detalii comandă + status

1. Visit `/admin/orders`, click pe rând
2. **CHECK:** pathname `/admin/orders/42`, „Detalii comandă”
3. Schimbă status la „completed”
4. **CHECK:** badge „Finalizată”

### 4. Stripe payment lock (INV-STRIPE-LOCK)

1. Visit `/admin/orders/42` with `stripeSessionId` set
2. **CHECK:** label „Plată Stripe”, no payment-status `<select>`

### 5. Send offer email

1. Mock B2B order (no cart items / unpaid) + `GET offer-senders` + `POST send-offer` 200
2. Click „Trimite email cu ofertă”
3. **CHECK:** POST succeeds + „Ofertă trimisă”

### 6. Send offer 404

1. Mock `POST send-offer` 404
2. Click send
3. **CHECK:** error message visible

---

## Selectori utili

```ts
cy.contains("tr", "ORD-0042")
cy.contains("Plată Stripe")
cy.contains("button", "Trimite email cu ofertă")
cy.contains("p", "Schimbă status").parent().find("select")
```

## Rulare

```bash
cd boxmag4
npx cypress run --spec cypress/e2e/admin-orders.cy.ts
```
