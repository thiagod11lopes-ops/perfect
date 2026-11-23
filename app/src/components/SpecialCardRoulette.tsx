import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CoinIcon } from './CoinIcon'
import {
  CoinRewardCelebration,
  type CoinCelebrationMode,
} from './CoinRewardCelebration'
import {
  SPECIAL_ROULETTE_STAKES,
  canAffordStake,
  resolveSpecialCardRoulette,
  applySpinToRoulettePot,
  rouletteSessionCongratsCopy,
  rouletteWalletAfterSettle,
  spinFlySignedDelta,
  type SpecialRouletteOutcome,
  type SpecialRouletteStake,
} from '../data/specialCardRoulette'
import { formatCoins } from '../utils/format'
import { rouletteAnimMs } from '../data/rouletteAnimationPace'
import { GameCardRunLoader } from './GameCardRunLoader'
import { SlotMachineEmbed, type SlotSpinMessage } from './SlotMachineEmbed'
import { RouletteCoinFlyFx } from './RouletteCoinFlyFx'

export type RoulettePhase = 'loading' | 'pick' | 'slot' | 'done'
type Phase = RoulettePhase

export type RouletteDebugContext = {
  sessionKey?: string
  cardStatus?: string
  gamePlayEpoch?: number
  devGameCardReplayEpoch?: number
  windowLocked?: boolean
}

type SpinCelebration = {
  key: string
  amount: number
  fromBalance: number
  toBalance: number
  mode: CoinCelebrationMode
  eyebrow: string
  targetSelector?: string
  balanceScope?: 'pot' | 'wallet'
  subcopy?: string
  sessionSummary?: boolean
  potTransfer?: boolean
  skipWalletCredit?: boolean
  originSelector?: string
  summaryTitle?: string
}

type SpecialCardRouletteProps = {
  balance: number
  missionTitle?: string
  phaseBusy?: boolean
  debugContext?: RouletteDebugContext
  onBusyChange?: (busy: boolean) => void
  onPotStakeLocked?: (stake: SpecialRouletteStake) => void
  onCelebratingChange?: (active: boolean) => void
  onPotDisplay?: (value: number) => void
  onWalletDisplay?: (value: number) => void
  onPhaseChange?: (phase: RoulettePhase) => void
  onSettled: (outcome: SpecialRouletteOutcome) => void
}

/** Carta especial: loader → aposta → pote → slot (3 puxadas) → liquidação. */
export function SpecialCardRoulette({
  balance,
  missionTitle = 'Carta especial',
  phaseBusy = false,
  debugContext,
  onBusyChange,
  onPotStakeLocked,
  onCelebratingChange,
  onPotDisplay,
  onWalletDisplay,
  onPhaseChange,
  onSettled,
}: SpecialCardRouletteProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [stake, setStake] = useState<SpecialRouletteStake | null>(null)
  const [potBalance, setPotBalance] = useState(0)
  const [error, setError] = useState('')
  const [spinLabel, setSpinLabel] = useState('')
  const [celebration, setCelebration] = useState<SpinCelebration | null>(null)
  const [spinFly, setSpinFly] = useState<{
    key: string
    amount: number
    signedDelta: number
    mode: CoinCelebrationMode
    fromBalance: number
    toBalance: number
    originSelector: string
    targetSelector: string
  } | null>(null)
  const pendingOutcomeRef = useRef<SpecialRouletteOutcome | null>(null)
  const appliedSpinRef = useRef(0)
  const lastSpinMessageRef = useRef(0)
  const isCelebratingRef = useRef(false)
  const potRef = useRef(0)
  const sessionRef = useRef(0)
  const walletRef = useRef(balance)
  const stakeRef = useRef<SpecialRouletteStake | null>(null)
  const outcomeForSettleRef = useRef<SpecialRouletteOutcome | null>(null)
  const sessionSummaryQueuedRef = useRef(false)
  const activeCelebrationRef = useRef<SpinCelebration | null>(null)
  const celebrationQueueRef = useRef<SpinCelebration[]>([])
  const settleFallbackTimerRef = useRef<number | null>(null)
  const hardFinishTimerRef = useRef<number | null>(null)
  const summaryPotFallbackRef = useRef<number | null>(null)
  const sessionSettledRef = useRef(false)
  const potTransferStartedRef = useRef(false)
  const onSettledRef = useRef(onSettled)
  onSettledRef.current = onSettled

  const clearSettleFallback = useCallback(() => {
    if (settleFallbackTimerRef.current !== null) {
      window.clearTimeout(settleFallbackTimerRef.current)
      settleFallbackTimerRef.current = null
    }
  }, [])

  const clearHardFinish = useCallback(() => {
    if (hardFinishTimerRef.current !== null) {
      window.clearTimeout(hardFinishTimerRef.current)
      hardFinishTimerRef.current = null
    }
  }, [])

  const clearSummaryPotFallback = useCallback(() => {
    if (summaryPotFallbackRef.current !== null) {
      window.clearTimeout(summaryPotFallbackRef.current)
      summaryPotFallbackRef.current = null
    }
  }, [])

  useEffect(() => {
    stakeRef.current = stake
  }, [stake])

  useEffect(() => {
    walletRef.current = balance
  }, [balance])

  useEffect(() => {
    onPotDisplay?.(potBalance)
  }, [potBalance, onPotDisplay])

  useEffect(() => {
    sessionRef.current += 1
    setPhase('loading')
    setStake(null)
    setPotBalance(0)
    setError('')
    setSpinLabel('')
    setCelebration(null)
    setSpinFly(null)
    celebrationQueueRef.current = []
    pendingOutcomeRef.current = null
    appliedSpinRef.current = 0
    lastSpinMessageRef.current = 0
    isCelebratingRef.current = false
    outcomeForSettleRef.current = null
    sessionSummaryQueuedRef.current = false
    sessionSettledRef.current = false
    potTransferStartedRef.current = false
    stakeRef.current = null
    onBusyChange?.(true)
    return () => {
      sessionRef.current += 1
      clearSettleFallback()
      clearHardFinish()
      clearSummaryPotFallback()
      onBusyChange?.(false)
      onCelebratingChange?.(false)
    }
  }, [clearHardFinish, clearSettleFallback, clearSummaryPotFallback])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (phase !== 'pick') return
    console.info('[special-card-roulette] pick', {
      balance,
      phase,
      phaseBusy,
      stakes: SPECIAL_ROULETTE_STAKES.map((s) => ({
        stake: s,
        affordable: canAffordStake(balance, s),
      })),
      ...debugContext,
    })
  }, [phase, balance, phaseBusy, debugContext])

  useEffect(() => {
    onPhaseChange?.(phase)
  }, [phase, onPhaseChange])

  const finishIntro = useCallback(() => {
    setPhase('pick')
    onBusyChange?.(false)
  }, [onBusyChange])

  const startCelebration = useCallback(
    (item: SpinCelebration) => {
      isCelebratingRef.current = true
      activeCelebrationRef.current = item
      setCelebration(item)
      onCelebratingChange?.(true)
    },
    [onCelebratingChange],
  )

  const completeSessionAfterSummary = useCallback(
    (outcome: SpecialRouletteOutcome) => {
      if (sessionSettledRef.current) return
      sessionSettledRef.current = true
      clearHardFinish()
      clearSettleFallback()
      clearSummaryPotFallback()
      outcomeForSettleRef.current = null
      sessionSummaryQueuedRef.current = false
      celebrationQueueRef.current = []
      activeCelebrationRef.current = null
      isCelebratingRef.current = false
      setCelebration(null)
      setPhase('done')
      onBusyChange?.(false)
      onCelebratingChange?.(false)
      onSettledRef.current(outcome)
    },
    [clearHardFinish, clearSettleFallback, clearSummaryPotFallback, onBusyChange, onCelebratingChange],
  )

  const creditWalletForOutcome = useCallback(
    (outcome: SpecialRouletteOutcome) => {
      const toWallet = rouletteWalletAfterSettle(walletRef.current, outcome)
      onWalletDisplay?.(toWallet)
      walletRef.current = toWallet
    },
    [onWalletDisplay],
  )

  const scheduleHardFinish = useCallback(
    (delayMs = 14000) => {
      clearHardFinish()
      const expectedSession = sessionRef.current
      hardFinishTimerRef.current = window.setTimeout(() => {
        hardFinishTimerRef.current = null
        if (expectedSession !== sessionRef.current) return
        if (sessionSettledRef.current) return
        if (isCelebratingRef.current) {
          scheduleHardFinish(3200)
          return
        }
        const outcome = outcomeForSettleRef.current ?? pendingOutcomeRef.current
        if (!outcome) return
        if (import.meta.env.DEV) {
          console.warn('[special-card-roulette] hard finish session', {
            spins: appliedSpinRef.current,
            summaryQueued: sessionSummaryQueuedRef.current,
          })
        }
        creditWalletForOutcome(outcome)
        completeSessionAfterSummary(outcome)
      }, delayMs)
    },
    [clearHardFinish, completeSessionAfterSummary, creditWalletForOutcome],
  )

  const pulseSessionCoins = useCallback((mode: CoinCelebrationMode) => {
    const el = document.querySelector('.special-roulette-session-coins')
    if (!el) return
    el.classList.remove('special-roulette-session-coins--win', 'special-roulette-session-coins--loss')
    el.classList.add(
      mode === 'reward' ? 'special-roulette-session-coins--win' : 'special-roulette-session-coins--loss',
    )
    window.setTimeout(() => {
      el.classList.remove('special-roulette-session-coins--win', 'special-roulette-session-coins--loss')
    }, rouletteAnimMs(950))
  }, [])

  const launchSpinCoinFly = useCallback(
    (opts: {
      key: string
      mode: CoinCelebrationMode
      amount: number
      signedDelta: number
      fromBalance: number
      toBalance: number
    }) => {
      const isGain = opts.mode === 'reward'
      setSpinFly({
        key: opts.key,
        amount: opts.amount,
        signedDelta: opts.signedDelta,
        mode: opts.mode,
        fromBalance: opts.fromBalance,
        toBalance: opts.toBalance,
        originSelector: isGain ? '.slot-machine-embed-host' : '.special-roulette-session-coins',
        targetSelector: isGain ? '.special-roulette-session-coins' : '.slot-machine-embed-host',
      })
      isCelebratingRef.current = false
      activeCelebrationRef.current = null
      onCelebratingChange?.(false)
      onBusyChange?.(false)
    },
    [onBusyChange, onCelebratingChange],
  )

  /** Após o card de resumo: credita saldo e encerra — sem segundo “ganho” do pote. */
  const beginPotTransferAfterSummary = useCallback(() => {
    if (potTransferStartedRef.current) return
    const outcome = outcomeForSettleRef.current
    if (!outcome) {
      if (import.meta.env.DEV) {
        console.warn('[special-card-roulette] pot transfer skipped — no outcome')
      }
      return
    }
    clearSummaryPotFallback()
    potTransferStartedRef.current = true
    potRef.current = 0
    setPotBalance(0)
    onPotDisplay?.(0)
    isCelebratingRef.current = false
    activeCelebrationRef.current = null
    setCelebration(null)
    onCelebratingChange?.(false)
    creditWalletForOutcome(outcome)
    completeSessionAfterSummary(outcome)
  }, [
    clearSummaryPotFallback,
    completeSessionAfterSummary,
    creditWalletForOutcome,
    onCelebratingChange,
    onPotDisplay,
  ])

  const handleCelebrationDone = useCallback(() => {
    const next = celebrationQueueRef.current.shift()
    if (next) {
      if (import.meta.env.DEV) {
        console.info('[special-card-roulette] celebration next', next.key, {
          remaining: celebrationQueueRef.current.length,
        })
      }
      startCelebration(next)
      return
    }

    isCelebratingRef.current = false
    activeCelebrationRef.current = null
    setCelebration(null)
    onCelebratingChange?.(false)
  }, [onCelebratingChange, startCelebration])

  const beginSessionSettlement = useCallback(() => {
    if (sessionSummaryQueuedRef.current) return
    if (lastSpinMessageRef.current < 3 && appliedSpinRef.current < 3) return
    const outcome = pendingOutcomeRef.current
    const activeStake = stakeRef.current
    const settleSession = sessionRef.current
    if (!outcome || !activeStake) {
      if (import.meta.env.DEV) {
        console.warn('[special-card-roulette] beginSessionSettlement skipped', {
          outcome: !!outcome,
          stake: activeStake,
        })
      }
      return
    }

    clearSettleFallback()
    setSpinLabel('Resumo da sessão…')

    const congrats = rouletteSessionCongratsCopy(outcome)
    const fromWallet = walletRef.current

    sessionSummaryQueuedRef.current = true
    outcomeForSettleRef.current = outcome

    scheduleHardFinish(14000)
    potTransferStartedRef.current = false
    celebrationQueueRef.current = []
    setSpinFly(null)
    isCelebratingRef.current = false
    const summaryCelebration: SpinCelebration = {
      key: `${settleSession}-session-summary`,
      amount: congrats.netAmount,
      fromBalance: fromWallet,
      toBalance: fromWallet,
      mode: congrats.mode,
      eyebrow: '',
      summaryTitle: congrats.title,
      balanceScope: 'wallet',
      subcopy: congrats.subcopy,
      sessionSummary: true,
      skipWalletCredit: true,
    }
    clearSummaryPotFallback()
    const expectedSession = sessionRef.current
    summaryPotFallbackRef.current = window.setTimeout(() => {
      summaryPotFallbackRef.current = null
      if (expectedSession !== sessionRef.current) return
      if (potTransferStartedRef.current) return
      if (import.meta.env.DEV) {
        console.warn('[special-card-roulette] summary→pot fallback')
      }
      beginPotTransferAfterSummary()
    }, rouletteAnimMs(3800))
    startCelebration(summaryCelebration)
  }, [
    beginPotTransferAfterSummary,
    clearSettleFallback,
    clearSummaryPotFallback,
    scheduleHardFinish,
    startCelebration,
  ])

  const armThirdSpinFinish = useCallback(() => {
    const expectedSession = sessionRef.current
    clearSettleFallback()
    settleFallbackTimerRef.current = window.setTimeout(() => {
      settleFallbackTimerRef.current = null
      if (expectedSession !== sessionRef.current) return
      beginSessionSettlement()
    }, rouletteAnimMs(400))
  }, [beginSessionSettlement, clearSettleFallback])

  const pickStake = (picked: SpecialRouletteStake) => {
    if (phaseBusy || phase !== 'pick') return
    setError('')
    if (!canAffordStake(balance, picked)) {
      setError(`Saldo insuficiente. Você precisa de ${formatCoins(picked)} moedas.`)
      return
    }
    const outcome = resolveSpecialCardRoulette(picked, Math.random)
    pendingOutcomeRef.current = outcome
    appliedSpinRef.current = 0
    lastSpinMessageRef.current = 0
    sessionSettledRef.current = false
    potTransferStartedRef.current = false
    potRef.current = picked
    setPotBalance(picked)
    onPotStakeLocked?.(picked)
    setStake(picked)
    setPhase('slot')
    setSpinLabel('Puxe a alavanca — giro 1 de 3')
    onBusyChange?.(true)
  }

  const handleEmbedSpin = useCallback(
    (msg: SlotSpinMessage) => {
      const spinNo = Math.max(1, Math.floor(msg.spin))
      if (spinNo <= lastSpinMessageRef.current) return
      lastSpinMessageRef.current = spinNo
      appliedSpinRef.current = spinNo

      const spinIndex =
        typeof msg.spinIndex === 'number' && msg.spinIndex >= 0 && msg.spinIndex <= 2
          ? msg.spinIndex
          : spinNo - 1

      const outcome = pendingOutcomeRef.current
      if (!outcome) return

      const max = msg.maxSpins || 3
      setSpinLabel(
        msg.spin >= max
          ? 'Giros concluídos…'
          : `Puxe a alavanca — giro ${Math.min(msg.spin + 1, max)} de ${max}`,
      )
      const signedDelta = spinFlySignedDelta(outcome, spinIndex, {
        isWin: msg.isWin,
        spinAmount: msg.spinAmount,
      })
      const fromPot = potRef.current
      const toPot = applySpinToRoulettePot(fromPot, signedDelta, outcome.stake)
      potRef.current = toPot
      const flyMode: CoinCelebrationMode = signedDelta >= 0 ? 'reward' : 'penalty'
      const flyAmount = Math.abs(signedDelta)
      if (flyAmount > 0) {
        launchSpinCoinFly({
          key: `${sessionRef.current}-spin${spinNo}`,
          mode: flyMode,
          amount: flyAmount,
          signedDelta,
          fromBalance: fromPot,
          toBalance: toPot,
        })
      }

      const isLastSpin = spinNo >= max
      if (isLastSpin) {
        armThirdSpinFinish()
        if (import.meta.env.DEV) {
          console.info('[special-card-roulette] spin', {
            spin: msg.spin,
            spinIndex,
            max,
            applied: appliedSpinRef.current,
          })
        }
      }
    },
    [armThirdSpinFinish, launchSpinCoinFly],
  )

  const handleSlotComplete = useCallback(() => {
    if (import.meta.env.DEV) console.info('[special-card-roulette] perfect-slot:complete')
    beginSessionSettlement()
  }, [beginSessionSettlement])

  const celebrationHost =
    typeof document !== 'undefined'
      ? document.querySelector('.phone-app') ?? document.body
      : null

  if (phase === 'loading') {
    return (
      <div className="special-roulette special-roulette--intro" data-roulette-phase={phase}>
        <GameCardRunLoader onComplete={finishIntro} />
      </div>
    )
  }

  const activeCelebration = celebration

  return (
    <>
      {phase === 'slot' && stake ? (
        <div className="special-roulette special-roulette--slot" data-roulette-phase={phase}>
          <div className="special-roulette-slot-top" aria-live="polite">
            {spinLabel ? (
              <p className="special-roulette-slot-hint muted">{spinLabel}</p>
            ) : (
              <p className="special-roulette-slot-hint muted">Puxe a alavanca para girar</p>
            )}
            <div className="special-roulette-session-bar">
              <div className="special-roulette-session-coins" data-coin-chip>
                <CoinIcon className="special-roulette-session-coin-icon" />
                <strong>{formatCoins(potBalance)}</strong>
              </div>
            </div>
          </div>
          <SlotMachineEmbed
            stake={stake}
            potBalance={potBalance}
            outcome={pendingOutcomeRef.current!}
            sessionKey={debugContext?.sessionKey}
            onSpin={handleEmbedSpin}
            onComplete={handleSlotComplete}
          />
        </div>
      ) : (
        <div className="special-roulette" data-roulette-phase={phase}>
          <p className="special-roulette-lead">
            Escolha a aposta. O valor sai do seu saldo e entra na roleta.
          </p>

          <div className="special-roulette-balance" aria-live="polite">
            <CoinIcon />
            <span>
              Saldo total: <strong>{formatCoins(balance)}</strong>
            </span>
          </div>

          {phase === 'pick' ? (
            <div className="special-roulette-stakes" role="group" aria-label="Valor da aposta">
              {SPECIAL_ROULETTE_STAKES.map((s) => {
                const affordable = canAffordStake(balance, s)
                return (
                  <button
                    key={s}
                    type="button"
                    className="special-roulette-stake"
                    disabled={!affordable}
                    aria-disabled={!affordable}
                    data-stake={s}
                    title={
                      !affordable ? `Saldo mínimo: ${formatCoins(s)} moedas` : `Apostar ${formatCoins(s)}`
                    }
                    onClick={() => pickStake(s)}
                  >
                    <span className="special-roulette-stake-value">{formatCoins(s)}</span>
                    <span className="muted">{formatCoins(s / 3)}/giro</span>
                  </button>
                )
              })}
            </div>
          ) : null}

          {phase === 'done' && pendingOutcomeRef.current ? (
            <p className="special-roulette-slot-done muted">Giros concluídos. Fechando…</p>
          ) : null}

          {error ? (
            <p className="special-roulette-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}

      {spinFly && celebrationHost ? (
        <RouletteCoinFlyFx
          key={spinFly.key}
          amount={spinFly.amount}
          signedDelta={spinFly.signedDelta}
          mode={spinFly.mode}
          fromBalance={spinFly.fromBalance}
          toBalance={spinFly.toBalance}
          originSelector={spinFly.originSelector}
          targetSelector={spinFly.targetSelector}
          onValueChange={(v) => {
            const n = Math.floor(v)
            setPotBalance(n)
            onPotDisplay?.(n)
          }}
          onDone={() => {
            setSpinFly((current) => {
              if (current) pulseSessionCoins(current.mode)
              return null
            })
          }}
        />
      ) : null}

      {activeCelebration && celebrationHost
        ? createPortal(
            <CoinRewardCelebration
              key={activeCelebration.key}
              amount={activeCelebration.amount}
              fromBalance={activeCelebration.fromBalance}
              toBalance={activeCelebration.toBalance}
              missionTitle={missionTitle}
              eyebrow={activeCelebration.eyebrow}
              mode={activeCelebration.mode}
              targetSelector={
                activeCelebration.targetSelector ?? '.special-roulette-session-coins'
              }
              subcopy={activeCelebration.subcopy}
              sessionSummary={activeCelebration.sessionSummary}
              summaryTitle={activeCelebration.summaryTitle}
              skipWalletCredit={activeCelebration.skipWalletCredit}
              potTransfer={activeCelebration.potTransfer}
              originSelector={activeCelebration.originSelector}
              onSessionSummaryComplete={
                activeCelebration.sessionSummary ? beginPotTransferAfterSummary : undefined
              }
              onBalanceChange={(v) => {
                const n = Math.floor(v)
                if (activeCelebration.balanceScope === 'wallet') {
                  onWalletDisplay?.(n)
                  walletRef.current = n
                } else {
                  setPotBalance(n)
                  onPotDisplay?.(n)
                }
              }}
              onDone={handleCelebrationDone}
            />,
            celebrationHost,
          )
        : null}
    </>
  )
}