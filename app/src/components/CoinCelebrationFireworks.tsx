import { useMemo } from 'react'
import type { CoinCelebrationMode } from './CoinRewardCelebration'

type Spark = {
  id: number
  x: number
  y: number
  hue: number
  delay: number
}

/** Mesmo burst/sparks da animação de ganho de moedas (`CoinRewardCelebration`). */
export function CoinCelebrationFireworks({
  mode = 'reward',
  className,
}: {
  mode?: CoinCelebrationMode
  className?: string
}) {
  const isPenalty = mode === 'penalty'

  const sparks = useMemo<Spark[]>(() => {
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: 12 + Math.random() * 76,
      y: 8 + Math.random() * 55,
      hue: isPenalty ? [0, 12, 28, 40, 8][i % 5]! : [28, 42, 18, 140, 200][i % 5]!,
      delay: Math.random() * 0.9,
    }))
  }, [isPenalty])

  return (
    <div
      className={`coin-celeb-fireworks${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      {sparks.map((s) => (
        <span
          key={s.id}
          className="coin-celeb-spark"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            animationDelay: `${s.delay}s`,
            ['--spark-hue' as string]: String(s.hue),
          }}
        />
      ))}
      <span className="coin-celeb-burst coin-celeb-burst-a" />
      <span className="coin-celeb-burst coin-celeb-burst-b" />
      <span className="coin-celeb-burst coin-celeb-burst-c" />
    </div>
  )
}