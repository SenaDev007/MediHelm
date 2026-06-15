// ============================================================
// MédiHelm — Route Handler NextAuth.js
// Export des handlers GET et POST pour l'authentification
// ============================================================

import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
