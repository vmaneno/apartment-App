import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  if (!data.name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  try {
    const vendor = await prisma.vendor.create({
      data: {
        organizationId: session.organizationId,
        name: data.name,
        trade: data.trade || null,
        email: data.email || null,
        phone: data.phone || null,
        coiExpiresAt: data.coiExpiresAt ? new Date(data.coiExpiresAt) : null,
        w9OnFile: data.w9OnFile === 'Y',
      },
    })
    return NextResponse.json(vendor, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
