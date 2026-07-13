import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  if (!data.glNumber || !data.glName || !data.glType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const account = await prisma.chartOfAccount.create({
      data: {
        organizationId: session.organizationId,
        glNumber: data.glNumber,
        glName: data.glName,
        glType: data.glType,
      },
    })
    return NextResponse.json(account, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'That GL number already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
