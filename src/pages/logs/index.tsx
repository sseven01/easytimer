import { useEffect, useState } from 'react'
import { getLogs, clearLogs } from '@/services/task'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { LogEntry } from '@/types'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLogs()
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleClear() {
    await clearLogs()
    setLogs([])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Logs</h1>
        {logs.length > 0 && (
          <Button variant="outline" onClick={handleClear} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
          <p>Loading...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
          <p>No log entries yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-muted-foreground w-24 shrink-0">
                  {formatDate(log.executed_at)}
                </span>
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm truncate">
                  <span className="font-medium">{log.task_name}</span>
                  {' — '}
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default LogsPage
