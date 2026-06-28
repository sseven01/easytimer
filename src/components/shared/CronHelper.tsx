import { useState, useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'
import { validateCron, previewCron } from '@/services/task'

interface CronHelperProps {
  value: string
  onChange: (cron: string) => void
}

type Mode = 'quick' | 'daily' | 'weekly' | 'monthly' | 'interval' | 'advanced'

const WEEKDAYS = [
  { value: 0, label: '日' },
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
]

const MODES: { value: Mode; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'interval', label: '间隔' },
  { value: 'advanced', label: '高级' },
]

export function CronHelper({ value, onChange }: CronHelperProps) {
  const [mode, setMode] = useState<Mode>('daily')
  const [preview, setPreview] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Form state
  const [time, setTime] = useState('09:00')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1])
  const [selectedDays, setSelectedDays] = useState<number[]>([1])
  const [intervalValue, setIntervalValue] = useState(5)
  const [intervalUnit, setIntervalUnit] = useState<'seconds' | 'minutes' | 'hours'>('minutes')

  // Generate cron from form
  useEffect(() => {
    const [h, m] = time.split(':')
    const hour = h || '0'
    const minute = m || '0'

    let cron = ''
    switch (mode) {
      case 'daily':
        cron = `0 ${minute} ${hour} * * ?`
        break
      case 'weekly':
        cron = `0 ${minute} ${hour} * * ${selectedWeekdays.join(',')}`
        break
      case 'monthly':
        cron = `0 ${minute} ${hour} ${selectedDays.join(',')} * ?`
        break
      case 'interval': {
        if (intervalUnit === 'hours') {
          cron = `0 0 */${intervalValue} * * ?`
        } else if (intervalUnit === 'minutes') {
          cron = `0 */${intervalValue} * * * ?`
        } else {
          cron = `*/${intervalValue} * * * * ?`
        }
        break
      }
      case 'advanced':
        return // Don't update value from form in advanced mode
    }
    if (cron) onChange(cron)
  }, [mode, time, selectedWeekdays, selectedDays, intervalValue, intervalUnit])

  // Preview
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setPreview([]); return }
    debounceRef.current = setTimeout(() => {
      let cancelled = false
      validateCron(value).then(ok => {
        if (cancelled) return
        if (ok) {
          previewCron(value, 1).then(p => { if (!cancelled) setPreview(p) }).catch(() => {})
        } else {
          setPreview([])
        }
      }).catch(() => {})
      return () => { cancelled = true }
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [value])

  function toggleWeekday(d: number) {
    setSelectedWeekdays(prev => prev.includes(d) ? prev.filter(v => v !== d) : [...prev, d])
  }

  function toggleDay(d: number) {
    setSelectedDays(prev => prev.includes(d) ? prev.filter(v => v !== d) : [...prev, d])
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">定时规则</label>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted">
        {MODES.map(m => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              mode === m.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Form fields */}
      {(mode === 'daily' || mode === 'weekly' || mode === 'monthly') && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">执行时间</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {mode === 'weekly' && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">选择星期</label>
          <div className="flex gap-1.5">
            {WEEKDAYS.map(w => (
              <button
                key={w.value}
                type="button"
                onClick={() => toggleWeekday(w.value)}
                className={`h-9 w-9 rounded-lg text-xs font-medium transition-colors ${
                  selectedWeekdays.includes(w.value)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'monthly' && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">选择日期</label>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                  selectedDays.includes(d)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'interval' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">间隔</label>
            <input
              type="number"
              min={1}
              value={intervalValue}
              onChange={(e) => setIntervalValue(Number(e.target.value) || 1)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">单位</label>
            <select
              value={intervalUnit}
              onChange={(e) => setIntervalUnit(e.target.value as typeof intervalUnit)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="seconds">秒</option>
              <option value="minutes">分钟</option>
              <option value="hours">小时</option>
            </select>
          </div>
        </div>
      )}

      {mode === 'advanced' && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Cron 表达式 (秒 分 时 日 月 星期)</label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="0 30 12 * * ?"
          />
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1.5">
            <Clock className="h-3 w-3" />
            下次执行时间
          </label>
          <div className="rounded-lg bg-muted/50 p-2 space-y-0.5">
            {preview.map((t, i) => (
              <div key={i} className="text-xs font-mono text-foreground">{t}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
