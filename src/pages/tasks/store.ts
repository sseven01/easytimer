import { create } from 'zustand'
import type { Task } from '@/types'
import { getTasks, deleteTask as apiDeleteTask, toggleTask as apiToggleTask } from '@/services/task'

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
      set({ tasks, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  deleteTask: async (id: number) => {
    await apiDeleteTask(id)
    set({ tasks: get().tasks.filter((t) => t.id !== id) })
  },
  toggleTask: async (id: number, enabled: boolean) => {
    const updated = await apiToggleTask(id, enabled)
    set({
      tasks: get().tasks.map((t) => (t.id === id ? updated : t)),
    })
  },
}))
