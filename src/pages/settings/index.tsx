import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { useThemeStore } from '@/store/theme'
import { getSetting, setSetting } from '@/services/task'
import { AnimatedPage } from '@/components/shared/AnimatedPage'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import type { AnimationDirection } from '@/components/shared/NotificationToast'

const DIRECTION_OPTIONS: { value: AnimationDirection; label: string; icon: string }[] = [
  { value: 'top', label: '顶部滑入', icon: '⬇️' },
  { value: 'bottom', label: '底部滑入', icon: '⬆️' },
  { value: 'left', label: '左侧滑入', icon: '➡️' },
  { value: 'right', label: '右侧滑入', icon: '⬅️' },
  { value: 'center', label: '中间弹出', icon: '💥' },
]

function SettingsPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useThemeStore()
  const [autoStart, setAutoStart] = useState(false)
  const [minimizeTray, setMinimizeTray] = useState(false)
  const [notifSound, setNotifSound] = useState(false)
  const [notifDirection, setNotifDirection] = useState<AnimationDirection>('right')

  useEffect(() => {
    // 统一使用 'true'/'false' 格式
    getSetting('auto_start').then((v) => setAutoStart(v === 'true')).catch(() => {})
    getSetting('minimize_to_tray').then((v) => setMinimizeTray(v === 'true')).catch(() => {})
    getSetting('notification_sound').then((v) => setNotifSound(v === 'true')).catch(() => {})
    getSetting('notification_direction').then((v) => {
      if (v) setNotifDirection(v as AnimationDirection)
    }).catch(() => {})
  }, [])

  function saveSetting(key: string, value: string) {
    setSetting(key, value).catch(() => {})
  }

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">设置</h1>

        <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
          {/* 外观主题 */}
          <div className="flex items-center justify-between p-5">
            <div>
              <h3 className="text-sm font-medium">外观主题</h3>
              <p className="text-xs text-muted-foreground mt-0.5">选择你喜欢的主题风格</p>
            </div>
            <div className="flex gap-2">
              {([
                { value: 'dark', label: '深色' },
                { value: 'light', label: '浅色' },
                { value: 'system', label: '跟随系统' },
              ] as const).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setTheme(t.value)
                    saveSetting('theme', t.value)
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    theme === t.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 开机自启动 */}
          <div className="flex items-center justify-between p-5">
            <div>
              <h3 className="text-sm font-medium">开机自启动</h3>
              <p className="text-xs text-muted-foreground mt-0.5">系统启动时自动运行 EasyTimer</p>
            </div>
            <ToggleSwitch
              checked={autoStart}
              onChange={(v) => {
                setAutoStart(v)
                saveSetting('auto_start', String(v))
                invoke('toggle_autostart', { enabled: v }).catch(() => {})
              }}
            />
          </div>

          {/* 最小化到托盘 */}
          <div className="flex items-center justify-between p-5">
            <div>
              <h3 className="text-sm font-medium">最小化到托盘</h3>
              <p className="text-xs text-muted-foreground mt-0.5">关闭窗口时最小化到系统托盘继续运行</p>
            </div>
            <ToggleSwitch
              checked={minimizeTray}
              onChange={(v) => {
                setMinimizeTray(v)
                saveSetting('minimize_to_tray', String(v))
              }}
            />
          </div>

          {/* 提醒声音 */}
          <div className="flex items-center justify-between p-5">
            <div>
              <h3 className="text-sm font-medium">提醒声音</h3>
              <p className="text-xs text-muted-foreground mt-0.5">提醒触发时播放提示音</p>
            </div>
            <ToggleSwitch
              checked={notifSound}
              onChange={(v) => {
                setNotifSound(v)
                saveSetting('notification_sound', String(v))
              }}
            />
          </div>

          {/* 弹窗动画方向 */}
          <div className="p-5">
            <div className="mb-3">
              <h3 className="text-sm font-medium">弹窗动画</h3>
              <p className="text-xs text-muted-foreground mt-0.5">选择提醒弹窗的出现方式</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DIRECTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setNotifDirection(opt.value)
                    saveSetting('notification_direction', opt.value)
                  }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    notifDirection === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 关于 */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <button
            type="button"
            onClick={() => navigate('/about')}
            className="flex items-center justify-between w-full p-5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div>
              <h3 className="text-sm font-medium">关于 EasyTimer</h3>
              <p className="text-xs text-muted-foreground mt-0.5">版本信息与版权声明</p>
            </div>
            <span className="text-muted-foreground">→</span>
          </button>
        </div>
      </div>
    </AnimatedPage>
  )
}

export default SettingsPage
