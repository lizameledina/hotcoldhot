import { Router, Request, Response } from 'express'
import { authenticateUser } from '../services/authService'

export const authRouter = Router()

authRouter.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body
    if (!initData) {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auth failed'
    res.status(401).json({ error: message })
  }
})
