import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { createPreset, deletePreset, getPresets, updatePreset } from '../services/presetsService'
import type { ProtocolStep } from '../services/protocolService'

export const presetsRouter = Router()
presetsRouter.use(authMiddleware)

const MAX_DURATION = 3600
const MAX_STEPS = 40
const MAX_PROGRESS_DAYS = 365

function parseOptionalPositiveInt(val: unknown, max: number): number | null {
  const n = parseInt(String(val))
  if (isNaN(n) || n <= 0 || n > max) return null
  return n
}

function parseOptionalBoolean(val: unknown): boolean | null {
  if (typeof val === 'boolean') return val
  if (val === 'true') return true
  if (val === 'false') return false
  return null
}

function parseSteps(raw: unknown): ProtocolStep[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_STEPS) return null

  const steps: ProtocolStep[] = []
  for (const [index, step] of raw.entries()) {
    if (typeof step !== 'object' || step === null) return null

    const type = (step as Record<string, unknown>).type === 'cold' ? 'cold' : (step as Record<string, unknown>).type === 'hot' ? 'hot' : null
    const durationSec = parseOptionalPositiveInt((step as Record<string, unknown>).durationSec, MAX_DURATION)
    const id = typeof (step as Record<string, unknown>).id === 'string'
      ? (step as Record<string, unknown>).id as string
      : `step_${index + 1}`

    if (!type || !durationSec || durationSec < 5) return null

    steps.push({
      id,
      type,
      durationSec,
    })
  }

  return steps
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
    const {
      name,
      steps,
      progressionEnabled,
      increaseStepSec,
      increaseEveryNDays,
      maxColdDurationSec,
    } = req.body

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      res.status(400).json({ error: 'Invalid name' })
      return
    }

    const parsedSteps = parseSteps(steps)
    if (!parsedSteps) {
      res.status(400).json({ error: 'Invalid steps' })
      return
    }

    let parsedProgressionEnabled: boolean | undefined
    if (progressionEnabled !== undefined) {
      parsedProgressionEnabled = parseOptionalBoolean(progressionEnabled) ?? undefined
      if (parsedProgressionEnabled === undefined) {
        res.status(400).json({ error: 'Invalid progressionEnabled' })
        return
      }
    }

    const preset = await createPreset(req.userId!, {
      name: name.trim(),
      steps: parsedSteps,
      progressionEnabled: parsedProgressionEnabled,
      increaseStepSec:
        increaseStepSec !== undefined ? parseOptionalPositiveInt(increaseStepSec, MAX_DURATION) : undefined,
      increaseEveryNDays:
        increaseEveryNDays !== undefined
          ? parseOptionalPositiveInt(increaseEveryNDays, MAX_PROGRESS_DAYS)
          : undefined,
      maxColdDurationSec:
        maxColdDurationSec !== undefined ? parseOptionalPositiveInt(maxColdDurationSec, MAX_DURATION) : undefined,
    })

    res.status(201).json(preset)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    res.status(msg.startsWith('Invalid') || msg.startsWith('Progression') ? 400 : 500).json({ error: msg })
  }
})

presetsRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      steps,
      progressionEnabled,
      increaseStepSec,
      increaseEveryNDays,
      maxColdDurationSec,
    } = req.body

    const data: Record<string, unknown> = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
        res.status(400).json({ error: 'Invalid name' })
        return
      }
      data.name = name.trim()
    }

    if (steps !== undefined) {
      const parsedSteps = parseSteps(steps)
      if (!parsedSteps) {
        res.status(400).json({ error: 'Invalid steps' })
        return
      }
      data.steps = parsedSteps
    }

    if (progressionEnabled !== undefined) {
      const v = parseOptionalBoolean(progressionEnabled)
      if (v === null) {
        res.status(400).json({ error: 'Invalid progressionEnabled' })
        return
      }
      data.progressionEnabled = v
    }
    if (increaseStepSec !== undefined) {
      const v = parseOptionalPositiveInt(increaseStepSec, MAX_DURATION)
      if (!v) {
        res.status(400).json({ error: 'Invalid increaseStepSec' })
        return
      }
      data.increaseStepSec = v
    }
    if (increaseEveryNDays !== undefined) {
      const v = parseOptionalPositiveInt(increaseEveryNDays, MAX_PROGRESS_DAYS)
      if (!v) {
        res.status(400).json({ error: 'Invalid increaseEveryNDays' })
        return
      }
      data.increaseEveryNDays = v
    }
    if (maxColdDurationSec !== undefined) {
      const v = parseOptionalPositiveInt(maxColdDurationSec, MAX_DURATION)
      if (!v) {
        res.status(400).json({ error: 'Invalid maxColdDurationSec' })
        return
      }
      data.maxColdDurationSec = v
    }

    const preset = await updatePreset(req.userId!, req.params.id, data)
    res.json(preset)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    const status =
      msg === 'Preset not found'
        ? 404
        : msg.startsWith('Invalid') || msg.startsWith('Progression')
          ? 400
          : 500
    res.status(status).json({ error: msg })
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
