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

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  currentPage: 'dashboard',
  notificationCount: 0,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCurrentPage: (page: string) => set({ currentPage: page }),
  incrementNotifications: () =>
    set((state) => ({ notificationCount: state.notificationCount + 1 })),
  clearNotifications: () => set({ notificationCount: 0 }),
}))
