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
  const { theme } = useSettingsStore()
  const { active } = useSessionStore()
  const { tg, initData, isInTelegram } = useTelegram()
  const [bootstrapping, setBootstrapping] = useState(true)

  // Apply theme to root
  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'DARK' || (theme === 'SYSTEM' && prefersDark)
    if (!isDark) {
      // Light theme overrides
      root.style.setProperty('--bg-primary', '#f2f2f7')
      root.style.setProperty('--bg-secondary', '#ffffff')
      root.style.setProperty('--bg-card', '#ffffff')
      root.style.setProperty('--bg-card-hover', '#f5f5f5')
      root.style.setProperty('--text-primary', '#000000')
      root.style.setProperty('--text-secondary', '#6c6c80')
      root.style.setProperty('--text-muted', '#a0a0af')
      root.style.setProperty('--border', 'rgba(0,0,0,0.1)')
    } else {
      root.style.removeProperty('--bg-primary')
      root.style.removeProperty('--bg-secondary')
      root.style.removeProperty('--bg-card')
      root.style.removeProperty('--bg-card-hover')
      root.style.removeProperty('--text-primary')
      root.style.removeProperty('--text-secondary')
      root.style.removeProperty('--text-muted')
      root.style.removeProperty('--border')
    }
  }, [theme])

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
