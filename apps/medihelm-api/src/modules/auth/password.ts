import { createHash, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'

const DUMMY_PASSWORD_HASH = bcrypt.hash('medihelm-dummy-password-never-valid', 12)

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (/^\$2[aby]\$/.test(storedHash)) {
    return bcrypt.compare(password, storedHash)
  }

  if (!/^[\da-f]{64}$/i.test(storedHash)) return false

  const actual = Buffer.from(storedHash, 'hex')
  const expected = createHash('sha256').update(password, 'utf8').digest()
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function performDummyPasswordCheck(password: string): Promise<void> {
  await bcrypt.compare(password, await DUMMY_PASSWORD_HASH)
}
