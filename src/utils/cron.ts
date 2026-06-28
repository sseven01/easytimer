const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/**
 * Convert a 6-field cron expression to a human-readable Chinese string.
 * Format: 秒 分 时 日 月 星期
 */
export function cronToChinese(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 6) return expr

  const [sec, min, hour, day, month, weekday] = parts

  // Every N minutes
  if (sec === '0' && min.startsWith('*/') && hour === '*' && day === '*' && month === '*' && (weekday === '*' || weekday === '?')) {
    const n = parseInt(min.slice(2))
    return `每${n}分钟`
  }

  // Every N hours
  if (sec === '0' && min === '0' && hour.startsWith('*/') && day === '*' && month === '*' && (weekday === '*' || weekday === '?')) {
    const n = parseInt(hour.slice(2))
    return `每${n}小时`
  }

  // Every minute
  if (sec === '0' && min === '*' && hour === '*' && day === '*' && month === '*' && (weekday === '*' || weekday === '?')) {
    return '每分钟'
  }

  // Every hour at specific minute
  if (sec === '0' && !min.startsWith('*') && !min.includes('/') && hour === '*' && day === '*' && month === '*' && (weekday === '*' || weekday === '?')) {
    return `每小时第${min}分钟`
  }

  // Daily at specific time
  if (sec === '0' && !min.startsWith('*') && !hour.startsWith('*') && day === '*' && month === '*' && (weekday === '*' || weekday === '?')) {
    return `每天 ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  }

  // Weekly on specific days
  if (sec === '0' && !min.startsWith('*') && !hour.startsWith('*') && day === '*' && month === '*' && weekday !== '*' && weekday !== '?') {
    const days = weekday.split(',').map(d => {
      const idx = parseInt(d)
      return WEEKDAY_NAMES[idx] || `星期${d}`
    })
    if (days.length === 1) {
      return `每${days[0]} ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
    }
    return `${days.join('、')} ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  }

  // Monthly on specific days
  if (sec === '0' && !min.startsWith('*') && !hour.startsWith('*') && day !== '*' && day !== '?' && month === '*' && (weekday === '*' || weekday === '?')) {
    const days = day.split(',')
    if (days.length === 1) {
      return `每月${days[0]}号 ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
    }
    return `${days.map(d => d + '号').join('、')} ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  }

  // Specific date/time (once)
  if (sec === '0' && !min.startsWith('*') && !hour.startsWith('*') && day !== '*' && month !== '*' && (weekday === '*' || weekday === '?')) {
    return `${month}月${day}日 ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`
  }

  // Fallback: show the expression
  return expr
}
