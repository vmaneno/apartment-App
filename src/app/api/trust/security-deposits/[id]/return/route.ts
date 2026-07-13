import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { returnSecurityDeposit } from '@/lib/accounting'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const data = await req.json()
  if (data.returnedToTenant === undefined || data.retained === undefined || !data.date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const deposit = await returnSecurityDeposit({
      organizationId: session.organizationId,
      securityDepositId: id,
      returnedToTenant: parseFloat(data.returnedToTenant),
      retained: parseFloat(data.retained),
      date: new Date(data.date),
    })
    return NextResponse.json(deposit, { status: 200 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
