import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CoinIcon } from './CoinIcon'
import { formatWaterMl } from '../data/waterMission'
import { formatCoins } from '../utils/format'

type Phase = 'intro' | 'hold' | 'fade'

type Props = {
  bonusCoins: number
  goalMl: number
  onDone: () => void
}

type Drop = {
  id: number
  left: number
  delay: number
  duration: number
  size: number
}

export function WaterMissionCelebration({ bonusCoins, goalMl, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const drops = useMemo<Drop[]>(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: 5 + Math.random() * 90,
        delay: Math.random() * 0.8,
        duration: 1.2 + Math.random() * 1,
        size: 10 + Math.random() * 16,
      })),
    [],
  )

  useEffect(() => {
    let finished = false
    const timers: number[] = []
    const finish = () => {
      if (finished) return
      finished = true
      onDoneRef.current()
    }
    timers.push(window.setTimeout(() => setPhase('hold'), 700))
    timers.push(window.setTimeout(() => setPhase('fade'), 4000))
    timers.push(window.setTimeout(finish, 4600))
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [])

  const node = (
    <div
      className={`water-mission-celeb${phase === 'fade' ? ' is-fade' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Parabéns, missão de ${formatWaterMl(goalMl)} concluída`}
    >
      <div className="water-mission-veil" />
      {drops.map((d) => (
        <span
          key={d.id}
          className="water-mission-drop"
          aria-hidden
          style={{
            left: `${d.left}%`,
            width: d.size,
            height: d.size * 1.35,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
      <div className={`water-mission-center${phase === 'fade' ? ' is-out' : ''}`}>
        <div className="water-mission-ring" aria-hidden />
        <article className="water-mission-card">
          <p className="water-mission-eyebrow">Missão da Água</p>
          <h2 className="water-mission-title">Parabéns</h2>
          <p className="water-mission-message">
            Você completou {formatWaterMl(goalMl)} no dia. Continue essa constância.
          </p>
          <div className="water-mission-bonus">
            <CoinIcon size={32} />
            <strong>+{formatCoins(bonusCoins)}</strong>
          </div>
          <p className="water-mission-sub">moedinhas extras</p>
        </article>
      </div>
    </div>
  )

  return createPortal(node, document.querySelector('.phone-app') ?? document.body)
}
