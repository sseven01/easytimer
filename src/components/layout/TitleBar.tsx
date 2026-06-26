import { useState, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, Square, X, Timer } from 'lucide-react'

function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const appWindow = getCurrentWindow()

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized)
  }, [appWindow])

  async function handleMinimize() {
    await appWindow.minimize()
  }

  async function handleMaximize() {
    await appWindow.toggleMaximize()
    const maximized = await appWindow.isMaximized()
    setIsMaximized(maximized)
  }

  async function handleClose() {
    await appWindow.close()
  }

  return (
    <div
      data-tauri-drag-region
      className="flex h-8 select-none items-center bg-titlebar border-b border-border"
    >
      {/* App icon + title */}
      <div className="flex items-center gap-2 px-3 pointer-events-none">
        <Timer className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground/80">易定时</span>
      </div>

      {/* Draggable spacer */}
      <div className="flex-1 h-full" data-tauri-drag-region />

      {/* Window controls */}
      <div className="flex h-full">
        <button
          type="button"
          onClick={handleMinimize}
          className="inline-flex h-full w-11 items-center justify-center text-foreground/70 hover:bg-secondary transition-colors"
          aria-label="Minimize"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className="inline-flex h-full w-11 items-center justify-center text-foreground/70 hover:bg-secondary transition-colors"
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <span className="relative inline-block h-3 w-3">
              <span className="absolute top-0 left-0.5 h-2 w-2 border border-current border-b-0 border-r-0" />
              <span className="absolute bottom-0.5 right-0 h-2 w-2 border border-current border-t-0 border-l-0" />
            </span>
          ) : (
            <Square className="h-3 w-3" />
          )}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex h-full w-11 items-center justify-center text-foreground/70 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export default TitleBar
