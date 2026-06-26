function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
        <p>No tasks yet. Create your first task to get started.</p>
      </div>
    </div>
  )
}

export default TasksPage
