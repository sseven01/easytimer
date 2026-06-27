import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Clock } from 'lucide-react'
import { listen } from '@tauri-apps/api/event'
import { getSetting } from '@/services/task'

export type AnimationDirection = 'top' | 'bottom' | 'left' | 'right' | 'center'

interface NotificationData {
  title: string
  body: string
  task_id?: number
}

// 根据方向获取动画变体
function getVariants(direction: AnimationDirection) {
  switch (direction) {
    case 'top':
      return {
        initial: { opacity: 0, y: -100, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -100, scale: 0.9 },
      }
    case 'bottom':
      return {
        initial: { opacity: 0, y: 100, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 100, scale: 0.9 },
      }
    case 'left':
      return {
        initial: { opacity: 0, x: -300, scale: 0.9 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: -300, scale: 0.9 },
      }
    case 'right':
      return {
        initial: { opacity: 0, x: 300, scale: 0.9 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: 300, scale: 0.9 },
      }
    case 'center':
    default:
      return {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.8 },
      }
  }
}

// 根据方向获取位置样式
function getPositionStyle(direction: AnimationDirection): string {
  switch (direction) {
    case 'top':
      return 'top-4 left-1/2 -translate-x-1/2'
    case 'bottom':
      return 'bottom-4 left-1/2 -translate-x-1/2'
    case 'left':
      return 'left-4 top-1/2 -translate-y-1/2'
    case 'right':
      return 'right-4 top-1/2 -translate-y-1/2'
    case 'center':
    default:
      return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  }
}

export function NotificationToast() {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [direction, setDirection] = useState<AnimationDirection>('right')
  const directionRef = useRef<AnimationDirection>('right')

  // 加载弹窗方向设置
  const loadDirection = useCallback(async () => {
    try {
      const v = await getSetting('notification_direction')
      if (v) {
        setDirection(v as AnimationDirection)
        directionRef.current = v as AnimationDirection
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadDirection()
  }, [loadDirection])

  // 监听后端通知事件
  useEffect(() => {
    const unlisten = listen<NotificationData>('show-notification', (event) => {
      const data = event.payload
      setNotifications((prev) => [...prev, data])

      // 自动关闭（5秒后）
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n !== data))
      }, 5000)
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  const handleClose = useCallback((data: NotificationData) => {
    setNotifications((prev) => prev.filter((n) => n !== data))
  }, [])

  const variants = getVariants(direction)
  const positionClass = getPositionStyle(direction)

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif, index) => (
          <motion.div
            key={`${notif.task_id}-${index}`}
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`absolute ${positionClass} pointer-events-auto`}
          >
            <div className="w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* 头部 */}
              <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 border-b border-border">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">{notif.title || 'EasyTimer 提醒'}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => handleClose(notif)}
                  className="p-1 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* 内容 */}
              <div className="px-4 py-3">
                <p className="text-sm text-foreground leading-relaxed">{notif.body}</p>
              </div>

              {/* 底部 */}
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-t border-border">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
