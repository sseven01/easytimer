import { Activity, Clock, ListTodo, CheckCircle2 } from 'lucide-react'

const stats = [
  { label: 'Active Tasks', value: '0', icon: ListTodo, color: 'text-blue-500' },
  { label: 'Total Runs', value: '0', icon: Activity, color: 'text-green-500' },
  { label: 'Success Rate', value: '—', icon: CheckCircle2, color: 'text-emerald-500' },
  { label: 'Next Run', value: '—', icon: Clock, color: 'text-amber-500' },
]

function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="mt-2 text-2xl font-semibold">{stat.value}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DashboardPage
