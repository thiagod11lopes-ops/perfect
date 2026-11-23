import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatCoins } from '../utils/format'
import {
  ROULETTE_ANIM_PACE,
  SNAKE_WIN_CELEBRATION_MS,
  SNAKE_WIN_PHASE_BASE_MS,
  SNAKE_WIN_UI_VISIBLE_MS,
  rouletteAnimMs,
} from '../data/rouletteAnimationPace'
import { RouletteGainLossPhrase } from './RouletteGainLossPhrase'
import { CoinIcon } from './CoinIcon'
import { CoinCelebrationFireworks } from './CoinCelebrationFireworks'

type Phase = 'burst' | 'fly' | 'count' | 'fade'

export type CoinCelebrationMode = 'reward' | 'penalty'

type Props = {
  amount: number
  fromBalance: number
  toBalance: number
  /** Título da missão / carta concluída. */
  missionTitle: string
  missionKind?: string
  /** Texto acima do título (padrão: Missão concluída / Ajuste por atraso). */
  eyebrow?: string
  mode?: CoinCelebrationMode
  targetSelector?: string
  /** Substitui o texto “moedinhas creditadas/retiradas”. */
  subcopy?: string
  /** Carta especial — destaque vitória/derrota da sessão de 3 giros. */
  sessionSummary?: boolean
  /** Só card de resumo — sem creditar saldo nem voar pro chip global ainda. */
  skipWalletCredit?: boolean
  /** Moedas restantes do pote voando para o chip do saldo. */
  potTransfer?: boolean
  originSelector?: string
  /** Roleta: encadeia transferência do pote — chamado no fim do card de resumo (antes do onDone genérico). */
  onSessionSummaryComplete?: () => void
  /** Roleta — título do card (ex. Parabéns! Você ganhou 30 moedas). */
  summaryTitle?: string
  onBalanceChange: (value: number) => void
  onDone: () => void
  /** Vitória Missão snake: card abaixo do vídeo, ritmo ~4s. */
  embedVariant?: 'snake-win'
}

type RainCoin = {
  id: number
  left: number
  delay: number
  duration: number
  size: number
  rotate: number
}

type FlyCoin = {
  id: number
  startX: number
  startY: number
  endX: number
  endY: number
  delay: number
}

export function CoinRewardCelebration({
  amount,
  fromBalance,
  toBalance,
  missionTitle,
  missionKind,
  eyebrow,
  mode = 'reward',
  targetSelector = '[data-coin-chip]',
  subcopy,
  sessionSummary = false,
  skipWalletCredit = false,
  potTransfer = false,
  originSelector,
  onSessionSummaryComplete,
  summaryTitle,
  onBalanceChange,
  onDone,
  embedVariant,
}: Props) {
  const isPenalty = mode === 'penalty'
  const isSnakeWin = embedVariant === 'snake-win'
  const absAmount = Math.abs(amount)
  const [phase, setPhase] = useState<Phase>(potTransfer ? 'fly' : 'burst')
  const uiShrink = isSnakeWin
    ? phase === 'fade'
    : phase === 'fly' || phase === 'count' || phase === 'fade'
  const [flyCoins, setFlyCoins] = useState<FlyCoin[]>([])
  const centerRef = useRef<HTMLDivElement>(null)
  const onDoneRef = useRef(onDone)
  const onBalanceRef = useRef(onBalanceChange)
  const fromRef = useRef(fromBalance)
  const toRef = useRef(toBalance)
  const amountRef = useRef(absAmount)
  const targetRef = useRef(targetSelector)
  const originRef = useRef(originSelector)
  const modeRef = useRef(mode)
  const skipCreditRef = useRef(skipWalletCredit)
  const potTransferRef = useRef(potTransfer)
  const sessionSummaryRef = useRef(sessionSummary)
  const onSummaryCompleteRef = useRef(onSessionSummaryComplete)
  const embedVariantRef = useRef(embedVariant)

  onDoneRef.current = onDone
  onBalanceRef.current = onBalanceChange
  fromRef.current = fromBalance
  toRef.current = toBalance
  amountRef.current = absAmount
  targetRef.current = targetSelector
  originRef.current = originSelector
  modeRef.current = mode
  skipCreditRef.current = skipWalletCredit
  potTransferRef.current = potTransfer
  sessionSummaryRef.current = sessionSummary
  onSummaryCompleteRef.current = onSessionSummaryComplete
  embedVariantRef.current = embedVariant

  const rain = useMemo<RainCoin[]>(() => {
    const n = Math.min(18, Math.max(8, absAmount * 4))
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      left: 6 + Math.random() * 88,
      delay: Math.random() * 0.55,
      duration: (1.15 + Math.random() * 0.85) * ROULETTE_ANIM_PACE,
      size: 28 + Math.random() * 22,
      rotate: -40 + Math.random() * 80,
    }))
  }, [absAmount])

  // Ciclo único na montagem — não depende de callbacks (evita travar no tick do app)
  useEffect(() => {
    if (!skipCreditRef.current) onBalanceRef.current(fromRef.current)
    let raf = 0
    let finished = false
    const timers: number[] = []
    const finish = () => {
      if (finished) return
      finished = true
      document.querySelector(targetRef.current)?.classList.remove('coin-chip-pop')
      document.querySelector(targetRef.current)?.classList.remove('coin-chip-receiving')
      document.querySelector(originRef.current ?? '')?.classList.remove('coin-chip-receiving')
      if (!skipCreditRef.current) onBalanceRef.current(toRef.current)
      if (sessionSummaryRef.current) {
        onSummaryCompleteRef.current?.()
        return
      }
      onDoneRef.current()
    }

    const isPotTransfer = potTransferRef.current
    const isSummaryOnly = skipCreditRef.current || sessionSummaryRef.current

    if (isPotTransfer) {
      timers.push(window.setTimeout(() => setPhase('fly'), rouletteAnimMs(80)))
      timers.push(
        window.setTimeout(() => {
          setPhase('count')
          const start = performance.now()
          const duration = rouletteAnimMs(900)
          const from = fromRef.current
          const to = toRef.current
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration)
            const eased = 1 - Math.pow(1 - t, 3)
            onBalanceRef.current(Math.round(from + (to - from) * eased))
            if (t < 1) raf = requestAnimationFrame(tick)
            else onBalanceRef.current(to)
          }
          raf = requestAnimationFrame(tick)
          document.querySelector(targetRef.current)?.classList.add('coin-chip-pop')
        }, rouletteAnimMs(1150)),
      )
      timers.push(window.setTimeout(() => setPhase('fade'), rouletteAnimMs(2100)))
      timers.push(window.setTimeout(finish, rouletteAnimMs(2550)))
    } else if (isSummaryOnly) {
      timers.push(window.setTimeout(() => setPhase('fade'), rouletteAnimMs(3000)))
      timers.push(window.setTimeout(finish, rouletteAnimMs(3450)))
    } else if (embedVariantRef.current === 'snake-win') {
      const end = SNAKE_WIN_CELEBRATION_MS
      const scale = end / SNAKE_WIN_PHASE_BASE_MS
      const flyAt = Math.round(1_200 * scale)
      const countAt = Math.round(2_200 * scale)
      const countDur = 900
      const fadeAt = SNAKE_WIN_UI_VISIBLE_MS
      timers.push(window.setTimeout(() => setPhase('fly'), flyAt))
      timers.push(
        window.setTimeout(() => {
          setPhase('count')
          const start = performance.now()
          const from = fromRef.current
          const to = toRef.current
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / countDur)
            const eased = 1 - Math.pow(1 - t, 3)
            onBalanceRef.current(Math.round(from + (to - from) * eased))
            if (t < 1) raf = requestAnimationFrame(tick)
            else onBalanceRef.current(to)
          }
          raf = requestAnimationFrame(tick)
          document.querySelector(targetRef.current)?.classList.add('coin-chip-pop')
        }, countAt),
      )
      timers.push(window.setTimeout(() => setPhase('fade'), fadeAt))
      timers.push(window.setTimeout(finish, end))
    } else {
      timers.push(window.setTimeout(() => setPhase('fly'), rouletteAnimMs(1500)))
      timers.push(
        window.setTimeout(() => {
          setPhase('count')
          const start = performance.now()
          const duration = rouletteAnimMs(850)
          const from = fromRef.current
          const to = toRef.current
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration)
            const eased = 1 - Math.pow(1 - t, 3)
            onBalanceRef.current(Math.round(from + (to - from) * eased))
            if (t < 1) raf = requestAnimationFrame(tick)
            else onBalanceRef.current(to)
          }
          raf = requestAnimationFrame(tick)
          document.querySelector(targetRef.current)?.classList.add('coin-chip-pop')
        }, rouletteAnimMs(2500)),
      )
      timers.push(window.setTimeout(() => setPhase('fade'), rouletteAnimMs(3400)))
      timers.push(window.setTimeout(finish, rouletteAnimMs(3900)))
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id))
      cancelAnimationFrame(raf)
      document.querySelector(targetRef.current)?.classList.remove('coin-chip-pop')
      document.querySelector(targetRef.current)?.classList.remove('coin-chip-receiving')
    }
  }, [])

  useEffect(() => {
    if (phase !== 'fly') return
    let attempts = 0
    let cancelled = false

    const run = () => {
      if (cancelled) return
      const target = document.querySelector(targetRef.current) as HTMLElement | null
      const originEl =
        (originRef.current
          ? (document.querySelector(originRef.current) as HTMLElement | null)
          : null) ?? centerRef.current
      const origin = originEl?.getBoundingClientRect()
      const dest = target?.getBoundingClientRect()
      if (!origin || !dest) {
        attempts += 1
        if (attempts < 24) {
          requestAnimationFrame(run)
        } else if (import.meta.env.DEV) {
          console.warn('[coin-celeb] fly targets missing', {
            origin: originRef.current,
            target: targetRef.current,
          })
        }
        return
      }

      const count = potTransferRef.current
        ? Math.min(14, Math.max(8, Math.ceil(amountRef.current / 8)))
        : Math.min(12, Math.max(6, Math.ceil(amountRef.current / 2)))
      const ox = origin.left + origin.width / 2
      const oy = origin.top + origin.height / 2
      const tx = dest.left + dest.width / 2
      const ty = dest.top + dest.height / 2
      const reverse = modeRef.current === 'penalty'
      setFlyCoins(
        Array.from({ length: count }, (_, i) => {
          const fromX = reverse ? tx : ox
          const fromY = reverse ? ty : oy
          const toX = reverse ? ox : tx
          const toY = reverse ? oy : ty
          return {
            id: i,
            startX: fromX + (Math.random() - 0.5) * (reverse ? 12 : 90),
            startY: fromY + (Math.random() - 0.5) * (reverse ? 8 : 70),
            endX: toX + (Math.random() - 0.5) * (reverse ? 90 : 12),
            endY: toY + (Math.random() - 0.5) * (reverse ? 70 : 8),
            delay: i * 0.05 * ROULETTE_ANIM_PACE,
          }
        }),
      )
      target?.classList.add('coin-chip-receiving')
      if (originRef.current && originEl) {
        originEl.classList.add('coin-chip-receiving')
      }
    }

    requestAnimationFrame(run)
    return () => {
      cancelled = true
    }
  }, [phase])

  const node = (
    <div
      className={`coin-celeb${embedVariant === 'snake-win' ? ' coin-celeb--snake-win' : ''}${sessionSummary ? ' coin-celeb--session' : ''}${potTransfer ? ' coin-celeb--pot-transfer' : ''}${phase === 'fade' ? ' is-fade' : ''}${isPenalty ? ' is-penalty' : ''}`}
      role="status"
      aria-live="polite"
      aria-labelledby={sessionSummary && summaryTitle ? 'coin-celeb-session-title' : undefined}
      aria-label={
        sessionSummary
          ? undefined
          : isSnakeWin
            ? `Vitória. +${formatCoins(absAmount)} moedinhas`
            : isPenalty
              ? `Atraso no treino: -${formatCoins(absAmount)} moedinhas`
              : `Missão concluída: ${missionTitle}. +${formatCoins(absAmount)} moedinhas`
      }
    >
      <div className="coin-celeb-veil" />

      <CoinCelebrationFireworks mode={mode} />

      {phase === 'burst' && !potTransfer
        ? rain.map((c) => (
            <span
              key={c.id}
              className="coin-celeb-rain"
              style={{
                left: `${c.left}%`,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                width: c.size,
                height: c.size,
                ['--coin-rot' as string]: `${c.rotate}deg`,
              }}
            >
              <CoinIcon size={c.size} />
            </span>
          ))
        : null}

      {isSnakeWin ? (
        <div
          className={`coin-celeb-snake-top${uiShrink ? ' is-shrink' : ''}`}
          aria-hidden
        >
          <div className="coin-celeb-ring coin-celeb-ring--snake-head" />
          <article className="coin-celeb-card coin-celeb-card--snake-head">
            <h2 className="coin-celeb-mission coin-celeb-mission--snake-head">VITÓRIA</h2>
          </article>
        </div>
      ) : null}

      {potTransfer ? (
        <div ref={centerRef} className="coin-celeb-pot-float" aria-hidden>
          <CoinIcon size={44} />
          <RouletteGainLossPhrase amount={absAmount} mode={mode} variant="float" as="span" />
        </div>
      ) : (
        <div
          ref={centerRef}
          className={`coin-celeb-center${isSnakeWin ? ' coin-celeb-center--snake-win' : ''}${uiShrink ? ' is-shrink' : ''}`}
        >
          <div className="coin-celeb-ring" aria-hidden />
          <article className="coin-celeb-card">
            {!isSnakeWin ? (
              <p className="coin-celeb-eyebrow">
                {sessionSummary
                  ? null
                  : (eyebrow ?? (isPenalty ? 'Ajuste por atraso' : 'Missão concluída'))}
              </p>
            ) : null}
            {!isSnakeWin ? (
              <h2
                id={sessionSummary ? 'coin-celeb-session-title' : undefined}
                className="coin-celeb-mission"
              >
                {sessionSummary && summaryTitle ? summaryTitle : missionTitle}
              </h2>
            ) : null}
            {!isSnakeWin && missionKind ? (
              <span className="coin-celeb-kind">{missionKind}</span>
            ) : null}
            {sessionSummary ? null : (
              <div className="coin-celeb-amount">
                <CoinIcon size={36} />
                <strong>{`${isPenalty ? '-' : '+'}${formatCoins(absAmount)}`}</strong>
              </div>
            )}
            <p className="coin-celeb-sub">
              {subcopy ?? (isPenalty ? 'moedinhas retiradas' : 'moedinhas creditadas')}
            </p>
          </article>
        </div>
      )}

      {flyCoins.map((c) => (
        <span
          key={c.id}
          className="coin-celeb-fly"
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
    </div>
  )

  return createPortal(node, document.querySelector('.phone-app') ?? document.body)
}
