import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { userName, password } = await req.json()

  if (!userName || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { userName } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  if (!user.active) {
    return NextResponse.json({ error: 'Account is inactive' }, { status: 403 })
  }

  await createSession({
    userId: user.id,
    userName: user.userName,
    name: user.name,
    role: user.role === 'admin' ? 'admin' : 'staff',
    organizationId: user.organizationId,
  })

  return NextResponse.json({ redirect: '/admin/dashboard' })
}
