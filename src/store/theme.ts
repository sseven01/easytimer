import { create } from 'zustand'

type Theme = 'system' | 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
}

// 默认跟随系统
const initialTheme = (localStorage.getItem('theme') as Theme) || 'system'
const initialResolved = resolveTheme(initialTheme)
applyTheme(initialResolved)

export const useThemeStore = create<ThemeState>((set) => {
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = useThemeStore.getState()
    if (current.theme === 'system') {
      const resolved = resolveTheme('system')
      applyTheme(resolved)
      set({ resolvedTheme: resolved })
    }
  })

  return {
    theme: initialTheme,
    resolvedTheme: initialResolved,
    setTheme: (theme: Theme) => {
      localStorage.setItem('theme', theme)
      const resolved = resolveTheme(theme)
      applyTheme(resolved)
      set({ theme, resolvedTheme: resolved })
    },
  }
})
