import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import MainLayout from '@/layouts/MainLayout'
import DashboardPage from '@/pages/dashboard'
import TasksPage from '@/pages/tasks'
import LogsPage from '@/pages/logs'
import SettingsPage from '@/pages/settings'
import { useGlobalShortcut } from '@/hooks/useGlobalShortcut'

function App() {
  // Register Ctrl+Shift+T global shortcut
  useGlobalShortcut()

  // Listen for 'show' event emitted from Rust (tray, etc.)
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
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
