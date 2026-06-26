import { useEffect } from 'react'
import { register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { invoke } from '@tauri-apps/api/core'

export function useGlobalShortcut() {
  useEffect(() => {
    async function setup() {
      try {
        await register('CommandOrControl+Shift+T', async () => {
          await invoke('show_main_window')
        })
      } catch (err) {
        console.error('Failed to register global shortcut:', err)
      }
    }

    setup()

    return () => {
      unregister('CommandOrControl+Shift+T').catch(console.error)
    }
  }, [])
}
