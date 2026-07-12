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
// DR: 1000 Operating Cash | CR: 1500 Rent Receivable, for the full payment amount.
// Overpayment (amount > total outstanding) is rejected — no prepaid-credit account exists yet.
export async function recordPayment(args: {
  organizationId: string
  leaseId: string
  amount: number
  date?: Date
  method: string
}) {
  const txDate = args.date ?? new Date()
  const amount = r2(args.amount)
  if (amount <= 0) throw new Error('Payment amount must be greater than zero')

  const lease = await prisma.lease.findUnique({ where: { id: args.leaseId }, include: { unit: true } })
  if (!lease) throw new Error('Lease not found')

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

  const [cashGl, arGl] = await Promise.all([
    getGl(args.organizationId, '1000'),
    getGl(args.organizationId, '1500'),
  ])

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
            { glAccountId: cashGl.id, propertyId: lease.unit.propertyId, debit: amount, credit: 0, description: 'Payment received' },
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
