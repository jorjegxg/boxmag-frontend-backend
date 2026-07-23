# B2B guest integration

**Spec:** `cypress/e2e/b2b-guest-integration.cy.ts`  
**UI/State:** guest session (no `localStorage` auth), business configurator → order summary → success → admin Comenzi

## Cum funcționează

| Pas | Comportament |
|-----|----------------|
| Guest pe `/business` | Completează configuratorul, NEXT → `/order-summary` |
| Submit order summary | `POST /api/orders` → `201` + `emailsSent.notification` + `emailsSent.customerConfirmation` |
| Backend email | Notificare internă la `ORDERS_NOTIFICATION_TO` (ex. `info@` + `orders@`); confirmare client la emailul din formular |
| Success | `/business/order-success`, „No, thanks” → `/` |
| Admin | `/admin/orders` → rând Comenzi + detalii comandă |

## Scenarii Cypress

1. Health check backend (`GET /api/health`)
2. Plasează comandă B2B guest
3. **CHECK:** response `201` și `emailsSent.notification === true`
4. **CHECK:** response `emailsSent.customerConfirmation === true`
5. **CHECK:** log backend `order_notification_email_sent` pentru `orderId` include `orders@boxmag.eu`
6. Skip account („No, thanks”)
7. Login admin → tabel Comenzi + detalii
8. **MANUAL CHECK:** inbox `orders@` / `info@` + confirmare pe emailul guest

## Selectori utili

- Configurator: `#section-box-type-cards`, `#package-length`, `#boxes-quantity`
- Summary: `#os-email`, `#os-vatNumber`, button `NEXT`
- Success: `.font-mono.font-semibold.text-my-red` (order number)
- Admin: `tr` cu order number

## Rulare

```bash
cd boxmag4
CYPRESS_RESET_DB=false npx cypress run --spec cypress/e2e/b2b-guest-integration.cy.ts --browser chrome
```

Frontend pe `:3006`, backend pe `:3005`. Pentru a păstra datele existente, folosește `CYPRESS_RESET_DB=false`.

Dacă frontend-ul e build-uit cu `api.boxmag.eu`, spec-ul rescrie `https://api.boxmag.eu/api/**` → `http://localhost:3005` ca să treacă CORS și să folosească backend-ul local (inclusiv SMTP / `orders@`).
