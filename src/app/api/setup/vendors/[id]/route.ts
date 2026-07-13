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
  if (!data.name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const existing = await prisma.vendor.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })

  try {
    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        name: data.name,
        trade: data.trade || null,
        email: data.email || null,
        phone: data.phone || null,
        coiExpiresAt: data.coiExpiresAt ? new Date(data.coiExpiresAt) : null,
        w9OnFile: data.w9OnFile === 'Y',
      },
    })
    return NextResponse.json(vendor)
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
  const existing = await prisma.vendor.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })

  await prisma.vendor.update({ where: { id }, data: { active: false } })
  return NextResponse.json({ ok: true })
}
