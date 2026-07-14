import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createTenantSession } from '@/lib/tenantAuth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  const tenant = await prisma.tenant.findFirst({ where: { email, active: true } })
  if (!tenant || !tenant.password || !(await bcrypt.compare(password, tenant.password))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  await createTenantSession({
    tenantId: tenant.id,
    name: tenant.name,
    organizationId: tenant.organizationId,
  })

  return NextResponse.json({ redirect: '/portal/dashboard' })
}
