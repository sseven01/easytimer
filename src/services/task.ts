import { tauriInvoke } from './base'
import type { Task, LogEntry } from '@/types'

export async function getTasks(): Promise<Task[]> {
  return tauriInvoke<Task[]>('get_tasks')
}

export async function getTask(id: number): Promise<Task> {
  return tauriInvoke<Task>('get_task', { id })
}

export async function createTask(task: Omit<Task, 'id' | 'next_run_at'>): Promise<Task> {
  return tauriInvoke<Task>('create_task', { task })
}

export async function updateTask(task: Task): Promise<Task> {
  return tauriInvoke<Task>('update_task', { task })
}

export async function deleteTask(id: number): Promise<void> {
  return tauriInvoke<void>('delete_task', { id })
}

export async function toggleTask(id: number, enabled: boolean): Promise<Task> {
  return tauriInvoke<Task>('toggle_task', { id, enabled })
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
