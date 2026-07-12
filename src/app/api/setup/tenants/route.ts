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
    const tenant = await prisma.tenant.create({
      data: {
        organizationId: session.organizationId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
      },
    })
    return NextResponse.json(tenant, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
