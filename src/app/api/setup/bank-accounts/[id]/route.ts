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
  if (!data.name || !data.glAccountId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const existing = await prisma.bankAccount.findFirst({ where: { id, property: { organizationId: session.organizationId } } })
  if (!existing) return NextResponse.json({ error: 'Bank account not found' }, { status: 404 })

  const glAccount = await prisma.chartOfAccount.findFirst({ where: { id: data.glAccountId, organizationId: session.organizationId } })
  if (!glAccount) return NextResponse.json({ error: 'GL account not found' }, { status: 404 })

  try {
    const bankAccount = await prisma.bankAccount.update({
      where: { id },
      data: {
        name: data.name,
        type: ['Operating', 'SecurityDepositTrust', 'Reserve'].includes(data.type) ? data.type : 'Operating',
        glAccountId: data.glAccountId,
      },
    })
    return NextResponse.json(bankAccount)
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
  const existing = await prisma.bankAccount.findFirst({ where: { id, property: { organizationId: session.organizationId } } })
  if (!existing) return NextResponse.json({ error: 'Bank account not found' }, { status: 404 })

  await prisma.bankAccount.update({ where: { id }, data: { active: false } })
  return NextResponse.json({ ok: true })
}
