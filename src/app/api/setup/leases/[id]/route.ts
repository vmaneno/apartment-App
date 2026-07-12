import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const data = await req.json()
  if (!data.status || !data.startDate || !data.rentAmount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const existing = await prisma.lease.findFirst({
    where: { id, unit: { property: { organizationId: session.organizationId } } },
  })
  if (!existing) return NextResponse.json({ error: 'Lease not found' }, { status: 404 })

  const status = data.status === 'Pending' || data.status === 'Ended' ? data.status : 'Active'

  if (status === 'Active') {
    const otherActive = await prisma.lease.findFirst({
      where: { unitId: existing.unitId, status: 'Active', id: { not: id } },
    })
    if (otherActive) {
      return NextResponse.json({ error: 'This unit already has a different active lease' }, { status: 409 })
    }
  }

  try {
    const lease = await prisma.lease.update({
      where: { id },
      data: {
        status,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        rentAmount: parseFloat(data.rentAmount),
        depositAmount: data.depositAmount ? parseFloat(data.depositAmount) : 0,
      },
    })
    return NextResponse.json(lease)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
