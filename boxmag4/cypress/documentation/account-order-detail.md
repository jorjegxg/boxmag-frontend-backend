# Cont — detaliu comandă + reorder

**Spec:** `cypress/e2e/account-order-detail.cy.ts`  
**UI:** `boxmag4/app/account/orders/[orderNumber]/page.tsx`

---

## Scenarii Cypress

### 1. Reorder în coș

1. Login localStorage + intercept `GET /api/orders/77`
2. Visit `/account/orders/77`
3. Click „Add this order to cart”
4. **CHECK:** `localStorage` `boxmag.cart` conține `STD-001` qty 200

### 2. Attachment + soft auth

1. Mock order cu `hasAttachment` + link download
2. **CHECK:** href conține `/attachment`
3. Mock `GET` 401
4. **CHECK:** mesaj eroare vizibil

---

## Rulare

```bash
npx cypress run --spec cypress/e2e/account-order-detail.cy.ts
```
