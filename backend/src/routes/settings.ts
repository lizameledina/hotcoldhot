import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { updateSettings, getSettings } from '../services/settingsService'

export const settingsRouter = Router()
settingsRouter.use(authMiddleware)

settingsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await getSettings(req.userId!)
    res.json(settings)
  } catch {
    res.status(500).json({ error: 'Internal error' })
  }
})

settingsRouter.patch('/', async (req: AuthRequest, res: Response) => {
  try {
    const { soundEnabled, vibrationEnabled, theme, reminderEnabled, reminderTime, dailyGoalSessions } = req.body

    const settings = await updateSettings(req.userId!, {
      soundEnabled,
      vibrationEnabled,
      theme,
      reminderEnabled,
      reminderTime,
      dailyGoalSessions,
    })
    res.json(settings)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    res.status(400).json({ error: msg })
  }
})
