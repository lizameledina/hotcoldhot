import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { getPresets, createPreset, updatePreset, deletePreset } from '../services/presetsService'

export const presetsRouter = Router()
presetsRouter.use(authMiddleware)

presetsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = await getPresets(req.userId!)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

presetsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, hotDurationSec, coldDurationSec, breakDurationSec, cyclesCount } = req.body

    if (!name || hotDurationSec <= 0 || coldDurationSec <= 0 || breakDurationSec < 0 || cyclesCount < 1) {
      res.status(400).json({ error: 'Invalid preset data' })
      return
    }

    const preset = await createPreset(req.userId!, {
      name,
      hotDurationSec: parseInt(hotDurationSec),
      coldDurationSec: parseInt(coldDurationSec),
      breakDurationSec: parseInt(breakDurationSec) || 0,
      cyclesCount: parseInt(cyclesCount),
    })
    res.status(201).json(preset)
  } catch (err) {
    res.status(500).json({ error: 'Internal error' })
  }
})

presetsRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, hotDurationSec, coldDurationSec, breakDurationSec, cyclesCount } = req.body
    const preset = await updatePreset(req.userId!, req.params.id, {
      name,
      hotDurationSec: hotDurationSec !== undefined ? parseInt(hotDurationSec) : undefined,
      coldDurationSec: coldDurationSec !== undefined ? parseInt(coldDurationSec) : undefined,
      breakDurationSec: breakDurationSec !== undefined ? parseInt(breakDurationSec) : undefined,
      cyclesCount: cyclesCount !== undefined ? parseInt(cyclesCount) : undefined,
    })
    res.json(preset)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    res.status(msg === 'Preset not found' ? 404 : 500).json({ error: msg })
  }
})

presetsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await deletePreset(req.userId!, req.params.id)
    res.status(204).send()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    res.status(msg === 'Preset not found' ? 404 : 500).json({ error: msg })
  }
})
