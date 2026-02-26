'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'

interface NavigationTiming {
  startTime: number
  endTime: number | null
  duration: number | null
}

export function useNavigationTimer() {
  const location = useLocation()
  const [timing, setTiming] = useState<NavigationTiming | null>(null)
  const navigationStartRef = useRef<number | null>(null)
  const previousPathRef = useRef<string>('')

  useEffect(() => {
    const currentPath = location.pathname

    if (previousPathRef.current && previousPathRef.current !== currentPath) {
      if (navigationStartRef.current !== null) {
        const endTime = performance.now()
        setTiming({
          startTime: navigationStartRef.current,
          endTime,
          duration: endTime - navigationStartRef.current,
        })
        navigationStartRef.current = null
      }
    }

    previousPathRef.current = currentPath
  }, [location.pathname])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (anchor) {
        const href = anchor.getAttribute('href')
        if (href && (href.startsWith('/') || href.startsWith('.'))) {
          navigationStartRef.current = performance.now()
        }
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  const clearTiming = () => {
    setTiming(null)
  }

  return { timing, clearTiming }
}
