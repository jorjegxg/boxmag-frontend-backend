# Checkout B2C (Stripe)

**Spec:** `cypress/e2e/checkout.cy.ts`, `cypress/e2e/checkout-payment-result.cy.ts`  
**UI:** `boxmag4/app/checkout/page.tsx`, `success/page.tsx`, `cancel/page.tsx`  
**State:** `boxmag.cart`, `boxmag.auth.*`, shipping cache `boxmag.checkout.shippingMethods.v2`  
**API:** `POST /api/payments/create-checkout-session`, `GET /api/payments/sessions/:id`, webhook `POST /api/payments/webhook`

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| Place order | `POST create-checkout-session` → order `payment_status=pending` + contact email → redirect Stripe |
| Stripe pay OK | Webhook `checkout.session.completed` **sau** success page poll `GET sessions/:id` |
| First mark paid | `markOrderPaidBySession` → SMTP confirmation + internal notification emails |
| Success paid | UI "Thank you", cart cleared |
| Success unpaid | UI "Payment is still pending", cart kept |
| Cancel | Cart preserved |

**Emails:** frontend never sends mail. Backend only after payment flips pending→paid. Needs SMTP (`EMAIL_ORDERS_*` / `SMTP_*`) + either webhook delivery or success-page poll.

**Local webhook:** Stripe Dashboard cannot reach `localhost`. Run:

```bash
stripe listen --forward-to localhost:3005/api/payments/webhook
```

Put printed `whsec_…` into root `.env` as `STRIPE_WEBHOOK_SECRET`, restart backend.

If you always open `/checkout/success?session_id=…` after pay, poll path still marks paid + sends emails even without webhook.

**Account orders:** listed by contact email (`GET /api/orders?email=`). Checkout email must match login email.

---

## Scenarii Cypress

### checkout.cy.ts

1. Empty cart → **CHECK:** `Cart is empty.`
2. Guest no email → **CHECK:** email required
3. Invalid / missing VAT → **CHECK:** format / required errors
4. VAT lookup → **CHECK:** `#checkout-companyName` = company from mock
5. Shipping express / own / standard → **CHECK:** totals `€ 1552.50` / `€ 1512.50` / `€ 1537.50`
6. Guest + logged-in place order → **CHECK:** `create-checkout-session` body (email, address, VAT, shipping)
7. API 500 → **CHECK:** error message
8. Slow submit → **CHECK:** button disabled

### checkout-payment-result.cy.ts

1. Paid session → **CHECK:** thank you, order number, customer email, link `/account`
2. Paid session → **CHECK:** cart localStorage emptied
3. Unpaid session → **CHECK:** pending copy; cart kept
4. Session API fail / missing `session_id` → **CHECK:** error UI
5. Cancel → **CHECK:** links to checkout + boxesfetco

---

## Selectori utili

```ts
cy.get("#checkout-vatNumber")
cy.get("#checkout-companyName")
cy.contains("button", "Place order")
cy.contains("Standard Delivery") // shipping method card
cy.contains("Express Delivery")
cy.contains("Own transport")
```

Helpers: `cy.visitCheckoutLoggedIn`, `cy.visitCheckoutLoggedOut`, `cy.mockCheckoutApis`.

---

## Rulare

```bash
cd boxmag4
npx cypress run --spec "cypress/e2e/checkout.cy.ts,cypress/e2e/checkout-payment-result.cy.ts"
```
