import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Resolve DATABASE_URL: ensure we use the PostgreSQL URL from .env
// The system environment may have a SQLite URL (file:...) that overrides .env values
function getDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL
  if (envUrl && (envUrl.startsWith('postgresql://') || envUrl.startsWith('postgres://'))) {
    return envUrl
  }
  // System env var is not a PostgreSQL URL — read from .env files manually
  try {
    const fs = require('fs')
    const path = require('path')
    for (const envFile of ['.env.local', '.env']) {
      const envPath = path.join(process.cwd(), envFile)
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8')
        for (const line of content.split('\n')) {
          const match = line.match(/^DATABASE_URL\s*=\s*(.+)$/)
          if (match) {
            const url = match[1].trim()
            if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
              return url
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return undefined
}

const databaseUrl = getDatabaseUrl()

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
