# B2B order email notification

**Spec:** `cypress/e2e/b2b-order-email-notification.cy.ts`  
**UI/State:** none (API-only against local backend)

## Cum funcționează

| Pas | Comportament |
|-----|----------------|
| `POST /api/orders` | Creează comandă B2B pe backend-ul local |
| Răspuns | `201` + `emailsSent.notification` + `emailsSent.customerConfirmation` |
| Log backend | `order_notification_email_sent` trebuie să includă `orders@boxmag.eu` |

## Scenarii Cypress

1. Health check backend
2. **CHECK:** `POST /api/orders` → `201`
3. **CHECK:** `emailsSent.notification === true`
4. **CHECK:** `emailsSent.customerConfirmation === true`
5. **CHECK:** log `order_notification_email_sent` pentru `orderId` conține `orders@boxmag.eu`
   - Soft-skip când containerul `boxmag4-backend` lipsește (host-run pe Windows); assert-ul API `emailsSent.notification` rămâne obligatoriu
   - Pe Linux/CI cu Docker: `docker logs` sau socket `/var/run/docker.sock`; pe Windows Desktop încearcă și named pipe `\\.\pipe\docker_engine`
6. **MANUAL CHECK:** Inbox/Spam `orders@` / `info@`

## Rulare

```bash
cd boxmag4
CYPRESS_RESET_DB=false npx cypress run --spec cypress/e2e/b2b-order-email-notification.cy.ts --browser chrome
```

Sau via Docker (recomandat pe acest VPS):

```bash
docker run --rm --network host \
  -v /opt/boxmag-frontend-backend:/opt/boxmag-frontend-backend \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -w /opt/boxmag-frontend-backend/boxmag4 \
  -e CYPRESS_RESET_DB=false \
  cypress/included:15.15.0 \
  --spec cypress/e2e/b2b-order-email-notification.cy.ts --browser electron
```
