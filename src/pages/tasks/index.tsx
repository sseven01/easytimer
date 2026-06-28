import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedPage } from '@/components/shared/AnimatedPage'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import { useTasksStore } from './store'
import TaskDialog from './components/TaskDialog'
import type { Task, ActionType } from '@/types'

const TYPE_LABELS: Record<ActionType, string> = {
  webpage: '网页',
  reminder: '提醒',
  shutdown: '关机',
  restart: '重启',
  hibernate: '休眠',
  lock: '锁屏',
  open_folder: '文件夹',
  open_file: '文件',
  run_command: '命令',
  run_script: '脚本',
  monitor_off: '关显示器',
  empty_recycle: '清回收站',
  logoff: '注销',
  close_program: '关程序',
  send_udp: 'UDP消息',
  auto_screenshot: '截屏',
}

const TYPE_COLORS: Record<ActionType, string> = {
  webpage: 'bg-blue-500/20 text-blue-400',
  reminder: 'bg-yellow-500/20 text-yellow-400',
  shutdown: 'bg-red-500/20 text-red-400',
  restart: 'bg-green-500/20 text-green-400',
  hibernate: 'bg-purple-500/20 text-purple-400',
  lock: 'bg-gray-500/20 text-gray-400',
  open_folder: 'bg-orange-500/20 text-orange-400',
  open_file: 'bg-amber-500/20 text-amber-400',
  run_command: 'bg-cyan-500/20 text-cyan-400',
  run_script: 'bg-teal-500/20 text-teal-400',
  monitor_off: 'bg-slate-500/20 text-slate-400',
  empty_recycle: 'bg-lime-500/20 text-lime-400',
  logoff: 'bg-rose-500/20 text-rose-400',
  close_program: 'bg-pink-500/20 text-pink-400',
  send_udp: 'bg-indigo-500/20 text-indigo-400',
  auto_screenshot: 'bg-violet-500/20 text-violet-400',
}

function TasksPage() {
  const { tasks, loading, fetchTasks, deleteTask, toggleTask } = useTasksStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  function handleEdit(task: Task) {
    setEditingTask(task)
    setDialogOpen(true)
  }

  function handleNew() {
    setEditingTask(null)
    setDialogOpen(true)
  }

  function handleClose() {
    setDialogOpen(false)
    setEditingTask(null)
  }

  async function handleDelete(id: number) {
    await deleteTask(id)
  }

  async function handleToggle(task: Task) {
    if (task.id !== null) {
      await toggleTask(task.id, !task.enabled)
    }
  }

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">定时任务</h1>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            新建任务
          </Button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
            <p>加载中...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
            <p>暂无任务，点击上方按钮创建第一个任务。</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium w-16">开关</th>
                  <th className="px-4 py-3 font-medium">名称</th>
                  <th className="px-4 py-3 font-medium">类型</th>
                  <th className="px-4 py-3 font-medium">触发器</th>
                  <th className="px-4 py-3 font-medium w-24">操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className={`border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                      !task.enabled ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <ToggleSwitch
                        checked={task.enabled}
                        onChange={() => handleToggle(task)}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{task.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          TYPE_COLORS[task.action_type]
                        }`}
                      >
                        {TYPE_LABELS[task.action_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {task.triggers && task.triggers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {task.triggers.slice(0, 3).map((tr) => (
                            <span key={tr.id} className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono ${
                              tr.enabled ? 'bg-purple-500/20 text-purple-400' : 'bg-muted text-muted-foreground line-through'
                            }`}>
                              {tr.cron_expression}
                            </span>
                          ))}
                          {task.triggers.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{task.triggers.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">无触发器</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(task)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => task.id !== null && handleDelete(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {dialogOpen && (
          <TaskDialog task={editingTask} onClose={handleClose} onSaved={fetchTasks} />
        )}
      </div>
    </AnimatedPage>
  )
}

export default TasksPage
