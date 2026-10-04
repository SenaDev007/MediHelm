import { redirect } from 'next/navigation'
import { getInstitutionSession } from '../../lib/server-session'

export const dynamic = 'force-dynamic'

export default async function DashboardRedirect() {
  const session = await getInstitutionSession()
  if (!session) redirect('/login')
  if (session.role === 'DPMED_ADMIN') redirect('/dpmed')
  if (session.role === 'SOBAPS_VIEWER') redirect('/sobaps')
  redirect('/unauthorized')
}
