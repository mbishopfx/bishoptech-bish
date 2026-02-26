'use client'

import { useEffect, useState } from 'react'
import { useNavigationTimer } from '@/hooks/use-navigation-timer'

export function NavigationTimerOverlay() {
  const { timing, clearTiming } = useNavigationTimer()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (timing?.duration !== null && timing?.duration !== undefined) {
      setVisible(true)
      const timeout = setTimeout(() => {
        setVisible(false)
        clearTiming()
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [timing, clearTiming])

  if (!visible || timing?.duration === null || timing?.duration === undefined) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#000000',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '14px',
        padding: '16px 24px',
        zIndex: 9999,
        borderRadius: 0,
      }}
    >
      <div>Navigation timing</div>
      <div style={{ marginTop: '8px' }}>{timing.duration.toFixed(2)}ms</div>
    </div>
  )
}
