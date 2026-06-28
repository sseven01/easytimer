import { useState, useEffect } from 'react'
import { X, Plus, Trash2, FolderOpen, File, Terminal, FileText, MonitorOff, LogOut, XCircle, Wifi, Camera, Globe, Bell, Power, RefreshCw, Moon, Lock, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createTask, updateTask, getTriggers, addTrigger, deleteTrigger, toggleTrigger } from '@/services/task'
import { CronHelper } from '@/components/shared/CronHelper'
import { cronToChinese } from '@/utils/cron'
import type { Task, ActionType, Trigger } from '@/types'

const ACTION_TYPES: { value: ActionType; label: string; icon: React.ReactNode }[] = [
  { value: 'webpage', label: '打开网页', icon: <Globe className="h-4 w-4" /> },
  { value: 'reminder', label: '弹窗提醒', icon: <Bell className="h-4 w-4" /> },
  { value: 'shutdown', label: '系统关机', icon: <Power className="h-4 w-4" /> },
  { value: 'restart', label: '系统重启', icon: <RefreshCw className="h-4 w-4" /> },
  { value: 'hibernate', label: '系统休眠', icon: <Moon className="h-4 w-4" /> },
  { value: 'lock', label: '锁屏', icon: <Lock className="h-4 w-4" /> },
  { value: 'open_folder', label: '打开文件夹', icon: <FolderOpen className="h-4 w-4" /> },
  { value: 'open_file', label: '打开文件', icon: <File className="h-4 w-4" /> },
  { value: 'run_command', label: '执行命令', icon: <Terminal className="h-4 w-4" /> },
  { value: 'run_script', label: '执行脚本', icon: <FileText className="h-4 w-4" /> },
  { value: 'monitor_off', label: '关闭显示器', icon: <MonitorOff className="h-4 w-4" /> },
  { value: 'empty_recycle', label: '清空回收站', icon: <Trash2 className="h-4 w-4" /> },
  { value: 'logoff', label: '注销', icon: <LogOut className="h-4 w-4" /> },
  { value: 'close_program', label: '关闭程序', icon: <XCircle className="h-4 w-4" /> },
  { value: 'send_udp', label: '发送UDP消息', icon: <Wifi className="h-4 w-4" /> },
  { value: 'auto_screenshot', label: '自动截屏', icon: <Camera className="h-4 w-4" /> },
]

interface TaskDialogProps {
  task: Task | null
  onClose: () => void
  onSaved: () => void
}

function TaskDialog({ task, onClose, onSaved }: TaskDialogProps) {
  const [name, setName] = useState(task?.name ?? '')
  const [actionType, setActionType] = useState<ActionType>(task?.action_type ?? 'webpage')
  const [actionValue, setActionValue] = useState(task?.action_value ?? '')
  const [triggers, setTriggers] = useState<Trigger[]>(task?.triggers ?? [])
  const [pendingTriggers, setPendingTriggers] = useState<string[]>([])
  const [newCron, setNewCron] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAddTrigger, setShowAddTrigger] = useState(false)

  const isEdit = task?.id !== null && task?.id !== undefined

  useEffect(() => {
    if (isEdit && task?.id) {
      getTriggers(task.id).then(setTriggers).catch(() => {})
    }
  }, [isEdit, task?.id])

  async function handleSave() {
    setSaving(true)
    try {
      if (isEdit && task) {
        await updateTask({
          id: task.id,
          name,
          action_type: actionType,
          action_value: actionValue,
          enabled: task.enabled,
          created_at: null,
          updated_at: null,
        })
      } else {
        const taskId = await createTask({ name, action_type: actionType, action_value: actionValue })
        for (const cron of pendingTriggers) {
          await addTrigger(taskId, cron)
        }
      }
      // Add any new triggers that were added during creation
      onSaved()
      onClose()
    } catch (err) {
      console.error('保存失败:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddTrigger() {
    if (!newCron.trim()) return
    if (isEdit && task?.id) {
      try {
        const id = await addTrigger(task.id, newCron)
        setTriggers([...triggers, { id, task_id: task.id!, cron_expression: newCron, enabled: true, next_run_at: null, created_at: null }])
      } catch (err) {
        console.error('添加触发器失败:', err)
      }
    } else {
      setPendingTriggers([...pendingTriggers, newCron])
    }
    setNewCron('')
    setShowAddTrigger(false)
  }

  async function handleDeleteTrigger(id: number) {
    try {
      await deleteTrigger(id)
      setTriggers(triggers.filter(t => t.id !== id))
    } catch (err) {
      console.error('删除触发器失败:', err)
    }
  }

  async function handleToggleTrigger(id: number, enabled: boolean) {
    try {
      await toggleTrigger(id, enabled)
      setTriggers(triggers.map(t => t.id === id ? { ...t, enabled } : t))
    } catch (err) {
      console.error('切换触发器失败:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl bg-card border border-border shadow-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">{isEdit ? '编辑任务' : '新建任务'}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">任务名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="输入任务名称" />
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">动作类型</label>
            <div className="grid grid-cols-4 gap-2">
              {ACTION_TYPES.map((at) => (
                <button key={at.value} type="button" onClick={() => setActionType(at.value)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                    actionType === at.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}>
                  {at.icon}{at.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional fields */}
          {actionType === 'webpage' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">网页地址</label>
              <input type="text" value={actionValue} onChange={(e) => setActionValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://example.com" />
            </div>
          )}
          {actionType === 'reminder' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">提醒内容</label>
              <input type="text" value={actionValue} onChange={(e) => setActionValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="输入提醒内容" />
            </div>
          )}
          {actionType === 'open_folder' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">文件夹路径</label>
              <input type="text" value={actionValue} onChange={(e) => setActionValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="C:\Users\Documents" />
            </div>
          )}
          {actionType === 'open_file' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">文件路径</label>
              <input type="text" value={actionValue} onChange={(e) => setActionValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="C:\Users\Documents\file.txt" />
            </div>
          )}
          {actionType === 'run_command' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">命令</label>
              <input type="text" value={actionValue} onChange={(e) => setActionValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="ipconfig /all" />
            </div>
          )}
          {actionType === 'run_script' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">脚本路径</label>
              <input type="text" value={actionValue} onChange={(e) => setActionValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="C:\Scripts\backup.bat" />
            </div>
          )}
          {actionType === 'close_program' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">进程名</label>
              <input type="text" value={actionValue} onChange={(e) => setActionValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="notepad.exe" />
            </div>
          )}
          {actionType === 'send_udp' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">UDP消息 (格式: 主机$端口$消息)</label>
              <input type="text" value={actionValue} onChange={(e) => setActionValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="127.0.0.1$8080$Hello" />
            </div>
          )}
          {actionType === 'auto_screenshot' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">保存路径 (可选)</label>
              <input type="text" value={actionValue} onChange={(e) => setActionValue(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="留空则保存到图片目录" />
            </div>
          )}

          {/* Triggers */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">触发器 (定时规则)</label>
              <button type="button" onClick={() => setShowAddTrigger(!showAddTrigger)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                <Plus className="h-3.5 w-3.5" /> 添加
              </button>
            </div>

            {/* Existing triggers */}
            {triggers.length > 0 || pendingTriggers.length > 0 ? (
              <div className="space-y-2">
                {triggers.map((tr) => (
                  <div key={tr.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <button type="button" onClick={() => handleToggleTrigger(tr.id!, !tr.enabled)}
                      className="shrink-0">
                      {tr.enabled ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <span className={`flex-1 text-xs ${tr.enabled ? '' : 'text-muted-foreground line-through'}`}>
                      {cronToChinese(tr.cron_expression)}
                    </span>
                    <button type="button" onClick={() => handleDeleteTrigger(tr.id!)}
                      className="shrink-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {pendingTriggers.map((cron, i) => (
                  <div key={`pending-${i}`} className="flex items-center gap-2 rounded-lg border border-dashed border-primary/50 px-3 py-2">
                    <span className="flex-1 text-xs text-primary">{cronToChinese(cron)}</span>
                    <span className="text-[10px] text-muted-foreground">待保存</span>
                    <button type="button" onClick={() => setPendingTriggers(pendingTriggers.filter((_, idx) => idx !== i))}
                      className="shrink-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">暂无触发器，点击"添加"创建</p>
            )}

            {/* Add trigger form */}
            {showAddTrigger && (
              <div className="mt-3 rounded-lg border border-dashed border-primary/50 p-3 space-y-3">
                <CronHelper value={newCron} onChange={setNewCron} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowAddTrigger(false); setNewCron('') }}>取消</Button>
                  <Button size="sm" onClick={handleAddTrigger} disabled={!newCron.trim()}>添加</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
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
