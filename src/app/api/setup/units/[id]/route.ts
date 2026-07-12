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
  if (!data.unitNumber) {
    return NextResponse.json({ error: 'Unit # is required' }, { status: 400 })
  }

  const existing = await prisma.unit.findFirst({ where: { id, property: { organizationId: session.organizationId } } })
  if (!existing) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

  try {
    const unit = await prisma.unit.update({
      where: { id },
      data: {
        unitNumber: data.unitNumber,
        beds: data.beds ? parseInt(data.beds, 10) : 0,
        baths: data.baths ? parseFloat(data.baths) : 0,
        sqft: data.sqft ? parseInt(data.sqft, 10) : null,
        marketRent: data.marketRent ? parseFloat(data.marketRent) : null,
      },
    })
    return NextResponse.json(unit)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'That unit number already exists on this property' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.unit.findFirst({ where: { id, property: { organizationId: session.organizationId } } })
  if (!existing) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

  await prisma.unit.update({ where: { id }, data: { active: false } })
  return NextResponse.json({ ok: true })
}
