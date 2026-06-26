import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createTask, updateTask } from '@/services/task'
import type { Task, ActionType, ScheduleType, ScheduleConf } from '@/types'

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'webpage', label: 'Webpage' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'shutdown', label: 'Shutdown' },
  { value: 'restart', label: 'Restart' },
  { value: 'hibernate', label: 'Hibernate' },
  { value: 'lock', label: 'Lock' },
]

const SCHEDULE_TYPES: { value: ScheduleType; label: string }[] = [
  { value: 'once', label: 'Once' },
  { value: 'interval', label: 'Interval' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const INTERVAL_UNITS = ['seconds', 'minutes', 'hours'] as const
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
      const payload: Omit<Task, 'id' | 'next_run_at'> = {
        name,
        action_type: actionType,
        action_value: actionValue,
        schedule_type: scheduleType,
        schedule_conf: conf,
        enabled: true,
      }
      if (isEdit && task) {
        await updateTask({ ...payload, id: task.id, next_run_at: task.next_run_at })
      } else {
        await createTask(payload)
      }
      onSaved()
      onClose()
    } catch {
      // error handled by service
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
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Task name"
            />
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Action Type</label>
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
              <label className="block text-sm font-medium mb-1.5">URL</label>
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
              <label className="block text-sm font-medium mb-1.5">Reminder Message</label>
              <input
                type="text"
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Reminder text"
              />
            </div>
          )}

          {/* Schedule Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Schedule</label>
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
              <label className="block text-sm font-medium mb-1.5">Date &amp; Time</label>
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
                <label className="block text-sm font-medium mb-1.5">Every</label>
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
                <label className="block text-sm font-medium mb-1.5">Unit</label>
                <select
                  value={conf.unit ?? 'minutes'}
                  onChange={(e) => setConf({ ...conf, unit: e.target.value as ScheduleConf['unit'] })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {INTERVAL_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {scheduleType === 'daily' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Time</label>
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
                <label className="block text-sm font-medium mb-1.5">Weekdays</label>
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
                <label className="block text-sm font-medium mb-1.5">Time</label>
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
                <label className="block text-sm font-medium mb-1.5">Days</label>
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
                <label className="block text-sm font-medium mb-1.5">Time</label>
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TaskDialog
