import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { postVendorInvoice } from '@/lib/accounting'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  if (!data.vendorId || !data.propertyId || !data.glAccountId || !data.amount || !data.date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const invoice = await postVendorInvoice({
      organizationId: session.organizationId,
      vendorId: data.vendorId,
      propertyId: data.propertyId,
      glAccountId: data.glAccountId,
      amount: parseFloat(data.amount),
      date: new Date(data.date),
      description: data.description,
      invoiceNumber: data.invoiceNumber,
    })
    return NextResponse.json(invoice, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
