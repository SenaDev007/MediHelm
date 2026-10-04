import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { authenticateInstitutionToken, SESSION_COOKIE } from '../../../../lib/session'

export const runtime = 'nodejs'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const user = await authenticateInstitutionToken(token)
  if (!user) return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  return NextResponse.json({ data: user })
}
