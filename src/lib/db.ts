import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const DATABASE_URL = 'postgresql://neondb_owner:npg_5TK7YFxdoRlk@ep-rapid-leaf-ag0eyijw-pooler.c-2.eu-central-1.aws.neon.tech/MediHelm?sslmode=require'

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: DATABASE_URL }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
