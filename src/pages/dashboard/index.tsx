import { AnimatedPage } from '@/components/shared/AnimatedPage'
import { useTasksStore } from '@/pages/tasks/store'
import { useEffect, useState } from 'react'
import { getLogs } from '@/services/task'
import type { LogEntry, ActionType } from '@/types'
import { CheckCircle, XCircle, Zap, Calendar, AlertCircle } from 'lucide-react'

const TYPE_LABELS: Record<ActionType, string> = {
  webpage: '网页', reminder: '提醒', shutdown: '关机', restart: '重启',
  hibernate: '休眠', lock: '锁屏', open_folder: '文件夹', open_file: '文件',
  run_command: '命令', run_script: '脚本', monitor_off: '关显示器',
  empty_recycle: '清回收站', logoff: '注销', close_program: '关程序',
  send_udp: 'UDP', auto_screenshot: '截屏',
}

const TYPE_COLORS: Record<ActionType, string> = {
  webpage: 'bg-blue-500', reminder: 'bg-yellow-500', shutdown: 'bg-red-500',
  restart: 'bg-green-500', hibernate: 'bg-purple-500', lock: 'bg-gray-500',
  open_folder: 'bg-orange-500', open_file: 'bg-amber-500', run_command: 'bg-cyan-500',
  run_script: 'bg-teal-500', monitor_off: 'bg-slate-500', empty_recycle: 'bg-lime-500',
  logoff: 'bg-rose-500', close_program: 'bg-pink-500', send_udp: 'bg-indigo-500',
  auto_screenshot: 'bg-violet-500',
}

function formatCountdown(nextRun: string): string {
  const now = new Date()
  const target = new Date(nextRun)
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return '即将执行'
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  if (hours > 0) return `${hours}时${minutes}分`
  if (minutes > 0) return `${minutes}分${seconds}秒`
  return `${seconds}秒`
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

function DashboardPage() {
  const { tasks, fetchTasks } = useTasksStore()
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    fetchTasks()
    getLogs().then(setLogs).catch(() => {})
  }, [fetchTasks])

  const activeCount = tasks.filter(t => t.enabled).length
  const disabledCount = tasks.filter(t => !t.enabled).length

  // 找到最近的下次执行任务
  const nextTask = tasks
    .filter(t => t.enabled && t.next_run_at)
    .sort((a, b) => new Date(a.next_run_at!).getTime() - new Date(b.next_run_at!).getTime())[0]

  // 按类型统计
  const typeCount: Record<string, number> = {}
  tasks.forEach(t => {
    typeCount[t.action_type] = (typeCount[t.action_type] || 0) + 1
  })
  const typeStats = Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  // 成功/失败统计
  const successCount = logs.filter(l => l.status === 'success').length
  const failCount = logs.filter(l => l.status === 'failed').length

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>

        {/* 统计卡片 */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Calendar className="h-3.5 w-3.5" />
              任务总数
            </div>
            <p className="mt-2 text-3xl font-bold">{tasks.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              启用 <span className="text-green-500 font-medium">{activeCount}</span> / 禁用 {disabledCount}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Zap className="h-3.5 w-3.5" />
              下次执行
            </div>
            {nextTask ? (
              <>
                <p className="mt-2 text-lg font-bold truncate">{nextTask.name}</p>
                <p className="mt-1 text-xs text-primary font-medium">
                  {formatCountdown(nextTask.next_run_at!)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-lg font-bold text-muted-foreground">暂无</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <CheckCircle className="h-3.5 w-3.5" />
              执行成功
            </div>
            <p className="mt-2 text-3xl font-bold text-green-500">{successCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              最近 {logs.length} 条日志
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              执行失败
            </div>
            <p className="mt-2 text-3xl font-bold text-red-500">{failCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {logs.length > 0 ? `成功率 ${Math.round(successCount / logs.length * 100)}%` : '暂无数据'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* 任务类型分布 */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">任务类型分布</h3>
            {typeStats.length > 0 ? (
              <div className="space-y-3">
                {typeStats.map(([type, count]) => {
                  const pct = tasks.length > 0 ? Math.round(count / tasks.length * 100) : 0
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{TYPE_LABELS[type as ActionType] || type}</span>
                        <span className="text-muted-foreground">{count} 个 ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${TYPE_COLORS[type as ActionType] || 'bg-gray-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">暂无任务</p>
            )}
          </div>

          {/* 最近执行日志 */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">最近执行</h3>
            {logs.length > 0 ? (
              <div className="space-y-2">
                {logs.slice(0, 8).map(log => (
                  <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    {log.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.task_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{log.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {log.executed_at ? formatTime(log.executed_at) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">暂无执行记录</p>
            )}
          </div>
        </div>
      </div>
    </AnimatedPage>
  )
}

export default DashboardPage
