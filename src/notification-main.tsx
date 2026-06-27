import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { NotificationWindow } from '@/components/shared/NotificationWindow'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationWindow />
  </StrictMode>,
)
