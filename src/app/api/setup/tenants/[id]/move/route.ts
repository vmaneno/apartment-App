import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Ends a tenant's current Active lease and creates a new one on a different unit, carrying
// over every tenant on the old lease (this moves the whole household on that lease, not just
// the one tenant the action was triggered from).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const data = await req.json()
  if (!data.targetUnitId || !data.startDate || !data.rentAmount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const tenant = await prisma.tenant.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const targetUnit = await prisma.unit.findFirst({
    where: { id: data.targetUnitId, property: { organizationId: session.organizationId } },
  })
  if (!targetUnit) return NextResponse.json({ error: 'Target unit not found' }, { status: 404 })

  const currentLeaseTenant = await prisma.leaseTenant.findFirst({
    where: { tenantId: id, lease: { status: 'Active' } },
    include: { lease: { include: { leaseTenants: true } } },
  })
  if (!currentLeaseTenant) {
    return NextResponse.json({ error: 'This tenant has no active lease to move' }, { status: 400 })
  }
  const currentLease = currentLeaseTenant.lease

  if (currentLease.unitId === targetUnit.id) {
    return NextResponse.json({ error: 'Tenant is already assigned to that unit' }, { status: 400 })
  }

  const conflictingLease = await prisma.lease.findFirst({ where: { unitId: targetUnit.id, status: 'Active' } })
  if (conflictingLease) {
    return NextResponse.json({ error: 'The target unit already has an active lease' }, { status: 409 })
  }

  const startDate = new Date(data.startDate)
  const allTenantIds = currentLease.leaseTenants.map(lt => lt.tenantId)

  try {
    const newLease = await prisma.$transaction(async (tx) => {
      await tx.lease.update({
        where: { id: currentLease.id },
        data: { status: 'Ended', endDate: startDate },
      })
      const created = await tx.lease.create({
        data: {
          unitId: targetUnit.id,
          status: 'Active',
          startDate,
          rentAmount: parseFloat(data.rentAmount),
          depositAmount: data.depositAmount ? parseFloat(data.depositAmount) : 0,
        },
      })
      await tx.leaseTenant.createMany({
        data: allTenantIds.map((tenantId) => ({ leaseId: created.id, tenantId })),
      })
      return created
    })
    return NextResponse.json(newLease, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
