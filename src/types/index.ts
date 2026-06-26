export interface Task {
  id: string
  name: string
  action_type: string
  action_value: string
  schedule_type: string
  schedule_conf: string
  enabled: boolean
  next_run_at: string | null
}

export interface LogEntry {
  id: string
  task_id: string
  task_name: string
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
}
