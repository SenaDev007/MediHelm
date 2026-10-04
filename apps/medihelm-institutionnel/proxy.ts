import { NextRequest, NextResponse } from 'next/server'
import { authenticateInstitutionToken, SESSION_COOKIE } from './lib/session'

const ROLE_ROOT: Record<string, string> = {
  '/dpmed': 'DPMED_ADMIN',
  '/sobaps': 'SOBAPS_VIEWER',
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) return NextResponse.next()

  const claims = await authenticateInstitutionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!claims) {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', pathname)
    return NextResponse.redirect(login)
  }

  const allowedRole = Object.entries(ROLE_ROOT).find(([root]) => pathname === root || pathname.startsWith(`${root}/`))?.[1]
  if (allowedRole && claims.role !== allowedRole) return NextResponse.redirect(new URL('/unauthorized', request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
}
