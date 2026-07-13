import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { recordVendorPayment } from '@/lib/accounting'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  if (!data.vendorId || !data.bankAccountId || !data.amount || !data.date || !data.method) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const payment = await recordVendorPayment({
      organizationId: session.organizationId,
      vendorId: data.vendorId,
      bankAccountId: data.bankAccountId,
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
