# Ce mai e de facut - backlog proiect

Acest document listeaza lucrurile ramase de implementat/curatat, pe baza starii actuale din cod.

## Prioritate mare (P0/P1)

- [ ] Implementare autentificare reala pentru zona `account`, `registration` si admin (fara mock-uri locale).
- [ ] Protectie ruta admin (`/admin`) cu roluri/permisiuni.
- [ ] Aliniere link-uri legale:
  - inlocuire rute inexistente (`/terms`, `/privacy`) cu rutele existente (`/regulations`, `/privacy-policy`) sau crearea paginilor lipsa.
- [ ] Eliminare endpoint-uri de debug/ingest hardcodate pe localhost din codul de productie.
- [ ] Hardening configurare env (validari mai stricte si fail-fast pentru variabile critice SMTP/DB/MinIO).

## Prioritate medie (P2)

- [ ] Inlocuire date placeholder/mock in:
  - `boxmag4/app/registration/page.tsx`
  - `boxmag4/app/account/page.tsx`
  - `boxmag4/app/checkout/page.tsx`
  - `boxmag4/app/components/Shop2ProductsTable.tsx`
- [ ] Inlocuire imagini placeholder (`/placeholders/...`) cu asset-uri finale.
- [ ] Curatare `console.log` si cod comentat ramas in paginile principale/stores.
- [ ] Uniformizare UX intre fluxurile `shop`, `corrugated-envelopes`, `checkout`, `business`.
- [ ] Clarificare consistenta taxe (`TAX_PERCENT` vs `NEXT_PUBLIC_TAX_PERCENT`) si unde se aplica exact in UI/API.

## Prioritate medie spre mica (P2/P3)

- [ ] Documentare completa root `README.md` (setup, runbook, troubleshooting).
- [ ] Aliniere `boxmag-backend/README.md` cu porturile/configul real curent.
- [ ] Adaugare scripturi de bootstrap unificate pentru pornire simultana frontend + backend.
- [ ] Curatare fisiere runtime generate (`.next`, logs) si verificare `.gitignore`.

## Testing si calitate (important)

- [ ] Introducere testare automata:
  - unit tests pentru utilitare/stores/logic business;
  - integration tests pentru endpoint-uri backend (`orders`, `box-types`);
  - smoke/e2e pentru flux critic (business order + admin status update).
- [ ] Pipeline minim CI (lint + typecheck + build).
- [ ] Validare structurata request payload in frontend si backend (inclusiv mesaje de eroare coerente).

## Date si infrastructura

- [ ] Versionare/gestionare migrari DB (nu doar reset + seed).
- [ ] Politici backup/restore pentru MySQL si MinIO.
- [ ] Verificare CORS pentru medii multiple (dev/staging/prod).
- [ ] Revizuire politica bucket MinIO (public/private) in functie de cerinte reale.

## UX / business flow

- [ ] Definire clara flux client:
  - cand se foloseste `shop` vs `corrugated-envelopes` vs `business`;
  - ce date intra in comanda si ce vine din DB;
  - ce vede utilizatorul dupa submit.
- [ ] Confirmare comanda mai robusta (email de confirmare client + status tracking).
- [ ] Paginare/filtrare/sortare mai buna pentru liste mari de produse/comenzi.

## Nice-to-have

- [ ] i18n extins pentru toate paginile si mesajele de eroare.
- [ ] Dashboard admin cu metrici de baza (numar comenzi, status breakdown, trend).
- [ ] Audit log pentru actiuni admin critice.

## Plan pe sprinturi (propunere)

Presupunere: sprint de 2 saptamani, echipa mica (1-2 dev). Estimarile sunt orientative.

### Sprint 1 - Stabilizare critica si securitate (8-12 zile)

Obiectiv: eliminare riscuri majore de productie si inchidere gap-uri critice.

- [ ] Implementare autentificare reala pentru `account`, `registration`, `admin`.
- [ ] Protectie ruta `admin` cu roluri/permisiuni.
- [ ] Eliminare endpoint-uri de debug/ingest hardcodate.
- [ ] Fix link-uri legale rupte (`/terms`, `/privacy`) sau creare pagini lipsa.
- [ ] Hardening env config (validari stricte + fail-fast la pornire).

Livrabile:

- acces admin protejat si verificabil;
- fara endpoint-uri debug active in runtime normal;
- navigare fara 404 pe paginile legale.

Done criteria:

- `npm run build` frontend + backend fara erori;
- smoke manual: login/admin/basic flow functional;
- checklist security minim bifat (fara URL-uri hardcodate de debug).

### Sprint 2 - Stabilizare flux business si date reale (8-10 zile)

Obiectiv: tranzitie de la mock/placeholder la fluxuri reale, consistente.

- [ ] Inlocuire date mock in `registration`, `account`, `checkout`, `Shop2ProductsTable`.
- [ ] Inlocuire imagini placeholder cu asset-uri finale.
- [ ] Curatare `console.log` si cod comentat nefolosit.
- [ ] Uniformizare UX intre `shop`, `corrugated-envelopes`, `checkout`, `business`.
- [ ] Clarificare aplicare taxe in UI/API (`TAX_PERCENT` vs `NEXT_PUBLIC_TAX_PERCENT`).

Livrabile:

- fluxuri de comanda cu date coerente cap-coada;
- UI fara placeholdere evidente;
- comportament taxe clar si predictibil.

Done criteria:

- scenariu complet business order validat manual;
- scenariu shop/checkout validat manual;
- zero TODO-uri critice ramase in paginile client-facing.

### Sprint 3 - Testare, CI si infrastructura (8-12 zile)

Obiectiv: crestere incredere la livrare si reducere regresii.

- [ ] Unit tests pentru utilitare/stores/logic business.
- [ ] Integration tests backend pentru `orders` si `box-types`.
- [ ] Smoke/e2e pentru flux critic (business order + admin status update).
- [ ] Pipeline CI minim (lint + typecheck + build).
- [ ] Validare payload structurata in frontend/backend.

Livrabile:

- test suite minim rulabila local si in CI;
- feedback rapid la PR-uri (build + checks);
- erori API mai clare pentru client.

Done criteria:

- CI verde pe branch principal;
- acoperire minima pe zonele critice (chiar daca nu full coverage);
- documentat cum se ruleaza testele local.

### Sprint 4 - Documentatie, operare si polish (6-8 zile)

Obiectiv: pregatire pentru mentenanta si scalare controlata.

- [ ] Documentare completa `README.md` root si aliniere `boxmag-backend/README.md`.
- [ ] Scripturi de bootstrap unificate frontend+backend.
- [ ] Curatare `.gitignore` si artefacte runtime.
- [ ] Plan migrari DB (tooling + conventie).
- [ ] Politici backup/restore MySQL + MinIO.
- [ ] Verificare CORS pe medii multiple si revizuire policy bucket MinIO.

Livrabile:

- onboarding dev redus semnificativ;
- proceduri minime de operare si recuperare;
- setup mai robust pentru staging/prod.

Done criteria:

- un developer nou poate porni proiectul doar din documentatie;
- runbook minim pentru incidente de baza (DB/storage) disponibil.

## Backlog post-sprint (nice-to-have)

- [ ] i18n extins pentru toate paginile si mesajele de eroare.
- [ ] Dashboard admin cu metrici de baza.
- [ ] Audit log pentru actiuni admin critice.

## Milestone-uri recomandate

1. **M1 (dupa Sprint 1):** proiect sigur de demonstrat intern.
2. **M2 (dupa Sprint 2):** flux client stabil pentru pilot.
3. **M3 (dupa Sprint 3):** release process repetabil (CI + teste).
4. **M4 (dupa Sprint 4):** pregatit pentru onboarding si operare curenta.
