import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const data = await req.json()

  try {
    const org = await prisma.organization.update({
      where: { id: session.organizationId },
      data: { closedThrough: data.closedThrough ? new Date(data.closedThrough) : null },
    })
    return NextResponse.json(org)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
