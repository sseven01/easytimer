import { tauriInvoke } from './base'
import type { Task, LogEntry } from '@/types'

export async function getTasks(): Promise<Task[]> {
  return tauriInvoke<Task[]>('get_tasks')
}

export async function getTask(id: number): Promise<Task> {
  return tauriInvoke<Task>('get_task', { id })
}

export async function createTask(task: Omit<Task, 'id' | 'next_run_at'>): Promise<number> {
  // Pass individual parameters to match Rust command signature
  return tauriInvoke<number>('create_task', {
    name: task.name,
    actionType: task.action_type,
    actionValue: task.action_value,
    scheduleType: task.schedule_type,
    scheduleConf: task.schedule_conf,
  })
}

export async function updateTask(task: Task): Promise<void> {
  return tauriInvoke<void>('update_task', {
    id: task.id,
    name: task.name,
    actionType: task.action_type,
    actionValue: task.action_value,
    scheduleType: task.schedule_type,
    scheduleConf: task.schedule_conf,
    enabled: task.enabled,
  })
}

export async function deleteTask(id: number): Promise<void> {
  return tauriInvoke<void>('delete_task', { id })
}

export async function toggleTask(id: number, enabled: boolean): Promise<void> {
  return tauriInvoke<void>('toggle_task', { id, enabled })
}

export async function getLogs(): Promise<LogEntry[]> {
  return tauriInvoke<LogEntry[]>('get_logs')
}

export async function clearLogs(): Promise<void> {
  return tauriInvoke<void>('clear_logs')
}

export async function getSetting(key: string): Promise<string | null> {
  return tauriInvoke<string | null>('get_setting', { key })
}

export async function setSetting(key: string, value: string): Promise<void> {
  return tauriInvoke<void>('set_setting', { key, value })
}
