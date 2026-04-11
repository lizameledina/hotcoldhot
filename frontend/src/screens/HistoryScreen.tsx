import React, { useEffect, useState } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { sessionsApi } from '../api'
import type { Session } from '../types'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatDur(sec: number): string {
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
      setSessions((s) => [...s, ...data.sessions])
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
        {total > 0 && (
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{total} сессий</span>
        )}
      </div>

      <div className="screen" style={{ paddingTop: 8 }}>
        {loading ? (
          <div className="loading" style={{ height: 200 }}>Загрузка...</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🚿</div>
            <p className="empty-state-text">Ещё не было ни одной сессии.<br />Начните прямо сейчас!</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigateToSessionDetail(s)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 16px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    gap: 12,
                  }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: s.status === 'COMPLETED' ? 'rgba(74,158,255,0.15)' : 'rgba(139,143,168,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}>
                    {s.status === 'COMPLETED' ? '✅' : '⚠️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
                      {(s.presetSnapshot as { name?: string })?.name ?? 'Без названия'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {formatDate(s.startedAt)} · {formatTime(s.startedAt)} · {formatDur(s.totalActualSec)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {s.completedCycles}/{s.plannedCycles} цикл.
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>›</span>
                </button>
              ))}
            </div>

            {sessions.length < total && (
              <button
                className="btn btn-secondary"
                style={{ marginTop: 16 }}
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
