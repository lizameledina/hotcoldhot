import cron from 'node-cron'
import { prisma } from '../lib/prisma'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Telegram API error: ${res.status} ${body}`)
  }
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

function currentHHMM(): string {
  const now = new Date()
  const hh = now.getUTCHours().toString().padStart(2, '0')
  const mm = now.getUTCMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}

async function sendReminders(): Promise<void> {
  const currentTime = currentHHMM()
  const today = todayUTC()

  // Find users with reminders enabled at current time, not yet reminded today
  const candidates = await prisma.userSettings.findMany({
    where: {
      reminderEnabled: true,
      reminderTime: currentTime,
      OR: [
        { lastReminderDate: null },
        { lastReminderDate: { not: today } },
      ],
    },
    include: { user: true },
  })

  if (candidates.length === 0) return

  // Check which users already have a completed session today
  const userIds = candidates.map((c) => c.userId)
  const todayStart = new Date(`${today}T00:00:00.000Z`)
  const todayEnd = new Date(`${today}T23:59:59.999Z`)

  const completedToday = await prisma.session.findMany({
    where: {
      userId: { in: userIds },
      status: 'COMPLETED',
      startedAt: { gte: todayStart, lte: todayEnd },
    },
    select: { userId: true },
  })
  const completedUserIds = new Set(completedToday.map((s) => s.userId))

  for (const settings of candidates) {
    // Mark as reminded even if goal is already done (no duplicate today)
    if (completedUserIds.has(settings.userId)) {
      await prisma.userSettings
        .update({ where: { id: settings.id }, data: { lastReminderDate: today } })
        .catch(() => {})
      continue
    }

    const text =
      settings.currentStreak > 0
        ? `Не потеряй стрик: ${settings.currentStreak} дней 🔥`
        : 'Пора на контрастный душ 🧊🔥'

    try {
      await sendTelegramMessage(settings.user.telegramId, text)
      await prisma.userSettings.update({
        where: { id: settings.id },
        data: { lastReminderDate: today },
      })
    } catch (err) {
      console.error(`[reminders] Failed to send to user ${settings.userId}:`, err)
      // Don't update lastReminderDate so we can retry next minute if it was a transient error
      // But to avoid a flood, only retry once: mark as reminded after first failure
      await prisma.userSettings
        .update({ where: { id: settings.id }, data: { lastReminderDate: today } })
        .catch(() => {})
    }
  }
}

export function startReminderScheduler(): void {
  if (!BOT_TOKEN) {
    console.warn('[reminders] TELEGRAM_BOT_TOKEN not set — scheduler disabled')
    return
  }

  // Run at the start of every minute (UTC)
  cron.schedule('* * * * *', () => {
    sendReminders().catch((err) => console.error('[reminders] Scheduler error:', err))
  })

  console.log('[reminders] Scheduler started (UTC times)')
}
