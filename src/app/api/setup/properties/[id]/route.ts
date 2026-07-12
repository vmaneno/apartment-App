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
  if (!data.name || !data.addressLine1 || !data.city || !data.state || !data.zip) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const existing = await prisma.property.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  try {
    const property = await prisma.property.update({
      where: { id },
      data: {
        name: data.name,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || null,
        city: data.city,
        state: data.state,
        zip: data.zip,
      },
    })
    return NextResponse.json(property)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
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
  const existing = await prisma.property.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  await prisma.property.update({ where: { id }, data: { active: false } })
  return NextResponse.json({ ok: true })
}
