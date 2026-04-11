import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { startSession, finishSession, getSessions, getSession } from '../services/sessionsService'

export const sessionsRouter = Router()
sessionsRouter.use(authMiddleware)

sessionsRouter.post('/start', async (req: AuthRequest, res: Response) => {
  try {
    const { presetId } = req.body
    if (!presetId) {
      res.status(400).json({ error: 'presetId required' })
      return
    }
    const session = await startSession(req.userId!, presetId)
    res.status(201).json(session)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    res.status(msg === 'Preset not found' ? 404 : 500).json({ error: msg })
  }
})

sessionsRouter.post('/:id/finish', async (req: AuthRequest, res: Response) => {
  try {
    const { status, completedCycles, actualHotSec, actualColdSec, actualBreakSec } = req.body
    if (!status || !['COMPLETED', 'INTERRUPTED'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' })
      return
    }
    const session = await finishSession(req.userId!, req.params.id, {
      status,
      completedCycles: parseInt(completedCycles) || 0,
      actualHotSec: parseInt(actualHotSec) || 0,
      actualColdSec: parseInt(actualColdSec) || 0,
      actualBreakSec: parseInt(actualBreakSec) || 0,
    })
    res.json(session)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    res.status(msg === 'Session not found' ? 404 : 500).json({ error: msg })
  }
})

sessionsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const data = await getSessions(req.userId!, page, limit)
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Internal error' })
  }
})

sessionsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const session = await getSession(req.userId!, req.params.id)
    res.json(session)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    res.status(msg === 'Session not found' ? 404 : 500).json({ error: msg })
  }
})
