export type ActionType = 'webpage' | 'reminder' | 'shutdown' | 'restart' | 'hibernate' | 'lock' | 'open_folder' | 'open_file' | 'run_command' | 'run_script' | 'monitor_off' | 'empty_recycle' | 'logoff' | 'close_program' | 'send_udp' | 'auto_screenshot'

export interface Trigger {
  id: number | null
  task_id: number
  cron_expression: string
  enabled: boolean
  next_run_at: string | null
  created_at: string | null
}

export interface Task {
  id: number | null
  name: string
  action_type: ActionType
  action_value: string
  enabled: boolean
  created_at: string | null
  updated_at: string | null
  triggers?: Trigger[]
}

export interface LogEntry {
  id: number
  task_id: number
  task_name: string
  action: string
  status: string
  message: string
  executed_at: string
}
