import { useEffect, useState } from 'react'

type Props = {
  active: boolean
  seconds?: number
  onDone: () => void
}

export function MemoryMatchCountdown({ active, seconds = 5, onDone }: Props) {
  const [leftMs, setLeftMs] = useState(seconds * 1000)
  const [digit, setDigit] = useState(seconds)

  useEffect(() => {
    if (!active) return
    setLeftMs(seconds * 1000)
    setDigit(seconds)
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = now - t0
      const remain = Math.max(0, seconds * 1000 - elapsed)
      setLeftMs(remain)
      const n = Math.max(1, Math.ceil(remain / 1000))
      setDigit((d) => (d !== n ? n : d))
      if (remain <= 0) {
        onDone()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, seconds, onDone])

  if (!active || leftMs <= 0) return null

  return (
    <div className="memory-mission-countdown" role="timer" aria-hidden>
      <div className="memory-mission-countdown-halo" />
      <div className="memory-mission-countdown-ring" />
      <span className="memory-mission-countdown-digit memory-mission-countdown-pop" key={digit}>
        {digit}
      </span>
    </div>
  )
}