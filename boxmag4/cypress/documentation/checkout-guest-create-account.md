# Checkout guest → create account

**Spec:** `cypress/e2e/checkout-guest-create-account.cy.ts`  
**Helpers:** `cypress/support/checkout-guest-helpers.ts`  
**UI:** `/checkout` → `/checkout/success` → `/registration` → `/verify-email` → `/account#orders`  
**DB task:** `createPaidCheckoutOrder` (insert paid cart order + contact; Stripe redirect stubbed)

---

## Cum funcționează

| Pas | Efect |
|-----|--------|
| Guest pe `/checkout` | Cart seeded, form completat, VAT mock |
| Place order | Form body checked via intercept; order already seeded paid via `createPaidCheckoutOrder`; reply redirects to `/checkout/success?session_id=…` |
| Success | Poll session mockat `paid` → CTA **Create a free account** |
| Register + verify | Cont nou; `linkGuestOrdersToUser` leagă comanda de user |
| Account ORDERS | Comanda + produsul (`BOX-001` / Custom Box) vizibile |
| Admin Comenzi | Același orderNumber în listă + detaliu |

Nu trece prin Stripe UI. Persistarea comenzii + link-ul la cont sunt reale (backend + MySQL).

---

## Scenarii Cypress

1. Health check backend (`GET /api/health`) — skip dacă down
2. Guest place order (cart + form)
3. **CHECK:** success „Thank you”, order number, create-account CTA
4. Create account → registration email prefill `from=checkout` (email readonly; company readonly from VAT; other fields typed)
5. Register → ensure pending + `/verify-email?token=…`
6. Login `/account#orders`
7. **CHECK:** order în listă + detaliu (produs, qty, adresă, PAID)
8. Admin Comenzi + detaliu

---

## Selectori utili

```ts
cy.contains("button", "Place order")
cy.contains("a", "Create a free account")
cy.get("#reg-email")
cy.contains("a", orderNumber) // account ORDERS
cy.contains("BOX-001")
cy.contains("Custom Box 300x200")
```

---

## Rulare

```bash
cd boxmag4
CYPRESS_RESET_DB=false npx cypress run --spec cypress/e2e/checkout-guest-create-account.cy.ts --browser chrome
```

Frontend `:3006`, backend `:3005`, MySQL. Spec-ul rescrie `api.boxmag.eu` → backend local dacă e nevoie.
