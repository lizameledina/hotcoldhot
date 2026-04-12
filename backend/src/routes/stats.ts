import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { getHomeInsights } from '../services/homeInsightsService'
import {
  getStatsInsights,
  getStatsSummary,
  getStatsTimeseries,
  parseStatsPeriod,
} from '../services/statsService'

export const statsRouter = Router()
statsRouter.use(authMiddleware)

function resolvePeriod(raw: unknown) {
  return parseStatsPeriod(typeof raw === 'string' ? raw : undefined)
}

statsRouter.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getStatsSummary(req.userId!, resolvePeriod(req.query.period))
    res.json(stats)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    res.status(msg === 'Invalid period' ? 400 : 500).json({ error: msg })
  }
})

statsRouter.get('/timeseries', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getStatsTimeseries(req.userId!, resolvePeriod(req.query.period))
    res.json(stats)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    res.status(msg === 'Invalid period' ? 400 : 500).json({ error: msg })
  }
})

statsRouter.get('/insights', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getStatsInsights(req.userId!, resolvePeriod(req.query.period))
    res.json(stats)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    res.status(msg === 'Invalid period' ? 400 : 500).json({ error: msg })
  }
})

statsRouter.get('/home-insights', async (req: AuthRequest, res: Response) => {
  try {
    const insights = await getHomeInsights(req.userId!)
    res.json({ items: insights })
  } catch {
    res.status(500).json({ error: 'Internal error' })
  }
})
