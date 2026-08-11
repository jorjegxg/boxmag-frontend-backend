# Admin — metode de livrare

**Spec:** `cypress/e2e/admin-shipping-methods.cy.ts`  
**UI:** `boxmag4/app/admin/shipping-methods/page.tsx`

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| Visit pagină | `GET /api/shipping-methods?includeInactive=true` |
| Adaugă metodă | `POST /api/shipping-methods` |

---

## Scenarii Cypress

### 1. Tabel

1. `cy.loginAdmin()`, intercept GET, visit
2. **CHECK:** „Metode de livrare”; `input[value="standard"]` + `input[value="Standard Delivery"]` (key/name pe input value)

### 2. Creare

1. Completează câmpurile (placeholder-uri), click „Adaugă metodă de livrare”
2. **CHECK:** body POST `key`, `name`, `price`

---

## Selectori utili

- `cy.get('input[value="standard"]')` — key din rândul editat
- `cy.get('input[value="Standard Delivery"]')` — name din rândul editat
- `cy.get('input[placeholder="standard"]')` — formular creare

---

## Rulare

```bash
npx cypress run --spec cypress/e2e/admin-shipping-methods.cy.ts --browser chrome
```
