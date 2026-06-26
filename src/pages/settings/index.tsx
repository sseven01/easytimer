import { useState, useEffect } from 'react'
import { useThemeStore } from '@/store/theme'
import { getSetting, setSetting } from '@/services/task'

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function SettingsPage() {
  const { theme, setTheme } = useThemeStore()
  const [autoStart, setAutoStart] = useState(false)
  const [minimizeTray, setMinimizeTray] = useState(false)
  const [notifSound, setNotifSound] = useState(false)

  useEffect(() => {
    getSetting('auto_start').then((v) => setAutoStart(v === 'true')).catch(() => {})
    getSetting('minimize_to_tray').then((v) => setMinimizeTray(v === 'true')).catch(() => {})
    getSetting('notification_sound').then((v) => setNotifSound(v === 'true')).catch(() => {})
  }, [])

  function saveSetting(key: string, value: boolean) {
    setSetting(key, String(value)).catch(() => {})
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
        <div className="flex items-center justify-between p-5">
          <div>
            <h3 className="text-sm font-medium">Appearance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Choose your preferred theme</p>
          </div>
          <div className="flex gap-2">
            {(['dark', 'light', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  theme === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-5">
          <div>
            <h3 className="text-sm font-medium">开机自启动</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Launch EasyTimer on system startup</p>
          </div>
          <ToggleSwitch
            checked={autoStart}
            onChange={(v) => { setAutoStart(v); saveSetting('auto_start', v) }}
          />
        </div>

        <div className="flex items-center justify-between p-5">
          <div>
            <h3 className="text-sm font-medium">最小化到托盘</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Keep running in the system tray when closed</p>
          </div>
          <ToggleSwitch
            checked={minimizeTray}
            onChange={(v) => { setMinimizeTray(v); saveSetting('minimize_to_tray', v) }}
          />
        </div>

        <div className="flex items-center justify-between p-5">
          <div>
            <h3 className="text-sm font-medium">提醒声音</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Play a sound when reminders trigger</p>
          </div>
          <ToggleSwitch
            checked={notifSound}
            onChange={(v) => { setNotifSound(v); saveSetting('notification_sound', v) }}
          />
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
