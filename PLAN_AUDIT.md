# Plan audit Boxmag — 2026-11-02

Audit static pe tot repo-ul (backend, frontend, admin, deploy, teste) + rulare verificări,
urmat de reparații pe branch-ul `feat/vat-company-editable`.

Legendă: **✅ rezolvat** · **⏳ rămas** · **❓ decizie de business**

## Stare verificări (după reparații)

| Verificare | Înainte | Acum |
|---|---|---|
| Unit backend (Vitest) | 224/224 | 246/246 |
| Unit frontend (Vitest) | 59/59 | 65/65 |
| `tsc` backend / frontend | OK / eroare `.next` veche | OK / OK |
| ESLint frontend | 11 erori (41 după Next 16.4) | 0 erori, 58 warnings — rulează în CI |
| `npm audit` prod frontend | 1 critical, 7 high | 0 |
| `npm audit` prod backend | 1 critical, 9 high | 3 high + 1 moderate, toate din `minio@8.0.7` (ultima versiune) |
| Build Next 16.4.4 | — | OK |

---

## P0

1. ✅ Munca necomisă de pe branch: 4 commit-uri (securitate atașamente / B2B / rate limit, curs valutar, checkout, cypress).
2. ✅ Dependențe: Next 16.4.4, nodemailer 10, sharp 0.35, multer 2.5, express 5.3, vitest 4.1.12, playwright 1.64.
   ⏳ `minio` aduce `stream-json` / `decode-uri-component` vulnerabile; nu există versiune mai nouă. Afectează doar răspunsurile de la propriul MinIO.
3. ✅ Backup: `scripts/backup.sh` (mysqldump + tar MinIO, retenție), rulat automat de `deploy.sh` înainte de migrări. Restore descris în `deploy/PRODUCTION_CHECKLIST.md`.
   ⏳ De făcut pe server: cron zilnic + copie off-site (rclone/S3) + un test de restore.
4. ✅ Dezabonare newsletter: link semnat HMAC, header `List-Unsubscribe` one-click, pagina `/newsletter/unsubscribe`, migrarea 014.

## P1

5. ✅ Logout admin (`DELETE /api/admin/auth` + buton „Deconectare”).
6. ✅ Rate limit pe `/api/geocode` (60/15 min) și `/api/vat-lookup` (120/15 min).
7. ✅ Webhook Stripe: `paid` doar cu `payment_status = "paid"`; eșecurile nu mai retrogradează o comandă plătită.
8. ✅ Checkout-urile abandonate sunt ascunse implicit la admin și la client (toggle în admin).
9. ✅ Atașamentul orfan e șters din MinIO când insertul B2B pică.
   ⏳ Emailurile la comanda B2B se trimit tot sincron (răspunsul așteaptă SMTP-ul). Ar trebui o coadă.
10. ⏳ Sesiuni client revocabile (logout / reset parolă nu invalidează token-ul). Cere `session_version` + un query DB la fiecare request autentificat; amânat ca să nu rescriu acum zeci de teste cu mock-uri secvențiale.
11. ✅ `scrypt` async.
12. ⏳ CSP rămâne `Report-Only`. Trece pe enforce doar după ce verifici rapoartele din producție (Stripe, Google Maps, MinIO).
13. ✅ Token admin = HMAC-SHA256 (v3), vector de test comun FE/BE. Sesiunile admin existente trebuie relogate o dată.
    ✅ Bonus: login-ul admin numără doar eșecurile (succesul resetează contorul).

## P2

14. ✅ Paginare + căutare + filtre server-side: comenzi, mesaje, clienți, abonați.
15. ✅ `/admin/newsletter` cu export CSV.
16. ✅ `/admin/customers`.
17. ✅ `not-found.tsx`, `error.tsx`, `global-error.tsx`; produs inexistent → 404 real.
18. ✅ Linkurile Facebook/Instagram vin din `NEXT_PUBLIC_FACEBOOK_URL` / `NEXT_PUBLIC_INSTAGRAM_URL`, ascunse până le setezi.
    ⏳ Completează URL-urile reale în `.env` pe server și refă build-ul.
19. ❓ Admin multi-user / audit log.
20. ❓ Checkout cere mereu cod TVA (persoanele fizice nu pot cumpăra).
21. ❓ Plata online pentru comenzile B2B (acceptă oferta + Stripe).
22. ❓ Facturare / e-Factura.
23. ❓ Ștergere cont (GDPR): cheia `account.deleteAccount` există, funcția nu.

## P3

24. ✅ Lint 0 erori + lint și typecheck backend în CI. Regulile React Compiler (`set-state-in-effect`) sunt pe warning (33 de locuri, citiri de storage după mount).
    ⏳ Migrarea treptată a celor 33 de effect-uri.
25. ✅ Teste noi: e2e `password-reset`, `admin-messages`, `admin-customers-newsletter`, `newsletter-unsubscribe` (+404), logout în `admin-login`; unit `i18n-keys` (orice `t("…")` există în en/ro/de; a prins `forgotPassword.errorTitle` lipsă), plus teste backend pentru webhook, liste, CSV, dezabonare, HMAC.
26. ⏳ Fișierele mari (`account/page.tsx` 1768, `email.ts` 1500+, `checkout/page.tsx`, `orders.route.ts`, `order-summary/page.tsx`) rămân de spart.
27. ✅ `middleware.ts` → `proxy.ts`.
28. ✅ AGENTS.md + SOURCE_OF_TRUTH.md actualizate (`INV-NEWSLETTER-UNSUB`, `INV-ADMIN-LISTS`, extinderi la webhook / admin auth / rate limit).
29. ✅ `tsc` frontend curat după rebuild.

### Observații noi
- `/corrugated-envelopes` are text de marketing hardcodat în engleză (nu e tradus în ro/de). ⏳
- Secțiunea video de training de pe `/boxesfetco` e comentată în cod (AGENTS.md o menționează ca prezentă). ❓
