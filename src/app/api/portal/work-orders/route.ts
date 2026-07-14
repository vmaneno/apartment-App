import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTenantSession } from '@/lib/tenantAuth'

export async function POST(req: NextRequest) {
  const session = await getTenantSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  if (!data.leaseId || !data.description) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // The tenant can only submit a request against a lease they're actually on — never trust a
  // client-submitted propertyId/unitId directly, derive them from the lease server-side.
  const leaseTenant = await prisma.leaseTenant.findFirst({
    where: { tenantId: session.tenantId, leaseId: data.leaseId },
    include: { lease: { include: { unit: true } } },
  })
  if (!leaseTenant) return NextResponse.json({ error: 'Lease not found' }, { status: 404 })

  try {
    const workOrder = await prisma.workOrder.create({
      data: {
        propertyId: leaseTenant.lease.unit.propertyId,
        unitId: leaseTenant.lease.unitId,
        description: data.description,
        priority: data.priority === 'Emergency' ? 'Emergency' : 'Routine',
        status: 'Open',
        submittedByTenantId: session.tenantId,
      },
    })
    return NextResponse.json(workOrder, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
