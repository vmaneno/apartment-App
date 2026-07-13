import { prisma } from './db'

function r2(n: number) { return Math.round(n * 100) / 100 }

async function getGl(organizationId: string, glNumber: string) {
  const gl = await prisma.chartOfAccount.findUnique({
    where: { organizationId_glNumber: { organizationId, glNumber } },
  })
  if (!gl) throw new Error(`GL account ${glNumber} not found for this organization`)
  return gl
}

// DR: 1500 Rent Receivable | CR: 4000 Rental Income (chargeType 'Rent') or 4100 Other Income (anything else)
export async function postLeaseCharge(args: {
  organizationId: string
  leaseId: string
  chargeType: string
  amount: number
  date?: Date
}) {
  const txDate = args.date ?? new Date()
  const amount = r2(args.amount)
  if (amount <= 0) throw new Error('Charge amount must be greater than zero')

  const lease = await prisma.lease.findUnique({ where: { id: args.leaseId }, include: { unit: true } })
  if (!lease) throw new Error('Lease not found')

  const incomeGlNumber = args.chargeType === 'Rent' ? '4000' : '4100'
  const [arGl, incomeGl] = await Promise.all([
    getGl(args.organizationId, '1500'),
    getGl(args.organizationId, incomeGlNumber),
  ])

  return prisma.$transaction(async (tx) => {
    const charge = await tx.leaseCharge.create({
      data: {
        leaseId: args.leaseId,
        chargeType: args.chargeType,
        amount,
        date: txDate,
      },
    })

    await tx.transaction.create({
      data: {
        date: txDate,
        organizationId: args.organizationId,
        transactionType: 'LEASE_CHARGE',
        description: `${args.chargeType} charge — Lease ${args.leaseId}`,
        lines: {
          create: [
            { glAccountId: arGl.id, propertyId: lease.unit.propertyId, debit: amount, credit: 0, description: args.chargeType },
            { glAccountId: incomeGl.id, propertyId: lease.unit.propertyId, debit: 0, credit: amount, description: args.chargeType },
          ],
        },
      },
    })

    return charge
  })
}

// FIFO-allocates a payment across a lease's outstanding charges, oldest first.
// DR: the selected BankAccount's GL | CR: 1500 Rent Receivable, for the full payment amount.
// Overpayment (amount > total outstanding) is rejected — no prepaid-credit account exists yet.
export async function recordPayment(args: {
  organizationId: string
  leaseId: string
  bankAccountId: string
  amount: number
  date?: Date
  method: string
}) {
  const txDate = args.date ?? new Date()
  const amount = r2(args.amount)
  if (amount <= 0) throw new Error('Payment amount must be greater than zero')

  const lease = await prisma.lease.findUnique({ where: { id: args.leaseId }, include: { unit: true } })
  if (!lease) throw new Error('Lease not found')

  const bankAccount = await prisma.bankAccount.findFirst({
    where: { id: args.bankAccountId, propertyId: lease.unit.propertyId, active: true },
  })
  if (!bankAccount) throw new Error('Bank account not found for this lease\'s property')

  const charges = await prisma.leaseCharge.findMany({
    where: { leaseId: args.leaseId },
    include: { paymentApplications: true },
    orderBy: { date: 'asc' },
  })
  const outstandingCharges = charges
    .map(c => ({ id: c.id, outstanding: r2(c.amount - c.paymentApplications.reduce((s, a) => s + a.appliedAmount, 0)) }))
    .filter(c => c.outstanding > 0.004)

  const totalOutstanding = r2(outstandingCharges.reduce((s, c) => s + c.outstanding, 0))
  if (totalOutstanding <= 0.004) {
    throw new Error('This lease has no outstanding balance — nothing to apply a payment to')
  }
  if (amount > totalOutstanding + 0.004) {
    throw new Error(
      `Payment ($${amount.toFixed(2)}) exceeds the outstanding balance ($${totalOutstanding.toFixed(2)}). ` +
      `Overpayments aren't supported yet — record a payment up to the outstanding amount.`
    )
  }

  let remaining = amount
  const applications: { chargeId: string; appliedAmount: number }[] = []
  for (const charge of outstandingCharges) {
    if (remaining < 0.005) break
    const applied = r2(Math.min(remaining, charge.outstanding))
    applications.push({ chargeId: charge.id, appliedAmount: applied })
    remaining = r2(remaining - applied)
  }

  const arGl = await getGl(args.organizationId, '1500')

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: { leaseId: args.leaseId, amount, date: txDate, method: args.method },
    })

    await tx.paymentApplication.createMany({
      data: applications.map(a => ({ paymentId: payment.id, chargeId: a.chargeId, appliedAmount: a.appliedAmount })),
    })

    await tx.transaction.create({
      data: {
        date: txDate,
        organizationId: args.organizationId,
        transactionType: 'LEASE_PAYMENT',
        description: `Payment (${args.method}) — Lease ${args.leaseId}`,
        lines: {
          create: [
            { glAccountId: bankAccount.glAccountId, propertyId: lease.unit.propertyId, debit: amount, credit: 0, description: 'Payment received' },
            { glAccountId: arGl.id, propertyId: lease.unit.propertyId, debit: 0, credit: amount, description: 'Payment received' },
          ],
        },
      },
    })

    return payment
  })
}

// Total outstanding balance for a lease (sum of unpaid charge amounts). Used by the lease
// detail page and to pre-validate a payment amount before calling recordPayment.
export async function getLeaseBalance(leaseId: string): Promise<number> {
  const charges = await prisma.leaseCharge.findMany({
    where: { leaseId },
    include: { paymentApplications: true },
  })
  const total = charges.reduce((s, c) => s + (c.amount - c.paymentApplications.reduce((s2, a) => s2 + a.appliedAmount, 0)), 0)
  return r2(total)
}

// AP mirror of postLeaseCharge. DR: the chosen Expense GL account | CR: 2000 Accounts Payable.
export async function postVendorInvoice(args: {
  organizationId: string
  vendorId: string
  propertyId: string
  glAccountId: string
  amount: number
  date?: Date
  description?: string
  invoiceNumber?: string
}) {
  const txDate = args.date ?? new Date()
  const amount = r2(args.amount)
  if (amount <= 0) throw new Error('Invoice amount must be greater than zero')

  const [vendor, expenseGl, apGl] = await Promise.all([
    prisma.vendor.findFirst({ where: { id: args.vendorId, organizationId: args.organizationId } }),
    prisma.chartOfAccount.findFirst({ where: { id: args.glAccountId, organizationId: args.organizationId } }),
    getGl(args.organizationId, '2000'),
  ])
  if (!vendor) throw new Error('Vendor not found')
  if (!expenseGl) throw new Error('GL account not found')
  if (expenseGl.glType !== 'Expense') throw new Error('Invoices must be coded to an Expense GL account')

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.vendorInvoice.create({
      data: {
        vendorId: args.vendorId,
        propertyId: args.propertyId,
        glAccountId: args.glAccountId,
        invoiceNumber: args.invoiceNumber || null,
        amount,
        date: txDate,
        description: args.description || null,
      },
    })

    await tx.transaction.create({
      data: {
        date: txDate,
        organizationId: args.organizationId,
        transactionType: 'VENDOR_INVOICE',
        description: `Vendor invoice — ${vendor.name}${args.invoiceNumber ? ` #${args.invoiceNumber}` : ''}`,
        lines: {
          create: [
            { glAccountId: expenseGl.id, propertyId: args.propertyId, debit: amount, credit: 0, description: args.description || vendor.name },
            { glAccountId: apGl.id, propertyId: args.propertyId, debit: 0, credit: amount, description: vendor.name },
          ],
        },
      },
    })

    return invoice
  })
}

// FIFO-allocates a payment across a vendor's outstanding invoices, oldest first.
// DR: 2000 Accounts Payable | CR: the selected BankAccount's GL, for the full payment amount.
// Overpayment (amount > total outstanding) is rejected — same boundary as recordPayment.
export async function recordVendorPayment(args: {
  organizationId: string
  vendorId: string
  bankAccountId: string
  amount: number
  date?: Date
  method: string
}) {
  const txDate = args.date ?? new Date()
  const amount = r2(args.amount)
  if (amount <= 0) throw new Error('Payment amount must be greater than zero')

  const vendor = await prisma.vendor.findFirst({ where: { id: args.vendorId, organizationId: args.organizationId } })
  if (!vendor) throw new Error('Vendor not found')

  const bankAccount = await prisma.bankAccount.findFirst({
    where: { id: args.bankAccountId, active: true, property: { organizationId: args.organizationId } },
  })
  if (!bankAccount) throw new Error('Bank account not found')

  const invoices = await prisma.vendorInvoice.findMany({
    where: { vendorId: args.vendorId },
    include: { paymentApplications: true },
    orderBy: { date: 'asc' },
  })
  const outstandingInvoices = invoices
    .map(i => ({ id: i.id, propertyId: i.propertyId, outstanding: r2(i.amount - i.paymentApplications.reduce((s, a) => s + a.appliedAmount, 0)) }))
    .filter(i => i.outstanding > 0.004)

  const totalOutstanding = r2(outstandingInvoices.reduce((s, i) => s + i.outstanding, 0))
  if (totalOutstanding <= 0.004) {
    throw new Error('This vendor has no outstanding balance — nothing to apply a payment to')
  }
  if (amount > totalOutstanding + 0.004) {
    throw new Error(
      `Payment ($${amount.toFixed(2)}) exceeds the outstanding balance ($${totalOutstanding.toFixed(2)}). ` +
      `Overpayments aren't supported yet — record a payment up to the outstanding amount.`
    )
  }

  let remaining = amount
  const applications: { invoiceId: string; appliedAmount: number; propertyId: string }[] = []
  for (const invoice of outstandingInvoices) {
    if (remaining < 0.005) break
    const applied = r2(Math.min(remaining, invoice.outstanding))
    applications.push({ invoiceId: invoice.id, appliedAmount: applied, propertyId: invoice.propertyId })
    remaining = r2(remaining - applied)
  }

  const apGl = await getGl(args.organizationId, '2000')
  // A vendor payment can span invoices from more than one property. Tag the AP line with the
  // property carrying the largest share so the per-property Balance Sheet reads sensibly.
  const propertyTotals = new Map<string, number>()
  for (const a of applications) propertyTotals.set(a.propertyId, (propertyTotals.get(a.propertyId) ?? 0) + a.appliedAmount)
  const primaryPropertyId = [...propertyTotals.entries()].sort((a, b) => b[1] - a[1])[0][0]

  return prisma.$transaction(async (tx) => {
    const payment = await tx.vendorPayment.create({
      data: { vendorId: args.vendorId, bankAccountId: args.bankAccountId, amount, date: txDate, method: args.method },
    })

    await tx.vendorPaymentApplication.createMany({
      data: applications.map(a => ({ paymentId: payment.id, invoiceId: a.invoiceId, appliedAmount: a.appliedAmount })),
    })

    await tx.transaction.create({
      data: {
        date: txDate,
        organizationId: args.organizationId,
        transactionType: 'VENDOR_PAYMENT',
        description: `Payment (${args.method}) — ${vendor.name}`,
        lines: {
          create: [
            { glAccountId: apGl.id, propertyId: primaryPropertyId, debit: amount, credit: 0, description: 'Vendor payment' },
            { glAccountId: bankAccount.glAccountId, propertyId: primaryPropertyId, debit: 0, credit: amount, description: 'Vendor payment' },
          ],
        },
      },
    })

    return payment
  })
}

// Total outstanding balance for a vendor (sum of unpaid invoice amounts).
export async function getVendorBalance(vendorId: string): Promise<number> {
  const invoices = await prisma.vendorInvoice.findMany({
    where: { vendorId },
    include: { paymentApplications: true },
  })
  const total = invoices.reduce((s, i) => s + (i.amount - i.paymentApplications.reduce((s2, a) => s2 + a.appliedAmount, 0)), 0)
  return r2(total)
}
