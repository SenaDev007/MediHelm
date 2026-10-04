import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '../../../../lib/session'

export async function POST() {
  const response = NextResponse.json({ data: { signedOut: true } })
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {}),
  })
  return response
}
