import { HashRouter, Routes, Route } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import DashboardPage from '@/pages/dashboard'
import TasksPage from '@/pages/tasks'
import LogsPage from '@/pages/logs'
import SettingsPage from '@/pages/settings'

function App() {
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
