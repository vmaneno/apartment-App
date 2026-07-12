import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  if (!data.name || !data.addressLine1 || !data.city || !data.state || !data.zip) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const property = await prisma.property.create({
      data: {
        organizationId: session.organizationId,
        name: data.name,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || null,
        city: data.city,
        state: data.state,
        zip: data.zip,
      },
    })

    // Model Owner/PropertyOwner from day one — default to "owner = self" until real
    // owner setup exists, per the design brief's guidance not to retrofit this later.
    let owner = await prisma.owner.findFirst({
      where: { organizationId: session.organizationId, name: 'Self (default)' },
    })
    if (!owner) {
      owner = await prisma.owner.create({
        data: { organizationId: session.organizationId, name: 'Self (default)', type: 'Individual' },
      })
    }
    await prisma.propertyOwner.create({
      data: { propertyId: property.id, ownerId: owner.id, ownershipPercent: 100 },
    })

    return NextResponse.json(property, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
