import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { getStatsSummary } from '../services/statsService'

export const statsRouter = Router()
statsRouter.use(authMiddleware)

statsRouter.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getStatsSummary(req.userId!)
    res.json(stats)
  } catch {
    res.status(500).json({ error: 'Internal error' })
  }
})
