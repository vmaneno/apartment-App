import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Admin-only action: sets (or, with an empty password, revokes) a tenant's portal login.
// Distinct from the general tenant PATCH route so a routine "edit name/email" request can never
// accidentally touch the password field.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const data = await req.json()
  const password: string = typeof data.password === 'string' ? data.password : ''

  const tenant = await prisma.tenant.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  if (password && password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const hashed = password ? await bcrypt.hash(password, 12) : null
  await prisma.tenant.update({ where: { id }, data: { password: hashed } })
  return NextResponse.json({ ok: true, portalEnabled: !!hashed })
}
