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
- [ ] Owner setup UI (real owner creation/editing — currently only the
      auto-created default owner exists; PropertyOwner % editing UI)
- [ ] Tenant setup + Lease creation (Lease, LeaseTenant)
- [ ] Rent roll view
- [ ] Recurring charges (LeaseCharge) posting
- [ ] Payment recording (Payment + PaymentApplication)
- [ ] Chart of Accounts setup UI
- [ ] Accounting engine functions (adapt `postAssessment`-style
      double-entry helpers from USHoa-App's `src/lib/accounting.ts` for
      Transaction/TransactionLine — propertyId-tagged instead of
      fund-tagged)
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

One sample Property ("Maple Ridge Apartments") + one Unit (101), created
during end-to-end verification of the login → property → unit flow.
Safe to delete once real data entry starts.
