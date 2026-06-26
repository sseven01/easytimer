import { useThemeStore } from '@/store/theme'

function SettingsPage() {
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Theme</span>
          <div className="flex gap-2">
            {(['dark', 'light', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  theme === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
