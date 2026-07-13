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
- [x] Property detail page: create/edit/delete Units under a Property
- [x] Setup → Units (`/admin/setup/units`) — portfolio-wide unit list
      (property, beds/baths, sqft, market rent, occupied/vacant status,
      edit/delete), with an Add Unit form that includes a Property
      picker. Added because Units previously had no top-level nav entry
      and were only reachable by drilling into a specific Property first.
- [x] Setup → Leases (`/admin/setup/leases`) — portfolio-wide lease list
      (property, unit, tenant(s), status, dates, rent, deposit, balance
      owed), Property + Status filters, Add Lease form with a Unit
      picker. Same discoverability fix as Units — leases were only
      reachable via Property → Unit → tenant-name link. Correctly shows
      full lease *history* per unit (e.g. an Ended lease alongside the
      unit's current Active one), not just current occupancy.
      Dashboard's Units count card now links here too.
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
- [x] Chart of Accounts management UI — `/admin/setup/chart-of-accounts`,
      list/create/edit/delete. 4 starter accounts still seeded in
      `prisma/seed.ts` (1000 Operating Cash, 1500 Rent Receivable, 4000
      Rental Income, 4100 Other Income); Rent charges credit 4000, every
      other charge type credits 4100 — still no per-charge-type GL
      *mapping* UI (that's a bigger feature: letting each LeaseCharge
      type choose its own income account, not just Rent-vs-everything-else).
- [x] Bank Accounts setup — `/admin/setup/bank-accounts`. Schema fix:
      `BankAccount.glNumber` (a loose string) became `glAccountId` (a
      real FK to `ChartOfAccount`, same pattern as `TransactionLine`).
      Property picker, Asset-type GL Account picker.
- [x] Bank account selection on payments — `recordPayment()` now requires
      a `bankAccountId` and debits that account's real `glAccountId`
      instead of a hardcoded GL number. Record Payment form has a
      "Deposit To" picker scoped to the lease's property.
- [x] Bank Reconciliation (simple/manual) —
      `/admin/setup/bank-accounts/[id]/reconcile`: checkboxes toggle each
      `TransactionLine.cleared` (auto-saves), statement date/balance
      entered client-side (not persisted), shows cleared balance vs.
      statement balance difference. No statement import or
      auto-matching — that's a separate, bigger feature if ever needed.
- [x] Income Statement & Balance Sheet — `/admin/reports/income-statement`,
      `/admin/reports/balance-sheet`. Property filter (or consolidated),
      grouped by `ChartOfAccount`/glType, NOI = Income − Expense on the
      Income Statement, normal-balance-sign Assets/Liabilities/Equity on
      the Balance Sheet. Expense/Liability/Equity sections correctly
      render empty (with an explanatory note) since nothing posts to
      those account types yet — no AP/vendor-bill engine exists.
- [x] Work Orders UI — `/admin/ops/work-orders` (new `admin/ops/` route
      prefix). Property + optional Unit picker, priority, status
      (Open → Assigned → InProgress → Completed, `completedAt`
      auto-stamped/cleared on transition), optional assigned Vendor.
      Needed a minimal Vendor setup page first (`/admin/setup/vendors`:
      name, trade, email, phone, COI expiration with an expired-badge,
      W-9 on file) since Work Orders reference Vendor.
- [ ] Period-close protection — no `closedThrough`-style field exists on
      Organization/Property yet (HOA app's `assertPeriodOpen` has no
      equivalent here).
- [ ] Rent Roll "Balance" column — natural follow-up now that charges/
      payments exist; not added yet.
- [ ] Prepaid credit / overpayment handling — still rejected outright,
      no liability account for it yet.

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

## Phase 1 status

All of the design brief's Phase 1 MVP checklist is now built (see items
above) except: period-close protection and prepaid-credit/overpayment
handling (both deliberately deferred, tracked above), and Rent Roll's
balance column. Phase 2/3 (below) is unstarted. Next natural step is
probably AP/vendor-bill posting, since that's what would populate the
Expense side of the Income Statement and give Work Orders a cost.

## Test data currently in the DB

Sample Property ("Maple Ridge Apartments (Renamed)") with Units 101/102,
an Owner ("Riverside Capital LLC"), Tenants (including "Jane A. Doe"),
two Leases with posted Rent charges ($1,650 + $1,400) and partial
payments ($1,000 + $200 against Unit 101's original lease), a Bank
Account ("Operating Checking"), a Vendor ("Acme Plumbing", COI
intentionally expired to test the badge), and a Work Order — all
created during end-to-end verification across this app's build passes.
Safe to delete once real data entry starts.
