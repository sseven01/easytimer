import { useState, useEffect, useCallback } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

interface NotificationData {
  title: string
  body: string
  task_id?: number
}

type Theme = 'dark' | 'light'

const THEMES = {
  dark: {
    card: '#1e293b',
    border: '#334155',
    headerBg: '#1e293b',
    title: '#f1f5f9',
    body: '#cbd5e1',
    close: '#64748b',
    closeHover: '#94a3b8',
    footerBg: '#0f172a',
    footerText: '#64748b',
  },
  light: {
    card: '#ffffff',
    border: '#e2e8f0',
    headerBg: '#f8fafc',
    title: '#0f172a',
    body: '#475569',
    close: '#94a3b8',
    closeHover: '#64748b',
    footerBg: '#f1f5f9',
    footerText: '#94a3b8',
  },
}

export function NotificationWindow() {
  const [notif, setNotif] = useState<NotificationData | null>(null)
  const [theme, setTheme] = useState<Theme>('dark')
  const [animClass, setAnimClass] = useState('anim-right')

  const dismiss = useCallback(() => setNotif(null), [])

  const applyTheme = useCallback(async () => {
    try {
      const [t, dir] = await Promise.all([
        invoke<string>('get_setting', { key: 'theme' }),
        invoke<string>('get_setting', { key: 'notification_direction' }),
      ])
      let resolved: Theme = 'dark'
      if (t === 'light') {
        resolved = 'light'
      } else if (t === 'system' || !t) {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      setTheme(resolved)
      document.documentElement.classList.toggle('light', resolved === 'light')

      const direction = dir || 'right'
      setAnimClass(`anim-${direction}`)
    } catch {}
  }, [])

  useEffect(() => {
    applyTheme()
  }, [applyTheme])

  useEffect(() => {
    const unlisten = listen<NotificationData>('show-notification', (event) => {
      applyTheme()
      setNotif(null)
      requestAnimationFrame(() => {
        setNotif(event.payload)
      })
      setTimeout(dismiss, 5000)
    })
    return () => { unlisten.then((fn) => fn()) }
  }, [dismiss, applyTheme])

  if (!notif) return null

  const c = THEMES[theme]

  return (
    <div className={animClass} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: c.card }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: c.headerBg,
        borderBottom: `1px solid ${c.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 16 }}>🔔</span>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: c.title }}>
          {notif.title || 'EasyTimer 提醒'}
        </div>
        <button
          type="button"
          onClick={dismiss}
          style={{
            background: 'none',
            border: 'none',
            color: c.close,
            cursor: 'pointer',
            fontSize: 16,
            padding: 4,
            lineHeight: 1,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.color = c.closeHover }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.color = c.close }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '16px 20px', overflow: 'hidden' }}>
        <p style={{ fontSize: 16, color: c.body, lineHeight: 1.7, width: '100%', wordBreak: 'break-word' }}>
          {notif.body}
        </p>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        background: c.footerBg,
        borderTop: `1px solid ${c.border}`,
        fontSize: 12,
        color: c.footerText,
        flexShrink: 0,
      }}>
        🕐 {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  )
}
