import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ListTodo, FileText, Settings, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/tasks', label: '任务', icon: ListTodo },
  { path: '/logs', label: '日志', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
]

function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar border-r border-border transition-[width] duration-200 ease-in-out',
        sidebarCollapsed ? 'w-14' : 'w-50'
      )}
    >
      {/* Navigation items */}
      <nav className="flex-1 flex flex-col gap-1 p-2 pt-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full rounded-lg px-3 py-2 text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          {sidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
