import { AnimatedPage } from '@/components/shared/AnimatedPage'
import { useTasksStore } from '@/pages/tasks/store'
import { useEffect } from 'react'

function DashboardPage() {
  const { tasks, fetchTasks } = useTasksStore()

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const activeCount = tasks.filter(t => t.enabled).length
  const disabledCount = tasks.filter(t => !t.enabled).length

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">任务总数</h3>
            <p className="mt-2 text-3xl font-bold">{tasks.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">已启用</h3>
            <p className="mt-2 text-3xl font-bold text-green-500">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">已禁用</h3>
            <p className="mt-2 text-3xl font-bold text-muted-foreground">{disabledCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">下次执行</h3>
            <p className="mt-2 text-3xl font-bold">—</p>
          </div>
        </div>
      </div>
    </AnimatedPage>
  )
}

export default DashboardPage
