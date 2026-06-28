import { invoke } from '@tauri-apps/api/core'

export interface UpdateInfo {
  has_update: boolean
  latest_version: string
  current_version: string
  download_url: string | null
  release_notes: string | null
}

export async function checkUpdate(): Promise<UpdateInfo> {
  return invoke<UpdateInfo>('check_update')
}