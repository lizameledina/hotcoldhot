import React, { useEffect, useState } from 'react'
import { useAuthStore } from './store/authStore'
import { useNavigationStore } from './store/navigationStore'
import { useSettingsStore } from './store/settingsStore'
import { useSessionStore } from './store/sessionStore'
import { useTelegram } from './hooks/useTelegram'
import { authApi } from './api'

import { HomeScreen } from './screens/HomeScreen'
import { PresetsScreen } from './screens/PresetsScreen'
import { CreatePresetScreen } from './screens/CreatePresetScreen'
import { SessionScreen } from './screens/SessionScreen'
import { ResultScreen } from './screens/ResultScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { SessionDetailScreen } from './screens/SessionDetailScreen'
import { StatsScreen } from './screens/StatsScreen'
import { SettingsScreen } from './screens/SettingsScreen'

export default function App() {
  const { isAuthenticated, setAuth, setLoading, setError, token } = useAuthStore()
  const { screen } = useNavigationStore()
  const { editingPreset } = useNavigationStore()
  const { theme, syncFromServer } = useSettingsStore()
  const { active } = useSessionStore()
  const { tg, initData, isInTelegram } = useTelegram()
  const [bootstrapping, setBootstrapping] = useState(true)
  const { user } = useAuthStore()

  // Apply theme to root
  useEffect(() => {
    const root = document.documentElement
    const palette = {
      '--color-hot': '#FF5A2F',
      '--color-hot-bg': 'rgba(255, 90, 47, 0.12)',
      '--color-cold': '#2F6BFF',
      '--color-cold-bg': 'rgba(47, 107, 255, 0.12)',
      '--color-break': '#8A8F98',
      '--color-break-bg': 'rgba(138, 143, 152, 0.14)',
      '--bg-primary': '#FFFFFF',
      '--bg-secondary': '#F7F8FB',
      '--bg-card': '#FFFFFF',
      '--bg-card-hover': '#F7F8FB',
      '--text-primary': '#0F1115',
      '--text-secondary': '#4D5360',
      '--text-muted': '#8A8F98',
      '--border': 'rgba(15, 17, 21, 0.1)',
      '--surface-warm': 'rgba(255, 177, 153, 0.3)',
      '--surface-cold': 'rgba(167, 200, 255, 0.3)',
      '--shadow-soft': '0 8px 24px rgba(15, 17, 21, 0.04)',
    }

    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }, [theme])

  useEffect(() => {
    syncFromServer(user?.settings)
  }, [syncFromServer, user?.settings])

  // Bootstrap: init Telegram and authenticate
  useEffect(() => {
    async function bootstrap() {
      // Initialize Telegram WebApp
      if (tg) {
        tg.ready()
        tg.expand()
      }

      // If already have a token, skip re-auth
      if (token && isAuthenticated) {
        setBootstrapping(false)
        return
      }

      setLoading(true)
      try {
        // Use real initData in production, mock in dev
        const data = isInTelegram ? initData : 'mock'
        const result = await authApi.telegram(data)
        setAuth(result.token, result.user)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auth failed')
      } finally {
        setLoading(false)
        setBootstrapping(false)
      }
    }

    bootstrap()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (bootstrapping) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        gap: 16,
      }}>
        <div style={{ fontSize: 64 }} className="pulse">🚿</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 16,
      }}>
        <div style={{ fontSize: 64 }}>🚿</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center' }}>Контрастный душ</h1>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
          Не удалось выполнить вход. Пожалуйста, откройте приложение через Telegram.
        </p>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {renderScreen(screen, editingPreset)}
    </div>
  )
}

function renderScreen(screen: string, editingPreset: import('./types').Preset | null) {
  switch (screen) {
    case 'home': return <HomeScreen />
    case 'presets': return <PresetsScreen />
    case 'create-preset': return <CreatePresetScreen />
    case 'edit-preset': return <CreatePresetScreen editingPreset={editingPreset ?? undefined} />
    case 'session': return <SessionScreen />
    case 'result': return <ResultScreen />
    case 'history': return <HistoryScreen />
    case 'session-detail': return <SessionDetailScreen />
    case 'stats': return <StatsScreen />
    case 'settings': return <SettingsScreen />
    default: return <HomeScreen />
  }
}
