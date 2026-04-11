import { Router } from 'express'
import { authRouter } from './auth'
import { presetsRouter } from './presets'
import { sessionsRouter } from './sessions'
import { statsRouter } from './stats'

export const router = Router()

router.use('/auth', authRouter)
router.use('/presets', presetsRouter)
router.use('/sessions', sessionsRouter)
router.use('/stats', statsRouter)
