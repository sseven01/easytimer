import { create } from 'zustand'

interface AppState {
  sidebarCollapsed: boolean
  currentPage: string
  notificationCount: number
  toggleSidebar: () => void
  setCurrentPage: (page: string) => void
  incrementNotifications: () => void
  clearNotifications: () => void
}

const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true'

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: savedCollapsed,
  currentPage: 'dashboard',
  notificationCount: 0,
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed
      localStorage.setItem('sidebarCollapsed', String(next))
      return { sidebarCollapsed: next }
    }),
  setCurrentPage: (page: string) => set({ currentPage: page }),
  incrementNotifications: () =>
    set((state) => ({ notificationCount: state.notificationCount + 1 })),
  clearNotifications: () => set({ notificationCount: 0 }),
}))
