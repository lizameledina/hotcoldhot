import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { getPresets, createPreset, updatePreset, deletePreset } from '../services/presetsService'

export const presetsRouter = Router()
presetsRouter.use(authMiddleware)

const MAX_DURATION = 3600 // 1 hour max per phase
const MAX_CYCLES = 20

function parseAndValidateDuration(val: unknown): number | null {
  const n = parseInt(String(val))
  if (isNaN(n) || n < 0 || n > MAX_DURATION) return null
  return n
}

presetsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = await getPresets(req.userId!)
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Internal error' })
  }
})

presetsRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, hotDurationSec, coldDurationSec, breakDurationSec, cyclesCount } = req.body

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      res.status(400).json({ error: 'Invalid name' })
      return
    }

    const hot = parseAndValidateDuration(hotDurationSec)
    const cold = parseAndValidateDuration(coldDurationSec)
    const brk = parseAndValidateDuration(breakDurationSec)
    const cycles = parseInt(String(cyclesCount))

    if (!hot || hot <= 0 || !cold || cold <= 0 || brk === null || isNaN(cycles) || cycles < 1 || cycles > MAX_CYCLES) {
      res.status(400).json({ error: 'Invalid preset data' })
      return
    }

    const preset = await createPreset(req.userId!, {
      name: name.trim(),
      hotDurationSec: hot,
      coldDurationSec: cold,
      breakDurationSec: brk,
      cyclesCount: cycles,
    })
    res.status(201).json(preset)
  } catch {
    res.status(500).json({ error: 'Internal error' })
  }
})

presetsRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, hotDurationSec, coldDurationSec, breakDurationSec, cyclesCount } = req.body
    const data: Record<string, unknown> = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
        res.status(400).json({ error: 'Invalid name' })
        return
      }
      data.name = name.trim()
    }
    if (hotDurationSec !== undefined) {
      const v = parseAndValidateDuration(hotDurationSec)
      if (!v || v <= 0) { res.status(400).json({ error: 'Invalid hotDurationSec' }); return }
      data.hotDurationSec = v
    }
    if (coldDurationSec !== undefined) {
      const v = parseAndValidateDuration(coldDurationSec)
      if (!v || v <= 0) { res.status(400).json({ error: 'Invalid coldDurationSec' }); return }
      data.coldDurationSec = v
    }
    if (breakDurationSec !== undefined) {
      const v = parseAndValidateDuration(breakDurationSec)
      if (v === null) { res.status(400).json({ error: 'Invalid breakDurationSec' }); return }
      data.breakDurationSec = v
    }
    if (cyclesCount !== undefined) {
      const v = parseInt(String(cyclesCount))
      if (isNaN(v) || v < 1 || v > MAX_CYCLES) { res.status(400).json({ error: 'Invalid cyclesCount' }); return }
      data.cyclesCount = v
    }

    const preset = await updatePreset(req.userId!, req.params.id, data)
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
