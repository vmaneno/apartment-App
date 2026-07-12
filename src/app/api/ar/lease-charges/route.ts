import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { postLeaseCharge } from '@/lib/accounting'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  const leaseIds: string[] = Array.isArray(data.leaseIds) ? data.leaseIds : []
  if (leaseIds.length === 0 || !data.chargeType || !data.date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const leases = await prisma.lease.findMany({
    where: { id: { in: leaseIds }, unit: { property: { organizationId: session.organizationId } } },
  })
  if (leases.length !== leaseIds.length) {
    return NextResponse.json({ error: 'One or more leases were not found' }, { status: 404 })
  }

  // An explicit amount always wins (used by the single-lease ad-hoc "Post Charge" form).
  // With no amount and chargeType 'Rent', each lease defaults to its own rentAmount — used by
  // the bulk Post Rent page, where rent naturally varies per lease.
  const explicitAmount = data.amount !== undefined && data.amount !== null && data.amount !== ''
    ? parseFloat(data.amount)
    : null
  if (explicitAmount === null && data.chargeType !== 'Rent') {
    return NextResponse.json({ error: 'Amount is required for non-Rent charge types' }, { status: 400 })
  }

  const results = []
  const errors: string[] = []
  for (const lease of leases) {
    try {
      const amount = explicitAmount ?? lease.rentAmount
      const charge = await postLeaseCharge({
        organizationId: session.organizationId,
        leaseId: lease.id,
        chargeType: data.chargeType,
        amount,
        date: new Date(data.date),
      })
      results.push(charge)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Server error'
      errors.push(`Lease ${lease.id}: ${msg}`)
    }
  }

  if (errors.length > 0 && results.length === 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  }

  return NextResponse.json({ posted: results.length, errors }, { status: 201 })
}
