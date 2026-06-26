import { useState, useEffect } from 'react'
import { Circle } from 'lucide-react'

function StatusBar() {
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-statusbar px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <Circle className="h-2 w-2 fill-green-500 text-green-500" />
          Running
        </span>
        <span>0 tasks</span>
      </div>
      <span>{time.toLocaleTimeString()}</span>
    </div>
  )
}

export default StatusBar
