import { Router } from 'express'
import { authRouter } from './auth'
import { presetsRouter } from './presets'
import { sessionsRouter } from './sessions'
import { statsRouter } from './stats'
import { settingsRouter } from './settings'

export const router = Router()

router.use('/auth', authRouter)
router.use('/presets', presetsRouter)
router.use('/sessions', sessionsRouter)
router.use('/stats', statsRouter)
router.use('/settings', settingsRouter)
