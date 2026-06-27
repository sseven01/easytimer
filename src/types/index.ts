export type ActionType = 'webpage' | 'reminder' | 'shutdown' | 'restart' | 'hibernate' | 'lock'
export type ScheduleType = 'once' | 'interval' | 'daily' | 'weekly' | 'monthly'

export interface ScheduleConf {
  datetime?: string
  interval?: number
  unit?: 'seconds' | 'minutes' | 'hours'
  time?: string
  weekdays?: number[]
  days?: number[]
}

export interface Task {
  id: number | null
  name: string
  action_type: ActionType
  action_value: string
  schedule_type: ScheduleType
  schedule_conf: ScheduleConf
  enabled: boolean
  next_run_at: string | null
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
