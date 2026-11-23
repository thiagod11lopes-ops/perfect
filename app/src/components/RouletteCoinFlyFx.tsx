import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CoinIcon } from './CoinIcon'
import { rouletteSpinFlyCopy } from '../data/specialCardRoulette'
import type { CoinCelebrationMode } from './CoinRewardCelebration'
import { ROULETTE_ANIM_PACE, rouletteAnimMs } from '../data/rouletteAnimationPace'

type FlyCoin = {
  id: number
  startX: number
  startY: number
  endX: number
  endY: number
  delay: number
}

type Props = {
  amount: number
  mode: CoinCelebrationMode
  /** Delta com sinal do giro (ex. +30 / −10) para o rótulo do voo. */
  signedDelta?: number
  fromBalance: number
  toBalance: number
  originSelector: string
  targetSelector: string
  onValueChange: (value: number) => void
  onDone: () => void
}

/** Moedas voando roleta ↔ contador da sessão — não bloqueia a alavanca. */
export function RouletteCoinFlyFx({
  amount,
  mode,
  signedDelta,
  fromBalance,
  toBalance,
  originSelector,
  targetSelector,
  onValueChange,
  onDone,
}: Props) {
  const isGain = mode === 'reward'
  const absAmount = Math.abs(amount)
  const [flyCoins, setFlyCoins] = useState<FlyCoin[]>([])
  const onDoneRef = useRef(onDone)
  const onValueRef = useRef(onValueChange)
  onDoneRef.current = onDone
  onValueRef.current = onValueChange

  const sparks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: 20 + Math.random() * 60,
        top: 25 + Math.random() * 40,
        delay: Math.random() * 0.35,
        hue: isGain ? [28, 42, 140][i % 3] : [0, 12, 28][i % 3],
      })),
    [isGain],
  )

  useEffect(() => {
    onValueRef.current(fromBalance)
    const origin = document.querySelector(originSelector) as HTMLElement | null
    const target = document.querySelector(targetSelector) as HTMLElement | null
    if (!origin || !target) {
      onValueRef.current(toBalance)
      onDoneRef.current()
      return
    }

    const o = origin.getBoundingClientRect()
    const d = target.getBoundingClientRect()
    const ox = o.left + o.width / 2
    const oy = o.top + o.height * 0.55
    const tx = d.left + d.width / 2
    const ty = d.top + d.height / 2
    const count = Math.min(11, Math.max(6, Math.ceil(absAmount / 4)))

    setFlyCoins(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        startX: ox + (Math.random() - 0.5) * (isGain ? 120 : 18),
        startY: oy + (Math.random() - 0.5) * (isGain ? 80 : 12),
        endX: tx + (Math.random() - 0.5) * (isGain ? 18 : 100),
        endY: ty + (Math.random() - 0.5) * (isGain ? 12 : 70),
        delay: i * 0.05 * ROULETTE_ANIM_PACE,
      })),
    )

    target.classList.add('coin-chip-receiving')
    let raf = 0
    const timers: number[] = []
    const startCount = performance.now()
    const countDuration = rouletteAnimMs(720)
    const tick = (now: number) => {
      const t = Math.min(1, (now - startCount) / countDuration)
      const eased = 1 - Math.pow(1 - t, 3)
      onValueRef.current(Math.round(fromBalance + (toBalance - fromBalance) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else onValueRef.current(toBalance)
    }
    timers.push(window.setTimeout(() => { raf = requestAnimationFrame(tick) }, rouletteAnimMs(180)))
    timers.push(
      window.setTimeout(() => {
        onValueRef.current(toBalance)
        target.classList.remove('coin-chip-receiving')
        target.classList.add('coin-chip-pop')
        window.setTimeout(() => target.classList.remove('coin-chip-pop'), rouletteAnimMs(500))
        onDoneRef.current()
      }, rouletteAnimMs(1050)),
    )

    return () => {
      timers.forEach((id) => window.clearTimeout(id))
      cancelAnimationFrame(raf)
      target.classList.remove('coin-chip-receiving')
      target.classList.remove('coin-chip-pop')
    }
  }, [
    absAmount,
    fromBalance,
    isGain,
    originSelector,
    targetSelector,
    toBalance,
  ])

  const host = document.querySelector('.phone-app') ?? document.body
  const midX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0
  const midY = typeof window !== 'undefined' ? window.innerHeight * 0.46 : 0

  const flyCopy = rouletteSpinFlyCopy(signedDelta ?? (isGain ? absAmount : -absAmount))

  return createPortal(
    <div
      className={`roulette-coin-fly-layer${isGain ? ' is-gain' : ' is-loss'}`}
    >
      <div
        className="roulette-coin-fly-sparks"
        aria-hidden
        style={{ left: `${midX}px`, top: `${midY}px` }}
      >
        {sparks.map((s) => (
          <span
            key={s.id}
            className="roulette-coin-fly-spark"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              animationDelay: `${s.delay}s`,
              ['--spark-hue' as string]: String(s.hue),
            }}
          />
        ))}
      </div>
      <p
        className={[
          'roulette-coin-fly-delta',
          'roulette-gain-loss-phrase',
          'roulette-gain-loss-phrase--spin-fly',
          flyCopy.mode === 'reward' ? 'is-gain' : 'is-loss',
        ].join(' ')}
        role="status"
        style={{ left: midX, top: midY }}
      >
        {flyCopy.aria}
      </p>
      {flyCoins.map((c) => (
        <span
          key={c.id}
          className="roulette-coin-fly"
          style={{
            left: c.startX,
            top: c.startY,
            ['--fly-x' as string]: `${c.endX - c.startX}px`,
            ['--fly-y' as string]: `${c.endY - c.startY}px`,
            animationDelay: `${c.delay}s`,
          }}
        >
          <CoinIcon size={26} />
        </span>
      ))}
    </div>,
    host,
  )
}