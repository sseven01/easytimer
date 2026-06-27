import { motion } from 'framer-motion'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  size?: 'sm' | 'md' | 'lg'
}

export function ToggleSwitch({ checked, onChange, size = 'md' }: ToggleSwitchProps) {
  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'w-4 h-4', translate: 'translate-x-6' },
    lg: { track: 'w-14 h-7', thumb: 'w-5 h-5', translate: 'translate-x-8' },
  }

  const s = sizes[size]

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background
        ${s.track}
        ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}
      `}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`
          inline-block rounded-full bg-white shadow-sm
          ${s.thumb}
          ${checked ? s.translate : 'translate-x-1'}
        `}
      />
    </button>
  )
}

// 带标签的开关
export function ToggleSwitchWithLabel({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between p-5">
      <div>
        <h3 className="text-sm font-medium">{label}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  )
}
