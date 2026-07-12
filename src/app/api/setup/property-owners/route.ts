import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  if (!data.propertyId || !data.ownerId || !data.ownershipPercent) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const [property, owner] = await Promise.all([
    prisma.property.findFirst({ where: { id: data.propertyId, organizationId: session.organizationId } }),
    prisma.owner.findFirst({ where: { id: data.ownerId, organizationId: session.organizationId } }),
  ])
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 })

  try {
    const propertyOwner = await prisma.propertyOwner.upsert({
      where: { propertyId_ownerId: { propertyId: data.propertyId, ownerId: data.ownerId } },
      update: { ownershipPercent: parseFloat(data.ownershipPercent) },
      create: {
        propertyId: data.propertyId,
        ownerId: data.ownerId,
        ownershipPercent: parseFloat(data.ownershipPercent),
      },
    })
    return NextResponse.json(propertyOwner, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
