# Checkout B2C (Stripe)

**Spec:** `cypress/e2e/checkout.cy.ts`, `cypress/e2e/checkout-payment-result.cy.ts`, `cypress/e2e/checkout-guest-create-account.cy.ts`  
**UI:** `boxmag4/app/checkout/page.tsx`, `success/page.tsx`, `cancel/page.tsx`  
**State:** `boxmag.cart`, `boxmag.auth.*`, shipping cache `boxmag.checkout.shippingMethods.v2`  
**API:** `POST /api/payments/create-checkout-session`, `GET /api/payments/sessions/:id`, webhook `POST /api/payments/webhook`  
**Integration (account link):** see `checkout-guest-create-account.md`

---

## Cum funcționează

| Acțiune | Efect |
|--------|--------|
| Place order | `POST create-checkout-session` with `shipping.key` → server resolves catalog tier `300` + shipping method price + `TAX_PERCENT` → order `payment_status=pending` → redirect Stripe |
| Stripe pay OK | Webhook `checkout.session.completed` marks paid; success page poll is read-only |
| First mark paid | `markOrderPaidBySession` (webhook only) → SMTP confirmation + internal notification emails |
| Success paid (logged-in) | UI "Thank you", order number, View my orders + Continue shopping, cart cleared |
| Success paid (guest) | UI "Thank you" + create-account card (CTA → `/registration?from=checkout&email=…`), no View my orders |
| Success unpaid | UI "Payment is still pending", cart kept |
| Cancel | Cart preserved |

**Emails:** frontend never sends mail. Backend only after payment flips pending→paid via webhook. Needs SMTP (`EMAIL_ORDERS_*` / `SMTP_*`) + webhook delivery.

**Local webhook:** Stripe Dashboard cannot reach `localhost`. Run:

```bash
stripe listen --forward-to localhost:3005/api/payments/webhook
```

Put printed `whsec_…` into root `.env` as `STRIPE_WEBHOOK_SECRET`, restart backend.

`GET /api/payments/sessions/:id` returns only `paymentStatus`, `customerEmail`, and `order.id` / `orderNumber` — no contact PII, no paid-mark side effects.

**Account orders:** listed by contact email (`GET /api/orders?email=`). Checkout email must match login email.

---

## Scenarii Cypress

### checkout.cy.ts

1. Empty cart → **CHECK:** `Cart is empty.`
2. Guest no email → **CHECK:** email required
3. Invalid / missing VAT → **CHECK:** format / required errors
4. VAT lookup → **CHECK:** `#checkout-companyName` = company from mock
5. Shipping express / own / standard → **CHECK:** totals `€ 1552.50` / `€ 1512.50` / `€ 1537.50`
6. Guest + logged-in place order → **CHECK:** `create-checkout-session` body (email, address, VAT, `shipping.key` / name / price)
7. API 500 → **CHECK:** error message
8. Slow submit → **CHECK:** button disabled

### checkout-payment-result.cy.ts

1. Paid session (logged-in) → **CHECK:** thank you, order number, email, links `/account#orders` + `/shop`; no create-account CTA
2. Paid session (guest) → **CHECK:** create-account card; CTA href includes `from=checkout`, email prefill only, `returnTo=/account#orders`; no View my orders
3. Guest skip → **CHECK:** navigates to `/shop`
4. Guest checkout → success → Create account → Register → **CHECK:** email locked from poll; other fields filled manually; register body matches; success modal `returnTo=/account#orders`
5. Paid session → **CHECK:** cart localStorage emptied
6. Unpaid session → **CHECK:** pending copy; cart kept
7. Session API fail / missing `session_id` → **CHECK:** error UI
8. Cancel → **CHECK:** links to checkout + boxesfetco

### checkout-guest-create-account.cy.ts

Full guest buy → create account → verify → login → order+product on account (and admin). Stripe stubbed via `createPaidCheckoutOrder`. Details: `checkout-guest-create-account.md`.

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
npx cypress run --spec "cypress/e2e/checkout.cy.ts,cypress/e2e/checkout-payment-result.cy.ts,cypress/e2e/checkout-guest-create-account.cy.ts"
```
