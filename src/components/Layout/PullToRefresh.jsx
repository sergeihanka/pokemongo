import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const THRESHOLD = 64  // px of resistance-dampened pull to trigger refresh
const MAX_PULL = 96   // px max visual distance

export default function PullToRefresh({ children }) {
  const queryClient = useQueryClient()
  const [pull, setPull] = useState(0)       // current indicator height (px)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const active = useRef(false)

  const onTouchStart = useCallback((e) => {
    if (window.scrollY > 0) return
    startY.current = e.touches[0].clientY
    active.current = true
  }, [])

  const onTouchMove = useCallback((e) => {
    if (!active.current || startY.current === null) return
    const delta = e.touches[0].clientY - startY.current
    if (delta <= 0) { active.current = false; return }
    // Rubber-band damping: slow pull as it extends
    setPull(Math.min(MAX_PULL, Math.pow(delta, 0.6) * 4))
  }, [])

  const onTouchEnd = useCallback(async () => {
    if (!active.current) return
    active.current = false
    startY.current = null

    if (pull >= THRESHOLD) {
      setRefreshing(true)
      setPull(THRESHOLD)
      try {
        await queryClient.invalidateQueries()
      } finally {
        setTimeout(() => {
          setRefreshing(false)
          setPull(0)
        }, 400)
      }
    } else {
      setPull(0)
    }
  }, [pull, queryClient])

  const progress = Math.min(1, pull / THRESHOLD)
  const triggered = pull >= THRESHOLD || refreshing

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          height: pull,
          transition: active.current ? 'none' : 'height 0.25s ease-out',
        }}
      >
        <div
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center
            ${triggered ? 'border-[#58A6FF] bg-[#58A6FF]/10' : 'border-[#30363D] bg-[#21262D]'}`}
          style={{
            opacity: progress,
            transform: `scale(${0.5 + progress * 0.5})`,
            transition: active.current ? 'none' : 'all 0.25s ease-out',
          }}
        >
          {refreshing ? (
            <div className="w-3.5 h-3.5 border-2 border-[#58A6FF] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className={`w-3.5 h-3.5 ${triggered ? 'text-[#58A6FF]' : 'text-[#8B949E]'}`}
              style={{ transform: `rotate(${progress * 180}deg)`, transition: active.current ? 'none' : 'transform 0.25s ease-out' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
