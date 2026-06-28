import { useState } from 'react'
import { open } from '@tauri-apps/plugin-shell'
import { AnimatedPage } from '@/components/shared/AnimatedPage'
import { checkUpdate, type UpdateInfo } from '@/services/update'

const APP_NAME = 'EasyTimer'
const VERSION = '0.1.1'
const AUTHOR = '青城离歌'
const YEAR = new Date().getFullYear()

function AboutPage() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checking, setChecking] = useState(false)

  async function openUrl(url: string) {
    await open(url)
  }

  async function handleCheckUpdate() {
    setChecking(true)
    try {
      const info = await checkUpdate()
      setUpdateInfo(info)
    } catch (e) {
      setUpdateInfo({
        has_update: false,
        current_version: VERSION,
        latest_version: VERSION,
        download_url: null,
        release_notes: null,
      })
    } finally {
      setChecking(false)
    }
  }

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">关于</h1>

        <div className="rounded-xl border border-border bg-card shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">{APP_NAME}</h2>
            <p className="text-sm text-muted-foreground">版本 {VERSION}</p>
          </div>

          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              EasyTimer 是一款简洁高效的定时任务调度工具，帮助你管理日常任务和提醒。
            </p>

            <div className="pt-2 border-t border-border">
              <p className="text-center">
                Copyright &copy; {YEAR} {AUTHOR}. All rights reserved.
              </p>
            </div>

            <div className="flex justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => openUrl('https://github.com/sseven01/')}
                className="text-xs text-primary hover:underline"
              >
                GitHub
              </button>
              <button
                type="button"
                onClick={() => openUrl('https://www.qingup.com')}
                className="text-xs text-primary hover:underline"
              >
                个人网站
              </button>
            </div>
          </div>
        </div>

        {/* 检查更新 */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">检查更新</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {updateInfo
                  ? updateInfo.has_update
                    ? `发现新版本 ${updateInfo.latest_version}`
                    : '已是最新版本'
                  : '当前版本 ' + VERSION}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={checking}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {checking ? '检查中...' : '检查更新'}
            </button>
          </div>

          {updateInfo?.has_update && updateInfo.download_url && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3">
                {updateInfo.release_notes || '新版本已发布，请下载更新。'}
              </p>
              <button
                type="button"
                onClick={() => open(updateInfo.download_url!)}
                className="w-full rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                下载更新
              </button>
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  )
}

export default AboutPage