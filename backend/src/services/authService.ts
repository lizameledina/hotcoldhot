import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

export function validateTelegramInitData(initData: string): TelegramUser | null {
  // In development/test mode, allow mock data
  if (process.env.NODE_ENV === 'development' && initData === 'mock') {
    return { id: 12345, first_name: 'Test', username: 'testuser' }
  }

  try {
    console.log('[auth] validating initData, BOT_TOKEN set:', !!process.env.TELEGRAM_BOT_TOKEN)
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return null

    params.delete('hash')

    const entries = Array.from(params.entries())
    entries.sort((a, b) => a[0].localeCompare(b[0]))
    const dataCheckString = entries.map((e) => `${e[0]}=${e[1]}`).join('\n')

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN!)
      .digest()

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    if (computedHash !== hash) return null

    const userStr = params.get('user')
    if (!userStr) return null

    return JSON.parse(userStr) as TelegramUser
  } catch {
    return null
  }
}

export async function authenticateUser(initData: string) {
  const telegramUser = validateTelegramInitData(initData)
  if (!telegramUser) {
    throw new Error('Invalid initData')
  }

  const user = await prisma.user.upsert({
    where: { telegramId: String(telegramUser.id) },
    update: {
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name ?? null,
      username: telegramUser.username ?? null,
    },
    create: {
      telegramId: String(telegramUser.id),
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name ?? null,
      username: telegramUser.username ?? null,
      settings: {
        create: {
          soundEnabled: true,
          vibrationEnabled: true,
          theme: 'SYSTEM',
        },
      },
    },
    include: { settings: true },
  })

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  )

  return { token, user }
}
