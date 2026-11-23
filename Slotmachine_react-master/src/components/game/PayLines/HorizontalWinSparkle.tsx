import { useMemo } from 'react'
import { ROW_NUMBER } from '@/game-configs'
import type { PayLine } from '@/types'
import styles from './sparkle.module.scss'

type HorizontalWinSparkleProps = {
  payLine: PayLine
}

function isHorizontalPayLine(payLine: PayLine): boolean {
  const row = payLine.positions[0]?.row
  return payLine.positions.every((p) => p.row === row)
}

export function isHorizontalWinPayLine(payLine: PayLine): boolean {
  return isHorizontalPayLine(payLine)
}

const SPARKLE_COUNT = 28

type SparkleBit = {
  id: number
  left: number
  size: number
  delay: number
  drift: number
  hue: number
}

const HorizontalWinSparkle: React.FC<HorizontalWinSparkleProps> = ({ payLine }) => {
  const row = payLine.positions[0]?.row ?? 1
  const topPct = ((row + 0.5) / ROW_NUMBER) * 100

  const bits = useMemo<SparkleBit[]>(() => {
    return Array.from({ length: SPARKLE_COUNT }, (_, id) => ({
      id,
      left: 4 + Math.random() * 92,
      size: 3 + Math.random() * 7,
      delay: Math.random() * 0.35,
      drift: -12 + Math.random() * 24,
      hue: 38 + Math.random() * 42,
    }))
  }, [payLine.type])

  return (
    <div
      className={styles.sparkleLine}
      style={{ top: `${topPct}%` }}
      aria-hidden
      data-payline={payLine.type}
    >
      <div className={styles.sparkleGlow} />
      <div className={styles.sparkleSweep} />
      <div className={styles.sparkleCloud}>
        {bits.map((bit) => (
          <span
            key={bit.id}
            className={styles.sparkleBit}
            style={{
              left: `${bit.left}%`,
              width: `${bit.size}px`,
              height: `${bit.size}px`,
              animationDelay: `${bit.delay}s`,
              ['--sparkle-drift' as string]: `${bit.drift}px`,
              ['--sparkle-hue' as string]: `${bit.hue}, 95%, 72%`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export { HorizontalWinSparkle }