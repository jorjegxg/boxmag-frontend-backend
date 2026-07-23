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

---

## Scenarii Cypress

### 1. Încarcă tabelul de comenzi

1. `cy.loginAdmin()`
2. Intercept `GET /api/orders` cu date mock
3. Visit `/admin/orders`
4. **CHECK:** titlu „Comenzi”, `ORD-0042`, client, tip cutie

### 2. Actualizează status din listă

1. Visit `/admin/orders`
2. În rândul `ORD-0042`, select „in progress”
3. **CHECK:** `PATCH` body `{ status: "in progress" }`

### 3. Detalii comandă + status

1. Visit `/admin/orders`, click pe rând
2. **CHECK:** pathname `/admin/orders/42`, „Detalii comandă”
3. Schimbă status la „completed”
4. **CHECK:** badge „Finalizată”

---

## Selectori utili

```ts
cy.visit("/admin/orders")
cy.contains("tr", "ORD-0042")
cy.contains("tr", "ORD-0042").find("select")
cy.contains("p", "Schimbă status").parent().find("select")
```

---

## Rulare

```bash
cd boxmag4
npx cypress run --spec cypress/e2e/admin-orders.cy.ts
```
