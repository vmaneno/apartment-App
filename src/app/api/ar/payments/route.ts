import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { recordPayment } from '@/lib/accounting'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  if (!data.leaseId || !data.amount || !data.date || !data.method) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const lease = await prisma.lease.findFirst({
    where: { id: data.leaseId, unit: { property: { organizationId: session.organizationId } } },
  })
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 })

  try {
    const payment = await recordPayment({
      organizationId: session.organizationId,
      leaseId: data.leaseId,
      amount: parseFloat(data.amount),
      date: new Date(data.date),
      method: data.method,
    })
    return NextResponse.json(payment, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
