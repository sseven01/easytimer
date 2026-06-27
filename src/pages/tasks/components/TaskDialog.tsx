import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createTask, updateTask } from '@/services/task'
import type { Task, ActionType, ScheduleType, ScheduleConf } from '@/types'

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'webpage', label: '打开网页' },
  { value: 'reminder', label: '弹窗提醒' },
  { value: 'shutdown', label: '系统关机' },
  { value: 'restart', label: '系统重启' },
  { value: 'hibernate', label: '系统休眠' },
  { value: 'lock', label: '锁屏' },
]

const SCHEDULE_TYPES: { value: ScheduleType; label: string }[] = [
  { value: 'once', label: '一次性' },
  { value: 'interval', label: '间隔' },
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

const INTERVAL_UNITS = [
  { value: 'seconds', label: '秒' },
  { value: 'minutes', label: '分钟' },
  { value: 'hours', label: '小时' },
] as const

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

interface TaskDialogProps {
  task: Task | null
  onClose: () => void
  onSaved: () => void
}

function TaskDialog({ task, onClose, onSaved }: TaskDialogProps) {
  const [name, setName] = useState(task?.name ?? '')
  const [actionType, setActionType] = useState<ActionType>(task?.action_type ?? 'webpage')
  const [actionValue, setActionValue] = useState(task?.action_value ?? '')
  const [scheduleType, setScheduleType] = useState<ScheduleType>(task?.schedule_type ?? 'once')
  const [conf, setConf] = useState<ScheduleConf>(task?.schedule_conf ?? {})
  const [saving, setSaving] = useState(false)

  const isEdit = task?.id !== null && task?.id !== undefined

  async function handleSave() {
    setSaving(true)
    try {
      if (isEdit && task) {
        await updateTask({
          id: task.id,
          name,
          action_type: actionType,
          action_value: actionValue,
          schedule_type: scheduleType,
          schedule_conf: conf,
          enabled: task.enabled,
          next_run_at: task.next_run_at,
        })
      } else {
        await createTask({
          name,
          action_type: actionType,
          action_value: actionValue,
          schedule_type: scheduleType,
          schedule_conf: conf,
          enabled: true,
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      console.error('保存失败:', err)
    } finally {
      setSaving(false)
    }
  }

  function toggleWeekday(idx: number) {
    const current = conf.weekdays ?? []
    setConf({
      ...conf,
      weekdays: current.includes(idx) ? current.filter((d) => d !== idx) : [...current, idx],
    })
  }

  function toggleDay(day: number) {
    const current = conf.days ?? []
    setConf({
      ...conf,
      days: current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-card border border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">{isEdit ? '编辑任务' : '新建任务'}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">任务名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="输入任务名称"
            />
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">动作类型</label>
            <div className="flex flex-wrap gap-2">
              {ACTION_TYPES.map((at) => (
                <button
                  key={at.value}
                  type="button"
                  onClick={() => setActionType(at.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    actionType === at.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {at.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional fields */}
          {actionType === 'webpage' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">网页地址</label>
              <input
                type="text"
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://example.com"
              />
            </div>
          )}
          {actionType === 'reminder' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">提醒内容</label>
              <input
                type="text"
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="输入提醒内容"
              />
            </div>
          )}

          {/* 定时策略 */}
          <div>
            <label className="block text-sm font-medium mb-1.5">定时策略</label>
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_TYPES.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setScheduleType(st.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    scheduleType === st.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Config */}
          {scheduleType === 'once' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">日期和时间</label>
              <input
                type="datetime-local"
                value={conf.datetime ?? ''}
                onChange={(e) => setConf({ ...conf, datetime: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {scheduleType === 'interval' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">间隔时间</label>
                <input
                  type="number"
                  min={1}
                  value={conf.interval ?? ''}
                  onChange={(e) => setConf({ ...conf, interval: Number(e.target.value) })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="5"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5">单位</label>
                <select
                  value={conf.unit ?? 'minutes'}
                  onChange={(e) => setConf({ ...conf, unit: e.target.value as ScheduleConf['unit'] })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {INTERVAL_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {scheduleType === 'daily' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">执行时间</label>
              <input
                type="time"
                value={conf.time ?? ''}
                onChange={(e) => setConf({ ...conf, time: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {scheduleType === 'weekly' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">选择星期</label>
                <div className="flex gap-2">
                  {WEEKDAYS.map((day, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleWeekday(idx)}
                      className={`h-9 w-9 rounded-full text-xs font-medium transition-colors ${
                        (conf.weekdays ?? []).includes(idx)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">执行时间</label>
                <input
                  type="time"
                  value={conf.time ?? ''}
                  onChange={(e) => setConf({ ...conf, time: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {scheduleType === 'monthly' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">选择日期</label>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                        (conf.days ?? []).includes(day)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">执行时间</label>
                <input
                  type="time"
                  value={conf.time ?? ''}
                  onChange={(e) => setConf({ ...conf, time: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave} disabled={saving || !name}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TaskDialog
