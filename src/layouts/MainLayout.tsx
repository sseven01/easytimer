import { Outlet } from 'react-router-dom'
import TitleBar from '@/components/layout/TitleBar'
import Sidebar from '@/components/layout/Sidebar'
import StatusBar from '@/components/layout/StatusBar'

function MainLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-lg border border-border">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  )
}

export default MainLayout
