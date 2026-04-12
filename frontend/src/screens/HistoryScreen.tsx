import React, { useEffect, useState } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { sessionsApi } from '../api'
import type { Session } from '../types'

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}с`
  return `${Math.floor(sec / 60)}м ${sec % 60}с`
}

export function HistoryScreen() {
  const { goBack, navigateToSessionDetail } = useNavigationStore()
  const [sessions, setSessions] = useState<Session[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    setLoading(true)
    sessionsApi.getAll(1)
      .then((data) => {
        setSessions(data.sessions)
        setTotal(data.total)
        setPage(1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const data = await sessionsApi.getAll(page + 1)
      setSessions((current) => [...current, ...data.sessions])
      setPage(page + 1)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>‹</button>
        <span className="topbar-title">История</span>
        {total > 0 && <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{total} сессий</span>}
      </div>

      <div className="screen" style={{ paddingTop: 8 }}>
        {loading ? (
          <div className="loading" style={{ height: 200 }}>Загрузка...</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🚿</div>
            <p className="empty-state-text">Ещё не было ни одной сессии.<br />Начните прямо сейчас.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => navigateToSessionDetail(session)}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '15px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: session.status === 'COMPLETED' ? 'var(--surface-cold)' : 'rgba(180, 174, 168, 0.14)',
                      color: session.status === 'COMPLETED' ? 'var(--color-cold)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {session.status === 'COMPLETED' ? '✓' : '–'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>
                      {(session.presetSnapshot as { name?: string })?.name ?? 'Без названия'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {formatDate(session.startedAt)} · {formatTime(session.startedAt)} · {formatDuration(session.totalActualSec)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {session.completedCycles}/{session.plannedCycles}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {sessions.length < total && (
              <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
