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
- [x] AP / vendor-bill posting — `VendorInvoice`, `VendorPayment`,
      `VendorPaymentApplication` models, directly mirroring the AR
      shape (`LeaseCharge`/`Payment`/`PaymentApplication`).
      `postVendorInvoice()` (DR the chosen Expense GL / CR `2000
      Accounts Payable`, seeded as a Liability account) and
      `recordVendorPayment()` (FIFO across a vendor's outstanding
      invoices oldest-first, DR AP / CR the paying BankAccount's GL,
      same overpayment-rejection boundary as `recordPayment`) in
      `src/lib/accounting.ts`. UI: Vendor detail page
      (`/admin/setup/vendors/[id]`, new — Vendors was previously list-only)
      with balance cards + Enter Invoice / Record Payment forms, plus a
      top-level `/admin/ap/invoices` list with a Vendor picker (added
      proactively, same discoverability lesson as Units/Leases). Income
      Statement's Expense section and Balance Sheet's Liabilities section
      now render real data instead of their "nothing posts here yet" notes.
      A vendor payment spanning invoices across more than one property
      tags the AP GL line with whichever property carries the largest
      share of that payment (per-property Balance Sheet has no natural
      home for a split AP line otherwise).
- [x] Period-close protection — see Phase 2 checklist below (implemented
      there; this line was stale).
- [x] Rent Roll "Balance" column — `/admin/reports/rent-roll` now includes
      each occupied unit's active lease `leaseCharges`/`payments` and shows
      the same `totalCharged − totalPaid` balance as the Leases page
      (amber if owed, normal color if zero/credit), plus a "Balance Owed"
      summary card (sum across rows). Vacant units show `—`. Verified via
      curl against the running dev server with the seeded admin session:
      existing test data renders Unit 101 at $450.00 owed (amber) and Unit
      102 at -$20.00 (its prepaid-credit test data, not flagged amber since
      it's not owed), summing to a $430.00 Balance Owed card.
- [x] Prepaid credit / overpayment handling — see Phase 2 checklist below
      (implemented there; this line was stale).
- [x] Vendor 1099 report — `/admin/reports/1099s`: Year selector (defaults
      to current year, last 5 years offered), sums each active vendor's
      `VendorPayment.amount` within that calendar year, flags vendors
      meeting the $600 threshold and cross-references `Vendor.w9OnFile`
      (red "No" badge if a reportable vendor has no W-9 on file, plus a
      banner). Summary cards: paid-vendor count, threshold-meeting count,
      missing-W-9 count, total paid. Deliberately no TIN/address fields or
      actual form generation — `Vendor` has no such fields yet, this is a
      bookkeeping aid to identify who needs a 1099, not a filing tool.
      Verified via curl against the running dev server: 2026 correctly
      shows Acme Plumbing at $600.00 (Yes/Yes), 2025 correctly shows the
      empty state.

## Phase 2 (design brief §6) — in progress

- [x] Security-deposit trust accounting — `SecurityDeposit` model (one row
      per lease, updated on return rather than an append-only ledger, since
      a deposit only has a collect and a return event).
      `collectSecurityDeposit()` (DR the chosen `SecurityDepositTrust`
      bank account's GL / CR a new `2200 Security Deposits Held` Liability
      account) and `returnSecurityDeposit()` (DR 2200 for the full original
      amount, CR the trust account for the tenant's portion, CR `4100
      Other Income` for any retained portion — rejects if the two portions
      don't sum to the original amount) in `src/lib/accounting.ts`. UI: a
      "Security Deposit" section on the Lease detail page with Collect/
      Return actions. Known simplification: a retained portion is
      recognized as income but the cash itself is left sitting in the
      trust bank account's balance — there's no bank-to-bank transfer
      mechanic in this app, so nothing physically "moves" it to Operating.
- [x] Owner Statements — `/admin/reports/owner-statements`, an Owner
      picker + date range (same UTC-safe range pattern as Income
      Statement) showing each of the owner's properties' Income/Expense/
      NOI for the period × their `PropertyOwner.ownershipPercent`, plus a
      total.
- [x] Management fee — minimal "Management Fee %" control on the Property
      detail page, upserting the long-dormant `ManagementAgreement` model
      (only `feePercent` is exposed; `leasingFeeAmount`/`effectiveDate`/
      `endDate` stay unused). Owner Statement now has a `Mgmt Fee` column
      (`income × feePercent / 100`) and nets it out before applying
      ownership %: `Net to Owner = (NOI − fee) × ownershipPercent / 100`.
- [x] Owner distributions — `OwnerDistribution` model (one row per payout).
      `recordOwnerDistribution()` (DR `3000 Owner Distributions` Equity /
      CR the chosen bank account's GL) in `src/lib/accounting.ts`. Lives as
      a per-property "Record Distribution" action directly on the Owner
      Statement page (not a new Owner detail page — cash leaves a specific
      property's account, so the action sits next to that property's Net
      to Owner figure), pre-filled with `share − already distributed`, plus
      a Distributed column.
- [x] Prepaid credit / overpayment handling — `recordPayment()` and
      `recordVendorPayment()` no longer reject overpayment. The excess
      posts to a new `2300 Prepaid Rent` (Liability, AR) or `1700 Vendor
      Credit` (Asset, AP) account instead of `1500`/`2000`. No new models
      needed for tracking credit — a payment's *unapplied* amount
      (`payment.amount − sum(paymentApplications.appliedAmount)`) already
      **is** the available credit. `getLeaseCredit`/`getVendorCredit` sum
      that; `applyLeaseCredit`/`applyVendorCredit` create **new
      `PaymentApplication`/`VendorPaymentApplication` rows against the
      existing payment** (no new Payment, no bank account touched — the
      cash already arrived at overpayment time) and post `DR 2300/CR 1500`
      or `DR 2000/CR 1700`. Deliberately requires an explicit "Apply
      Credit" action on the Lease/Vendor detail page — nothing auto-applies.
- [x] Period-close protection — `Organization.closedThrough` (one date for
      the whole org, not per-property). `assertPeriodOpen()` in
      `src/lib/accounting.ts` is the first line of every posting function
      (charges, payments, invoices, deposits, distributions, credit
      applications) and throws if the transaction date is on or before
      `closedThrough`. Admin-only UI at `/admin/setup/organization`
      (`session.role !== 'admin'` is checked both client-side, for the
      inline "Admins only" message, and server-side in the PATCH route —
      never trust the client-side gate alone).
- [x] Vendor 1099 report — see Phase 1 checklist above (built alongside
      Phase 2 items even though listed under Phase 1 in the design brief).
- [x] Budgeting — new `Budget` model (one row per
      `propertyId`/`glAccountId`/`year`/`month`, unique on that 4-tuple).
      Setup UI: `/admin/setup/budget` (Property + Year picker, a
      spreadsheet-style grid — Income/Expense GL accounts × 12 month
      columns, editable, bulk-saved via `POST /api/setup/budget` which
      upserts every cell in one `$transaction`). Report:
      `/admin/reports/budget-vs-actual` (Property-or-consolidated + Year +
      "through month" picker, defaults to YTD for the current year and
      full-year for past years) sums `Budget` rows and actual
      `TransactionLine` activity per GL account over the same range, same
      Income/Expense grouping and signed-amount convention as the Income
      Statement, with a Budget-vs-Actual NOI line. No budget-vs-actual
      variance alerting/notifications — just the report. Verified via curl
      against the running dev server: saved a real budget (Rental Income
      $1,600×2 + Repairs $200×2 for Jan/Feb 2026 on Maple Ridge), confirmed
      the grid reloads with those values pre-filled, and confirmed the
      report shows Budget $3,200/$400 (Income/Expense), Actual $0 (no GL
      postings for those accounts/months), Budget NOI $2,800.00.
- [x] Document storage — new `Document` model, file content stored inline
      as `Bytes` (Postgres row storage), not an object-storage bucket — no
      Supabase Storage credentials exist in `.env` (only
      `DATABASE_URL`/`DIRECT_URL`), so this avoids new infra while staying
      deployable. 8MB/file cap enforced in the API. Every entity link
      (`propertyId`/`unitId`/`leaseId`/`tenantId`/`vendorId`) is optional
      and independently validated server-side against the caller's
      `organizationId` before the row is created — without that check a
      caller could attach (and later read, since the download route only
      filters on `organizationId`) a document under another org's
      lease/tenant/vendor id, an IDOR risk given how many FK-shaped form
      fields this endpoint accepts. `POST /api/documents` (multipart
      upload), `GET`/`DELETE /api/documents/[id]` (both org-scoped).
      Top-level UI at `/admin/documents` (upload form with an optional
      "Attach To" entity-type + entity picker, list with category filter,
      download-by-click, delete). Also embedded directly on the Lease
      detail page (`UploadDocumentForm`'s `presetLink` prop locks the
      link to that lease) as the one proof-of-integration point — other
      entity detail pages (Property/Unit/Tenant/Vendor) don't have an
      inline widget yet, but can still receive documents via the
      top-level page's picker. Verified via curl against the running dev
      server: uploaded an unlinked doc and a lease-linked doc, confirmed
      byte-exact download, confirmed the lease-linked doc renders on both
      the Lease detail page and the top-level list (correctly resolving
      to "Lease — Jane A. Doe"), confirmed both an invalid category and a
      nonexistent `leaseId` are rejected (400/404), then deleted both test
      uploads via the delete API (no document left in the test-data set,
      unlike other features' seeded samples).
- [x] RUBS (Ratio Utility Billing) — `/admin/ar/rubs`: Property picker,
      total utility bill amount, allocation method (by square footage /
      by bedrooms / equal split), date, live client-side preview of each
      active lease's share, posts on submit. No new model or ledger
      logic — reuses `postLeaseCharge()` per lease with `chargeType:
      'RUBS'` (posts to `4100 Other Income` like every non-Rent charge
      type already does). New `src/lib/rubs.ts` holds the pure
      allocation math (`rubsWeight`/`allocateRubs`), shared by the
      client preview and the server route so they never disagree — but
      **the server always recomputes from `propertyId`/`method`/
      `totalAmount`**, never trusts client-submitted per-lease amounts
      (same money-safety posture as every other posting endpoint in this
      app). Rounding: proportional shares are rounded to the cent and
      the last positive-weight lease absorbs any remainder, so the sum
      always equals the entered bill exactly — verified by posting
      $101.01 equal-split across 2 leases and confirming Income
      Statement's `4100 Other Income` moved by exactly $101.01, not
      $101.00/$101.02. "By Square Footage" correctly refuses to post
      (400, clear error) when any active unit on the property has no
      `sqft` set — verified against the test data (Unit 102 has no
      sqft) rather than silently treating it as a 0-sqft (and thus
      0-share) unit.
- [x] Inspections — new `Inspection` model (Move-In/Move-Out/Routine/Turn,
      Scheduled → Completed/Cancelled, `completedDate` auto-stamped/
      cleared on transition — same pattern as `WorkOrder.completedAt`).
      UI at `/admin/ops/inspections` is a near-exact copy of the Work
      Orders page/form/row-actions (Property + optional Unit picker,
      inline edit modal, delete-with-confirm). `Document` gained an
      optional `inspectionId` link (photos/condition reports attach to
      an inspection the same way a signed lease attaches to a `Lease`).
      **Bug caught during verification, not shipped**: `inspectionId` was
      added to the `Document` schema but the upload route's `LINK_FIELDS`
      list and ownership-validation `Promise.all` weren't updated to
      include it, so the field was silently dropped — a document
      uploaded with `inspectionId` set would save with a `null` link and
      no error. Caught by literally uploading a test doc with
      `inspectionId` and checking the list page rendered "—" instead of
      the inspection instead of just trusting the 201 response. Fixed in
      `src/app/api/documents/route.ts` (added to `LINK_FIELDS` + the
      validation array) and `src/app/admin/documents/page.tsx` (added
      the `inspection` include + `linkedTo` resolution branch), then
      re-verified the same upload now resolves to "Inspection — Maple
      Ridge Apartments (Renamed) Unit 102 (Move-In)". Also confirmed a
      nonexistent `inspectionId` is rejected (404), matching the other
      link fields. `UploadDocumentForm`'s "Attach To" dropdown now
      offers Inspection alongside the other five entity types.
- [x] Applicant screening — new `Applicant` model (Applied → Screening →
      Approved/Denied/Withdrawn, manually staff-set — no integration with
      a background-check/credit provider, since this app has no
      credentials for one). UI at `/admin/leasing/applicants` (new
      `admin/leasing/` route prefix), same list/form/row-actions/filters
      shape as Leases (Property + Status filters) and Work Orders/
      Inspections (Property + optional Unit picker, inline edit modal).
      `Document` gained an optional `applicantId` link (ID scans,
      screening reports). This time the link was wired into
      `LINK_LOOKUPS` correctly on the first try — refactored
      `src/app/api/documents/route.ts` from three separately-maintained
      places (a field list, a hardcoded `Promise.all`, a hardcoded
      `if`-condition) to one `Record<string, (id, orgId) => Promise>`
      config, specifically because the Inspection bug above showed that
      three-places-in-sync pattern breaks silently. Verified via curl:
      created an applicant, transitioned it to Screening, uploaded a
      document with `applicantId` set and confirmed the Documents list
      resolved it to "Applicant — Alex Rivera" without a second bug this
      time, and confirmed a nonexistent `applicantId` is rejected (404).
      No "convert Applicant to Tenant/Lease" automation — approving an
      applicant still means manually creating the Tenant and Lease
      records separately, same as today.
- [x] Tenant self-service portal — a second, parallel auth system
      alongside the staff `User`/`session` one:
      - `Tenant.password` (nullable bcrypt hash — null means portal
        access isn't set up). Admin-only "Portal Access" action on the
        Tenants page (key icon in row actions) sets or clears it via a
        dedicated `POST /api/setup/tenants/[id]/portal-access` route
        (kept separate from the general tenant-edit PATCH route so a
        routine name/email edit can never accidentally touch the
        password field). **Caught during implementation, not shipped**:
        the Tenants list page did `{ ...t, ... }` to build table rows,
        which would have spread the raw bcrypt hash into props
        serialized straight to the client the moment `password` was
        added to the schema. Fixed by building the row explicitly
        (`src/app/admin/setup/tenants/page.tsx`) and exposing only a
        `portalEnabled` boolean — the lesson from the `inspectionId`
        document-link bug earlier in this session (verify actual
        behavior, don't assume a schema addition is inert elsewhere).
      - `src/lib/tenantAuth.ts` mirrors `src/lib/auth.ts` (same JWT/
        cookie/8h-expiry shape) but under a **different cookie name**
        (`apt_tenant_session` vs `apt_session`) so a tenant and an admin
        session coexist independently in the same browser. Login is by
        `Tenant.email` + password (`POST /api/portal/auth/login`) — note
        `Tenant.email` has no unique constraint, so two tenants sharing
        an email in the same org is an unhandled edge case (login would
        match whichever comes first); not fixed, flagged as a known gap.
      - Portal UI under `/portal/*`: `/portal/login` (public),
        `/portal/(app)/{dashboard,maintenance}` (route group whose
        `layout.tsx` is the single session guard + topbar for every
        authenticated portal page — mirrors how `admin/layout.tsx` guards
        everything under `/admin`). Dashboard shows every lease the
        tenant is on (`LeaseTenant` join, not just their most recent),
        each with balance/charges/payments (same `totalCharged −
        totalPaid` calc as the Leases/Rent-Roll pages) and any Documents
        linked to that lease. Maintenance page lists the tenant's own
        submitted requests and a submit form.
      - `WorkOrder` gained `submittedByTenantId` (nullable FK) so a
        portal-submitted request is distinguishable from a staff-created
        one — the Work Orders admin page's new "Submitted By" column
        shows "Name (portal)" vs "Staff". `POST /api/portal/work-orders`
        derives `propertyId`/`unitId` from the tenant's own lease
        server-side (never trusts a client-submitted property/unit) and
        403s with "Lease not found" if the submitted `leaseId` isn't one
        the calling tenant is actually on — verified by attempting a
        cross-tenant submission and confirming it's rejected, then
        re-confirming a lease that genuinely was the tenant's *previous*
        (now-Ended) lease is correctly accepted, since ownership is
        real, not just "currently Active."
      - Document downloads for tenants go through a **separate** route,
        `GET /api/portal/documents/[id]` (not the admin
        `/api/documents/[id]`), because the authorization question is
        different: "does this document belong to a lease this tenant is
        on" vs. "does this document belong to the caller's org." Verified
        a tenant can download a document on their own lease (200),
        cannot download one on another tenant's lease (404, not a
        silent org-wide document listing), and that the admin document
        endpoint 403s a caller with only a tenant cookie.
      - Verified full auth isolation: a tenant-only cookie hitting
        `/admin/dashboard` redirects to `/login` (not the portal one),
        and an admin-only cookie hitting `/portal/dashboard` redirects
        to `/portal/login` — the two session systems don't leak into
        each other's route trees.
      - **Deliberately no online payment processing** — the dashboard
        shows balance and payment *history* only, no "pay now" button.
        No payment gateway (Stripe or otherwise) is configured for this
        app, and building a fake-looking payment button would be
        actively misleading rather than a real simplification.
      - No applicant→tenant conversion, no "approve applicant → grant
        portal access" automation — every step (create Tenant, create
        Lease, grant portal access) is still a separate manual admin
        action, consistent with how Applicant screening already works.
- [ ] Preventive maintenance — not started (routine/scheduled maintenance
      distinct from reactive Work Orders; Inspections cover condition
      reports but not a recurring maintenance calendar).

## Known gaps — design brief §5 Reporting

Found via an audit against the brief's Reporting module list (not previously
tracked in this file). Four of the eight listed reports don't exist yet:

- [ ] AR aging / delinquency report — Rent Roll and the Lease detail page
      show a lease's current balance, but there's no aging-bucket view
      (30/60/90+ days past due) across the portfolio.
- [ ] Occupancy & vacancy report, days-to-lease — Rent Roll shows a
      point-in-time occupancy %, but nothing tracks vacancy duration per
      unit or days-to-lease as a KPI.
- [ ] NOI report (and Cap Rate) — NOI is computed inline on the Income
      Statement (Income − Expense), matching the brief's definition, but
      there's no dedicated NOI report and no Cap Rate calc. `Property` has
      no `propertyValue` field, so Cap Rate (NOI ÷ Property Value) can't be
      computed without a schema change first.
- [ ] Trust account reconciliation report — the brief calls this out as
      "the report that keeps you out of trouble": proving trust bank
      balance == sum of outstanding `SecurityDeposit` liability. Only
      generic per-account bank reconciliation exists
      (`/admin/setup/bank-accounts/[id]/reconcile`); nothing cross-checks
      a Security-Deposit-Trust account's cleared balance against open
      `SecurityDeposit` rows.
- [ ] Work order aging/completion-time report — `WorkOrder` has the dates
      needed (`createdAt`, `completedAt`) but no report surfaces
      open-order age or average time-to-complete.

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
above), including AP/vendor-bill posting, period-close protection,
prepaid-credit/overpayment handling, and Rent Roll's balance column.
Phase 1 is fully complete. Phase 2 has picked up every item except
preventive maintenance (security deposits, owner statements, management
fee, owner distributions, prepaid credit, period-close, 1099s,
budgeting, document storage, RUBS, inspections, applicant screening,
tenant self-service portal).

## Fixed in the security-deposit / owner-statements session

- Income Statement / Balance Sheet date-range filters were parsing
  `startDate`/`endDate`/`asOfDate` query params with
  `new Date(`${d}T00:00:00`)` (no `Z`) — interpreted as **local server
  time**, not UTC. Every posting function stores dates via
  `new Date(data.date)` on a bare `YYYY-MM-DD` string, which JS parses as
  UTC midnight. On a UTC-5 server this meant the report's range start was
  5 hours *later* than a same-day transaction's actual timestamp, silently
  excluding it. Fixed by adding `Z` to both filter boundaries in both
  report pages so everything compares in UTC.
- `formatDate()` in `src/lib/utils.ts` had the same root cause, but
  app-wide: `toLocaleDateString()` with no `timeZone` renders in local
  server time, so every date shown anywhere (lease dates, charge/payment
  dates, COI expiration, etc.) displayed one day behind what was actually
  entered, on a UTC-5 server. Fixed by pinning `timeZone: 'UTC'` — found
  while verifying the new deposit-return date rendered correctly.
- `returnSecurityDeposit()` returned the pre-update `SecurityDeposit` row
  from inside its `$transaction` instead of the updated one — the DB write
  was always correct, but the API response (and thus the immediate caller)
  saw stale `returnedDate`/`returnedToTenant`/`retained` values. Fixed by
  capturing and returning the `tx.securityDeposit.update()` result.

Worth checking for the UTC-vs-local pattern before adding any other
date-related feature — it's bitten this app twice now.

## Test data currently in the DB

Sample Property ("Maple Ridge Apartments (Renamed)", 10% management fee
set) with Units 101/102, an Owner ("Riverside Capital LLC", 60% on Maple
Ridge) and a "Self (default)" owner (100% on Maple Ridge — the two aren't
reconciled to sum to 100%, harmless test-data overlap, not a validation
gap worth adding yet), Tenants (including "Jane A. Doe"), two Leases with
posted Rent charges ($1,650 + $1,400) and various charges/payments/credit
applications against Unit 102's lease (including a deliberate $100
overpayment partially applied as prepaid credit), a Bank Account
("Operating Checking") plus a "Security Deposit Trust" account, a Vendor
("Acme Plumbing", COI intentionally expired to test the badge) with two
invoices, a payment, an overpayment, and a vendor-credit application, a
security deposit on Unit 102's lease ($1,400 collected, then returned as
$1,200 to tenant / $200 retained), a $50 test Owner Distribution to
Riverside Capital LLC, a Work Order, a 2026 Budget on Maple Ridge (Rental
Income $1,600/mo + Repairs & Maintenance $200/mo for Jan/Feb), a $101.01
RUBS charge equal-split across both Maple Ridge leases ($50.51/$50.50)
dated Jul 1, 2026, a completed Move-In Inspection on Unit 102, an
Applicant ("Alex Rivera", status Screening, on Maple Ridge), tenant
portal access enabled for Jane A. Doe (password `TenantPass123`, set
during verification — real deployments should rotate/revoke this), and
two tenant-submitted Work Orders from Jane's portal session ("Bathroom
sink is clogged" and one on her old Unit 101 lease) — none of the
Inspection/Applicant/lease documents used to verify document-linking
were left attached, all were deleted after verification — all created
during end-to-end verification across this app's build passes. Safe to
delete once real data entry starts.
