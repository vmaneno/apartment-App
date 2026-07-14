import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { postLeaseCharge } from '@/lib/accounting'
import { allocateRubs, rubsWeight, type RubsMethod } from '@/lib/rubs'

const METHODS: RubsMethod[] = ['sqft', 'beds', 'equal']

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  const { propertyId, method, date } = data as { propertyId?: string; method?: string; date?: string }
  const totalAmount = parseFloat(data.totalAmount)
  if (!propertyId || !METHODS.includes(method as RubsMethod) || !date || !Number.isFinite(totalAmount) || totalAmount <= 0) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const property = await prisma.property.findFirst({ where: { id: propertyId, organizationId: session.organizationId } })
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  const leases = await prisma.lease.findMany({
    where: { status: 'Active', unit: { propertyId } },
    include: { unit: true },
  })
  if (leases.length === 0) {
    return NextResponse.json({ error: 'No active leases on this property' }, { status: 400 })
  }

  const m = method as RubsMethod
  if (m === 'sqft' && leases.some(l => !l.unit.sqft)) {
    return NextResponse.json({ error: 'One or more units are missing square footage — set it under Setup → Units, or use a different allocation method' }, { status: 400 })
  }

  const weights = leases.map(l => rubsWeight(m, l.unit))
  const shares = allocateRubs(totalAmount, weights)

  const results = []
  const errors: string[] = []
  for (let i = 0; i < leases.length; i++) {
    if (shares[i] <= 0) continue
    try {
      const charge = await postLeaseCharge({
        organizationId: session.organizationId,
        leaseId: leases[i].id,
        chargeType: 'RUBS',
        amount: shares[i],
        date: new Date(date),
      })
      results.push(charge)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Server error'
      errors.push(`Lease ${leases[i].id}: ${msg}`)
    }
  }

  if (errors.length > 0 && results.length === 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  }

  return NextResponse.json({ posted: results.length, errors }, { status: 201 })
}
