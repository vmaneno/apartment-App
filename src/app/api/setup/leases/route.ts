import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  const tenantIds: string[] = Array.isArray(data.tenantIds) ? data.tenantIds : []
  if (!data.unitId || tenantIds.length === 0 || !data.startDate || !data.rentAmount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const unit = await prisma.unit.findFirst({
    where: { id: data.unitId, property: { organizationId: session.organizationId } },
  })
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

  const status = data.status === 'Pending' || data.status === 'Ended' ? data.status : 'Active'

  if (status === 'Active') {
    const existingActive = await prisma.lease.findFirst({ where: { unitId: data.unitId, status: 'Active' } })
    if (existingActive) {
      return NextResponse.json({ error: 'This unit already has an active lease — end it before starting a new one' }, { status: 409 })
    }
  }

  try {
    const lease = await prisma.$transaction(async (tx) => {
      const created = await tx.lease.create({
        data: {
          unitId: data.unitId,
          status,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          rentAmount: parseFloat(data.rentAmount),
          depositAmount: data.depositAmount ? parseFloat(data.depositAmount) : 0,
        },
      })
      await tx.leaseTenant.createMany({
        data: tenantIds.map((tenantId) => ({ leaseId: created.id, tenantId })),
      })
      return created
    })
    return NextResponse.json(lease, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
