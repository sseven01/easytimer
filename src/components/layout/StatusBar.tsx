import { useState, useEffect } from 'react'
import { Circle } from 'lucide-react'
import { useTasksStore } from '@/pages/tasks/store'

function StatusBar() {
  const [time, setTime] = useState(() => new Date())
  const { tasks, fetchTasks } = useTasksStore()

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const activeCount = tasks.filter(t => t.enabled).length

  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-statusbar px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <Circle className="h-2 w-2 fill-green-500 text-green-500" />
          运行中
        </span>
        <span>{activeCount} 个任务</span>
      </div>
      <span>{time.toLocaleTimeString()}</span>
    </div>
  )
}

export default StatusBar
