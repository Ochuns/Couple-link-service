import { randomBytes } from 'crypto'

export function generateInviteCode(): string {
  return randomBytes(3).toString('hex').toUpperCase()
}

export function isCodeExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

export function getCodeExpiryDate(): Date {
  const date = new Date()
  date.setHours(date.getHours() + 24)
  return date
}
