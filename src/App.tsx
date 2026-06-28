import { useEffect } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import MainLayout from '@/layouts/MainLayout'
import DashboardPage from '@/pages/dashboard'
import TasksPage from '@/pages/tasks'
import LogsPage from '@/pages/logs'
import SettingsPage from '@/pages/settings'
import AboutPage from '@/pages/about'
import { useGlobalShortcut } from '@/hooks/useGlobalShortcut'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  useGlobalShortcut()

  useEffect(() => {
    const unlisten = listen('show', async () => {
      const win = getCurrentWindow()
      await win.show()
      await win.setFocus()
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  return (
    <HashRouter>
      <AnimatedRoutes />
    </HashRouter>
  )
}

export default App
