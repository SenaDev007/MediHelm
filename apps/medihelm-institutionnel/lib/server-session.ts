import { cookies } from 'next/headers'
import { authenticateInstitutionToken, SESSION_COOKIE } from './session'

export async function getInstitutionSession() {
  const cookieStore = await cookies()
  return authenticateInstitutionToken(cookieStore.get(SESSION_COOKIE)?.value)
}
