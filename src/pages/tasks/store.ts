import { create } from 'zustand'
import type { Task } from '@/types'
import { getTasks, deleteTask as apiDeleteTask, toggleTask as apiToggleTask, getTriggers } from '@/services/task'

interface TasksState {
  tasks: Task[]
  loading: boolean
  fetchTasks: () => Promise<void>
  deleteTask: (id: number) => Promise<void>
  toggleTask: (id: number, enabled: boolean) => Promise<void>
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,
  fetchTasks: async () => {
    set({ loading: true })
    try {
      const tasks = await getTasks()
      // Fetch triggers for each task
      const tasksWithTriggers = await Promise.all(
        tasks.map(async (t) => {
          const triggers = t.id !== null ? await getTriggers(t.id) : []
          return { ...t, triggers }
        })
      )
      set({ tasks: tasksWithTriggers, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  deleteTask: async (id: number) => {
    await apiDeleteTask(id)
    set({ tasks: get().tasks.filter((t) => t.id !== id) })
  },
  toggleTask: async (id: number, enabled: boolean) => {
    await apiToggleTask(id, enabled)
    const tasks = await getTasks()
    const tasksWithTriggers = await Promise.all(
      tasks.map(async (t) => {
        const triggers = t.id !== null ? await getTriggers(t.id) : []
        return { ...t, triggers }
      })
    )
    set({ tasks: tasksWithTriggers })
  },
}))
