import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { collectSecurityDeposit } from '@/lib/accounting'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  if (!data.leaseId || !data.bankAccountId || !data.amount || !data.date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const deposit = await collectSecurityDeposit({
      organizationId: session.organizationId,
      leaseId: data.leaseId,
      bankAccountId: data.bankAccountId,
      amount: parseFloat(data.amount),
      date: new Date(data.date),
    })
    return NextResponse.json(deposit, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
