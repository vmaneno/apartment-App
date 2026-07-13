import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  if (!data.propertyId || !data.description) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const property = await prisma.property.findFirst({ where: { id: data.propertyId, organizationId: session.organizationId } })
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  if (data.unitId) {
    const unit = await prisma.unit.findFirst({ where: { id: data.unitId, propertyId: data.propertyId } })
    if (!unit) return NextResponse.json({ error: 'Unit not found on this property' }, { status: 404 })
  }

  try {
    const workOrder = await prisma.workOrder.create({
      data: {
        propertyId: data.propertyId,
        unitId: data.unitId || null,
        description: data.description,
        priority: data.priority === 'Emergency' ? 'Emergency' : 'Routine',
        status: 'Open',
        assignedVendorId: data.assignedVendorId || null,
      },
    })
    return NextResponse.json(workOrder, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
