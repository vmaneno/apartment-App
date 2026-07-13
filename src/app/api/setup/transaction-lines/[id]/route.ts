import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Toggles a TransactionLine's cleared flag — used by simple bank reconciliation.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const data = await req.json()

  const existing = await prisma.transactionLine.findFirst({
    where: { id, transaction: { organizationId: session.organizationId } },
  })
  if (!existing) return NextResponse.json({ error: 'Transaction line not found' }, { status: 404 })

  const cleared = data.cleared === true
  const line = await prisma.transactionLine.update({
    where: { id },
    data: { cleared, clearedAt: cleared ? new Date() : null },
  })
  return NextResponse.json(line)
}
