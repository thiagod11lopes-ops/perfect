import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
type Phase = 'intro' | 'hold' | 'fade'

type Props = {
  unlockedWeek: 2 | 3 | 4
  milestone: number
  onDone: () => void
}

type Spark = {
  id: number
  x: number
  y: number
  delay: number
  hue: number
}

type Ribbon = {
  id: number
  left: number
  delay: number
  duration: number
  hue: number
  rotate: number
}

const UNLOCK_COPY: Record<
  2 | 3 | 4,
  { headline: string; message: string }
> = {
  2: {
    headline: 'Semana 2 desbloqueada',
    message: 'Você liberou a próxima fase do desafio. Continue esse ótimo trabalho.',
  },
  3: {
    headline: 'Semana 3 desbloqueada',
    message: 'Você segue firme rumo ao topo. Continue esse ótimo trabalho.',
  },
  4: {
    headline: 'Semana 4 desbloqueada',
    message: 'Falta pouco para a reta final. Continue esse ótimo trabalho.',
  },
}

export function WeekUnlockCelebration({ unlockedWeek, milestone, onDone }: Props) {
  void milestone
  const copy = UNLOCK_COPY[unlockedWeek]
  const [phase, setPhase] = useState<Phase>('intro')
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const sparks = useMemo<Spark[]>(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        x: 8 + Math.random() * 84,
        y: 6 + Math.random() * 60,
        delay: Math.random() * 1.1,
        hue: [145, 168, 42, 28, 200][i % 5],
      })),
    [],
  )

  const ribbons = useMemo<Ribbon[]>(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        left: 4 + Math.random() * 92,
        delay: Math.random() * 0.7,
        duration: 1.4 + Math.random() * 1.1,
        hue: [145, 38, 200, 55][i % 4],
        rotate: -50 + Math.random() * 100,
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
    timers.push(window.setTimeout(() => setPhase('hold'), 900))
    timers.push(window.setTimeout(() => setPhase('fade'), 4200))
    timers.push(window.setTimeout(finish, 4800))
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [])

  const node = (
    <div
      className={`week-unlock-celeb${phase === 'fade' ? ' is-fade' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Parabéns, você liberou a semana ${unlockedWeek}`}
    >
      <div className="week-unlock-veil" />

      <div className="week-unlock-fireworks" aria-hidden>
        {sparks.map((s) => (
          <span
            key={s.id}
            className="week-unlock-spark"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              animationDelay: `${s.delay}s`,
              ['--spark-hue' as string]: String(s.hue),
            }}
          />
        ))}
        <span className="week-unlock-burst week-unlock-burst-a" />
        <span className="week-unlock-burst week-unlock-burst-b" />
        <span className="week-unlock-burst week-unlock-burst-c" />
      </div>

      {ribbons.map((r) => (
        <span
          key={r.id}
          className="week-unlock-ribbon"
          aria-hidden
          style={{
            left: `${r.left}%`,
            animationDelay: `${r.delay}s`,
            animationDuration: `${r.duration}s`,
            ['--ribbon-hue' as string]: String(r.hue),
            ['--ribbon-rot' as string]: `${r.rotate}deg`,
          }}
        />
      ))}

      <div className={`week-unlock-center${phase === 'fade' ? ' is-out' : ''}`}>
        <div className="week-unlock-ring" aria-hidden />
        <div className="week-unlock-ring week-unlock-ring-b" aria-hidden />
        <article className="week-unlock-card">
          <h2 className="week-unlock-title">Parabéns</h2>
          <p className="week-unlock-headline">{copy.headline}</p>
          <p className="week-unlock-message">{copy.message}</p>
        </article>
      </div>
    </div>
  )

  return createPortal(node, document.querySelector('.phone-app') ?? document.body)
}
