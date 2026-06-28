import { tauriInvoke } from './base'
import type { Task, LogEntry, Trigger } from '@/types'

export async function getTasks(): Promise<Task[]> {
  return tauriInvoke<Task[]>('get_tasks')
}

export async function getTask(id: number): Promise<Task> {
  return tauriInvoke<Task>('get_task', { id })
}

export async function createTask(task: { name: string; action_type: string; action_value: string }): Promise<number> {
  return tauriInvoke<number>('create_task', {
    name: task.name,
    actionType: task.action_type,
    actionValue: task.action_value,
  })
}

export async function updateTask(task: Task): Promise<void> {
  return tauriInvoke<void>('update_task', {
    id: task.id,
    name: task.name,
    actionType: task.action_type,
    actionValue: task.action_value,
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

// ─── Trigger API ─────────────────────────────────

export async function getTriggers(taskId: number): Promise<Trigger[]> {
  return tauriInvoke<Trigger[]>('get_triggers', { taskId })
}

export async function addTrigger(taskId: number, cronExpression: string): Promise<number> {
  return tauriInvoke<number>('add_trigger', { taskId, cronExpression })
}

export async function updateTrigger(id: number, cronExpression: string, enabled: boolean): Promise<void> {
  return tauriInvoke<void>('update_trigger', { id, cronExpression, enabled })
}

export async function deleteTrigger(id: number): Promise<void> {
  return tauriInvoke<void>('delete_trigger', { id })
}

export async function toggleTrigger(id: number, enabled: boolean): Promise<void> {
  return tauriInvoke<void>('toggle_trigger', { id, enabled })
}

export async function validateCron(expression: string): Promise<boolean> {
  return tauriInvoke<boolean>('validate_cron', { expression })
}

export async function previewCron(expression: string, count?: number): Promise<string[]> {
  return tauriInvoke<string[]>('preview_cron', { expression, count })
}
