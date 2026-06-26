import { tauriInvoke } from './base'
import type { Task } from '@/types'

export async function getTasks(): Promise<Task[]> {
  return tauriInvoke<Task[]>('get_tasks')
}

export async function addTask(task: Omit<Task, 'id' | 'next_run_at'>): Promise<Task> {
  return tauriInvoke<Task>('add_task', { task })
}

export async function updateTask(task: Task): Promise<Task> {
  return tauriInvoke<Task>('update_task', { task })
}

export async function deleteTask(id: string): Promise<void> {
  return tauriInvoke<void>('delete_task', { id })
}

export async function toggleTask(id: string, enabled: boolean): Promise<Task> {
  return tauriInvoke<Task>('toggle_task', { id, enabled })
}
