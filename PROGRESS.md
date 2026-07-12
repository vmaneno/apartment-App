# Progress

Tracks status against the Phase 1 MVP checklist from the design brief
(`https://claude.ai/code/artifact/f96b5727-cbfc-430a-b7c7-4abb35214cab`,
section 6). Update this file whenever a checklist item lands, so a new
session can pick up without re-reading the whole brief or plan.

## Infra

- [x] New repo at `C:/Users/12145/Desktop/apartment-App`
- [x] Shares the HOA app's Supabase Postgres project, isolated in its own
      `apartment_pm` schema (verified: 20 tables in `apartment_pm`, HOA
      app's `public` schema untouched)
- [x] Fresh, distinct `JWT_SECRET` (not shared with the HOA app)
- [ ] Dedicated Supabase project (deferred — see plan notes on how to
      split off later via `pg_dump --schema=apartment_pm`)
- [x] GitHub repo created / pushed — https://github.com/vmaneno/apartment-App
- [ ] Vercel deployment

## Phase 1 — MVP (design brief §6)

- [x] Full Phase 1 Prisma schema: Organization, User, Owner, Property,
      PropertyOwner, ManagementAgreement, Unit, Tenant, Lease, LeaseTenant,
      LeaseCharge, Payment, PaymentApplication, Vendor, WorkOrder,
      BankAccount, ChartOfAccount, Transaction, TransactionLine
- [x] Session auth (cookie + bcrypt, mirrors the HOA app's pattern —
      no OTP/2FA yet, that's a later add)
- [x] Seed script (`npm run seed`) — one Organization + one admin User
- [x] Authenticated shell (Sidebar + admin layout)
- [x] Setup → Properties: create/list Property, auto-creates a default
      "Self (default)" Owner + 100% PropertyOwner row per the brief's
      "model Owner/PropertyOwner from day one" guidance
- [x] Property detail page: create/list Units under a Property
- [x] Owner setup UI (Setup → Owners: create/list/edit/delete; Property
      detail page shows current PropertyOwner rows and a form to
      assign/reassign an owner + ownership %, upserting on
      `[propertyId, ownerId]`)
- [x] Tenant setup UI (Setup → Tenants: create/list/edit/delete, Name/Email
      filters, showing each tenant's active lease if any)
- [x] Property edit/delete
- [x] Delete = deactivate everywhere (`active: false`), not a hard
      delete — Property/Owner/Tenant can all have related records
      (Units, PropertyOwner rows, lease history) that must survive
- [x] Lease creation (Unit detail page: lease history table + Add Lease
      form with a tenant multi-select for co-tenants via `LeaseTenant`).
      Guards against two `Active` leases on the same unit at once (409).
- [x] Edit Lease (status/dates/rent/deposit) — this is also how a lease
      gets ended (set Status to Ended). Tenants on a lease can't be
      edited in place; that's what Move Tenant is for.
- [x] Move Tenant — Tenants page row action: ends the tenant's current
      Active lease and creates a new one on a different unit in one
      transaction, carrying over every tenant on the old lease (moves
      the whole household on that lease, not just the one clicked).
      No partial-household transfer UI (do that manually: end the old
      lease, create a new one for just the tenant who's moving).
- [x] Rent roll view — `/admin/reports/rent-roll`: every active unit with
      occupancy status, tenant(s), actual vs. market rent, lease dates;
      summary cards (units/occupied/vacant/occupancy %/total rent);
      Property + Occupied/Vacant filters. First page under a new
      `admin/reports/` area — later reports (Income Statement, AR aging,
      etc.) should land there too.
- [x] Recurring charges (LeaseCharge) posting — `/admin/ar/post-rent`:
      bulk-select Active leases, post Rent (each lease's own rentAmount)
      or another charge type (Pet Rent/Parking/Late Fee/Other, one shared
      amount across all selected). Also a single-lease "Post Charge" form
      on the Lease detail page for one-off/ad-hoc charges.
- [x] Payment recording (Payment + PaymentApplication) — "Record Payment"
      on the Lease detail page, FIFO-allocated across outstanding charges.
      Overpayment (more than the lease's outstanding balance) is rejected
      with a clear error — no prepaid-credit account exists yet.
- [x] Accounting engine (`src/lib/accounting.ts`): `postLeaseCharge` and
      `recordPayment`, full double-entry to `Transaction`/`TransactionLine`,
      `propertyId`-tagged (same technique as USHoa-App's `fund` tagging).
      Verified end-to-end: DR/CR balance to zero, correct `propertyId`,
      partial payment + overpayment rejection both behave correctly.
- [x] Chart of Accounts — **seeded only, no setup UI yet**. 4 starter
      accounts per organization (1000 Operating Cash, 1500 Rent
      Receivable, 4000 Rental Income, 4100 Other Income) in
      `prisma/seed.ts`. Rent charges credit 4000; every other charge type
      credits 4100 — no per-type GL mapping UI. A real COA management
      page (add/edit accounts, choose GL per charge type) is still open.
- [ ] Bank account selection on payments — currently always posts to the
      single seeded 1000 Operating Cash account; needs Bank Accounts setup
      (below) before a payment can target a specific bank.
- [ ] Period-close protection — no `closedThrough`-style field exists on
      Organization/Property yet (HOA app's `assertPeriodOpen` has no
      equivalent here).
- [ ] Rent Roll "Balance" column — natural follow-up now that charges/
      payments exist; not added this pass.
- [ ] Income Statement & Balance Sheet, per property
- [ ] Bank accounts setup + basic reconciliation
- [ ] Work order tracking UI (schema exists, no pages yet)

## Phase 2 / Phase 3 (design brief §6)

Not started — security-deposit trust accounting, management-fee P&L,
owner statements/distributions, vendor 1099s, budgeting, document
storage, tenant self-service portal, RUBS, inspections, preventive
maintenance, applicant screening. Schema for `Budget`, `Document`,
`Inspection` intentionally not created yet.

## Known gotcha for future sessions

`@prisma/adapter-pg` does **not** honor a `?schema=` query param on the
connection string the way Prisma's native engine does — it must be passed
explicitly as the adapter's second constructor argument:
`new PrismaPg({ connectionString }, { schema })`. Both `src/lib/db.ts` and
`prisma/seed.ts` already do this correctly; replicate it in any other
script that connects directly (e.g. a future one-off migration/backfill
script) or it will silently read/write `public.*` instead of
`apartment_pm.*`.

## Test data currently in the DB

Sample Property ("Maple Ridge Apartments") + Unit 101, an Owner
("Riverside Capital LLC", assigned 60% on that property), a Tenant
("Jane Doe"), and an Active Lease on Unit 101 for that tenant — all
created during end-to-end verification. Safe to delete once real data
entry starts.
