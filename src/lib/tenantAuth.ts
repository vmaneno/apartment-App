import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

// Separate secret material (same JWT_SECRET, different cookie name) from the staff session in
// src/lib/auth.ts — a tenant and an admin must be able to hold independent sessions in the same
// browser (e.g. staff previewing the portal) without either session clobbering the other.
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'apartment-app-dev-secret-change-in-production'
)
const COOKIE = 'apt_tenant_session'

export interface TenantSessionPayload {
  tenantId: string
  name: string
  organizationId: string
}

export async function createTenantSession(payload: TenantSessionPayload) {
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
}

export async function getTenantSession(): Promise<TenantSessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as TenantSessionPayload
  } catch {
    return null
  }
}

export async function deleteTenantSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE)
}
