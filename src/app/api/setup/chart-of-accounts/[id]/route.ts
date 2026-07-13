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
  if (!data.glNumber || !data.glName || !data.glType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const existing = await prisma.chartOfAccount.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  try {
    const account = await prisma.chartOfAccount.update({
      where: { id },
      data: { glNumber: data.glNumber, glName: data.glName, glType: data.glType },
    })
    return NextResponse.json(account)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'That GL number already exists' }, { status: 409 })
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
  const existing = await prisma.chartOfAccount.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  await prisma.chartOfAccount.update({ where: { id }, data: { active: false } })
  return NextResponse.json({ ok: true })
}
