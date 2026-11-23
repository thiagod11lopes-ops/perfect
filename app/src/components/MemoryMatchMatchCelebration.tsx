import { useMemo } from 'react'

const PARTICLE_COUNT = 40

type Spark = {
  id: number
  x: number
  y: number
  delay: number
  bright: boolean
}

type Ray = {
  id: number
  angle: number
  delay: number
  dist: number
  bright: boolean
}

function buildSparks(seed: number): Spark[] {
  return Array.from({ length: 28 }, (_, id) => ({
    id,
    x: 8 + ((seed * 17 + id * 41) % 840) / 10,
    y: 6 + ((seed * 23 + id * 29) % 780) / 10,
    delay: (id % 7) * 0.06 + (seed % 100) / 2000,
    bright: id % 3 === 0,
  }))
}

function buildRays(seed: number): Ray[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, id) => ({
    id,
    angle: (360 / PARTICLE_COUNT) * id + (seed % 24),
    delay: (id % 6) * 0.035,
    dist: 72 + (id % 9) * 7 + (seed % 5),
    bright: id % 5 === 0,
  }))
}

type Props = {
  burstKey: number
}

export function MemoryMatchMatchCelebration({ burstKey }: Props) {
  const sparks = useMemo(() => buildSparks(burstKey), [burstKey])
  const rays = useMemo(() => buildRays(burstKey), [burstKey])

  return (
    <div
      className="memory-match-match-burst"
      role="status"
      aria-live="polite"
      aria-label="Combinou!!!"
    >
      <div className="memory-match-match-burst-veil" aria-hidden />
      <div className="memory-match-match-fireworks" aria-hidden>
        <span className="memory-match-match-orb memory-match-match-orb--a" />
        <span className="memory-match-match-orb memory-match-match-orb--b" />
        <span className="memory-match-match-orb memory-match-match-orb--c" />
        {rays.map((r) => (
          <span
            key={`ray-${burstKey}-${r.id}`}
            className={`memory-match-match-ray${r.bright ? ' is-bright' : ''}`}
            style={{
              ['--mm-ray-ang' as string]: `${r.angle}deg`,
              ['--mm-ray-dist' as string]: `${r.dist}px`,
              animationDelay: `${r.delay}s`,
            }}
          />
        ))}
        {sparks.map((s) => (
          <span
            key={`spark-${burstKey}-${s.id}`}
            className={`memory-match-match-spark${s.bright ? ' is-bright' : ''}`}
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>
      <p className="memory-match-match-title">Combinou!!!</p>
    </div>
  )
}