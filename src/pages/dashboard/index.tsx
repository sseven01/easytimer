import { useEffect, useState } from 'react'
import { Activity, Clock, ListTodo, CheckCircle2 } from 'lucide-react'
import { getTasks, getLogs } from '@/services/task'
import type { Task, LogEntry } from '@/types'

function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    getTasks().then(setTasks).catch(() => {})
    getLogs().then(setLogs).catch(() => {})
  }, [])

  const totalTasks = tasks.length
  const enabledTasks = tasks.filter((t) => t.enabled).length
  const recentLogs = logs.length

  const stats = [
    { label: 'Total Tasks', value: String(totalTasks), icon: ListTodo, color: 'text-blue-500' },
    { label: 'Enabled Tasks', value: String(enabledTasks), icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Recent Logs', value: String(recentLogs), icon: Activity, color: 'text-amber-500' },
    { label: 'Next Run', value: tasks.find((t) => t.enabled && t.next_run_at)?.next_run_at
      ? (() => {
          const d = new Date(tasks.find((t) => t.enabled && t.next_run_at)!.next_run_at!)
          return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        })()
      : '—', icon: Clock, color: 'text-emerald-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="mt-2 text-2xl font-semibold">{stat.value}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DashboardPage
