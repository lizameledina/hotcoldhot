import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticateUser } from '../services/authService'

export const authRouter = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, try again later' },
})

authRouter.post('/telegram', authLimiter, async (req: Request, res: Response) => {
  try {
    const { initData } = req.body
    if (!initData || typeof initData !== 'string') {
      res.status(400).json({ error: 'initData required' })
      return
    }

    const result = await authenticateUser(initData)
    res.json({
      token: result.token,
      user: {
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        username: result.user.username,
        settings: result.user.settings,
      },
    })
  } catch {
    res.status(401).json({ error: 'Authentication failed' })
  }
})
