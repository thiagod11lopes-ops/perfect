import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { CoinIcon } from './CoinIcon'
import {
  CoinRewardCelebration,
  type CoinCelebrationMode,
} from './CoinRewardCelebration'
import { ExpandFlipShell, measureCardOrigin, type CardOrigin } from './ExpandFlipShell'
import { DevNeonophisGridFields } from './DevNeonophisGridFields'
import { GameCardModal } from './GameCardModal'
import { StarCardsFlightField } from './StarCardsIntroOverlay'
import { resolveSimScene, SimCamera } from './SimCamera'
import { weekFromChallengeId, type WeekNum } from '../data/coinEconomy'
import {
  WATER_MISSION_BONUS_COINS,
  crossedWaterMissionGoal,
  parseWeightKg,
  waterMlFromQueue,
  waterMissionGoalMl,
} from '../data/waterMission'
import {
  queueWaterMissionCelebration,
  setWaterMissionFlushPaused,
} from '../data/waterMissionCelebrate'
import { noteCoinCrossing, setWeekUnlockFlushPaused } from '../data/weekUnlockCelebrate'
import {
  bandLabel,
  buildDayChallenges,
  formatUnlockTime,
  formatWindowRange,
  getWindowPhase,
  isMainWorkoutCard,
  starExtrasCountdownMs,
  WORKOUT_LATE_PENALTY,
} from '../data/dailyChallenges'
import {
  gameIdFromChallengeId,
  isGameCard,
  mergeRoutineWithStarCards,
} from '../data/dayGames'
import { DayChallengeBackArt } from './DayChallengeBackArt'
import { pickWorkoutVisionExercise } from '../data/dayWorkoutVision'
import type { WorkoutVisionCompletePayload } from './WorkoutVisionEmbed'
import type { NeonophisCompletePayload } from './NeonophisEmbed'
import { isDevGameCardReplayable, needsDevGamePrepareReplay } from '../data/gameCardDev'
import {
  finalPotTotalForOutcome,
  rouletteWalletAfterSettle,
  type SpecialRouletteOutcome,
  type SpecialRouletteStake,
} from '../data/specialCardRoulette'
import {
  getRoutineForWeekday,
  POINT_TOLERANCE_MIN,
  resolveRoutineMinutes,
} from '../data/routine'
import type { WordSearchLevel } from '../data/wordSearchLevels'
import type { DayCard } from '../data/types'
import { useAppBase } from '../hooks/useAppBase'
import { useAppClock } from '../hooks/useAppClock'
import { useApp } from '../store/AppContext'
import { simulateChallengeAi } from '../utils/simulateChallengeAi'
import { resolveAppMinutes } from '../utils/dates'
import { formatCoins } from '../utils/format'

type WorkoutTiming = 'before' | 'in' | 'past'

function formatRemain(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatHmsCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type DailyChallengesProps = {
  setDisplayCoins: (value: number | ((prev: number) => number)) => void
  pinDisplayCoinsUntilSynced: (value: number) => void
  setCoinCelebrating: (value: boolean) => void
  starCardsRevealed?: boolean
  starRevealAnimating?: boolean
  onStarRevealAnimEnd?: () => void
}

export function DailyChallenges({
  setDisplayCoins,
  pinDisplayCoinsUntilSynced,
  setCoinCelebrating,
  starCardsRevealed = false,
  starRevealAnimating = false,
  onStarRevealAnimEnd,
}: DailyChallengesProps) {
  const { state, dispatch } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    ctx,
    weekday,
    now: clockDate,
    minutes: clockMinutes,
    devMode,
    devDay,
    devTime,
    devTimeLive,
    setDevDay,
    setDevTime,
    clockPaused,
    toggleDevClock,
  } = useAppClock()
  const { isMobileSim } = useAppBase()
  // Mantém o baralho do dia estável: não troca a semana no meio do dia ao liberar unlock.
  const deckWeek = useMemo<WeekNum>(() => {
    const existing = state.dayQueues[ctx.dateKey]?.cards
    if (existing?.length) {
      for (const card of existing) {
        const w = weekFromChallengeId(card.challengeId)
        if (w) return w
      }
    }
    return ctx.week
  }, [state.dayQueues, ctx.dateKey, ctx.week])

  const dayRoutine = useMemo(
    () => getRoutineForWeekday(state.routine, weekday),
    [state.routine, weekday],
  )

  const challenges = useMemo(() => {
    const base = buildDayChallenges(
      deckWeek,
      weekday,
      ctx.isRest,
      ctx.letter,
      dayRoutine,
      state.profile.weight,
    )
    return mergeRoutineWithStarCards(base, deckWeek, weekday)
  }, [deckWeek, weekday, ctx.isRest, ctx.letter, dayRoutine, ctx.dateKey, state.profile.weight])

  const queue = state.dayQueues[ctx.dateKey]
  const orderedCards = useMemo(() => {
    const list = (queue?.cards ?? []).filter((c) => !c.challengeId.includes('doodle-jump'))
    return [...list].sort((a, b) => {
      const aStar = isGameCard(a)
      const bStar = isGameCard(b)
      if (aStar !== bStar) return aStar ? 1 : -1
      if (!aStar && a.windowStartMinutes !== b.windowStartMinutes) {
        return a.windowStartMinutes - b.windowStartMinutes
      }
      if (!aStar && a.windowEndMinutes !== b.windowEndMinutes) {
        return a.windowEndMinutes - b.windowEndMinutes
      }
      return a.challengeId.localeCompare(b.challengeId)
    })
  }, [queue?.cards])
  const routineCards = useMemo(
    () => orderedCards.filter((c) => !isGameCard(c)),
    [orderedCards],
  )
  const starCards = useMemo(
    () => orderedCards.filter((c) => isGameCard(c)),
    [orderedCards],
  )
  const [tick, setTick] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [cardOrigin, setCardOrigin] = useState<CardOrigin | null>(null)
  const [reviewView, setReviewView] = useState<{
    card: DayCard
    index: number
    kind: 'lost' | 'done'
    origin: CardOrigin
  } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [capturedAt, setCapturedAt] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [rouletteCelebrating, setRouletteCelebrating] = useState(false)
  const [wordSearchStartLevel, setWordSearchStartLevel] = useState<WordSearchLevel | null>(null)
  const [celebration, setCelebration] = useState<{
    amount: number
    fromBalance: number
    toBalance: number
    title: string
    kind: string
    mode: CoinCelebrationMode
    latePenalty?: number
    challengeId?: string
    snakeWin?: boolean
    /** Celebração com modal aberto — moedas voam pro chip do caça-palavras. */
    wordSearchModal?: boolean
    quizModal?: boolean
  } | null>(null)
  const setDisplayCoinsStable = useCallback(
    (value: number) => setDisplayCoins(value),
    [setDisplayCoins],
  )

  const starFlightFieldRef = useRef<HTMLElement>(null)
  const onStarRevealAnimEndRef = useRef(onStarRevealAnimEnd)
  onStarRevealAnimEndRef.current = onStarRevealAnimEnd
  const handleStarIntroComplete = useCallback(() => {
    onStarRevealAnimEndRef.current?.()
  }, [])

  // Segura desbloqueio de semana / missão água até a animação de moedas acabar.
  useEffect(() => {
    setWeekUnlockFlushPaused(!!celebration)
    setWaterMissionFlushPaused(!!celebration)
    setCoinCelebrating(!!celebration || rouletteCelebrating)
  }, [celebration, rouletteCelebrating, setCoinCelebrating])

  useEffect(() => {
    return () => {
      setWeekUnlockFlushPaused(false)
      setWaterMissionFlushPaused(false)
    }
  }, [])

  useEffect(() => {
    dispatch({
      type: 'ENSURE_DAY_QUEUE',
      dateKey: ctx.dateKey,
      challenges,
      minutes: clockMinutes,
    })
  }, [ctx.dateKey, challenges, dispatch, clockMinutes])

  useEffect(() => {
    const onTick = () => {
      setTick((n) => n + 1)
      const minutes = resolveAppMinutes(state)
      dispatch({ type: 'SYNC_DAY_UNLOCKS', dateKey: ctx.dateKey, minutes })
      dispatch({ type: 'EXPIRE_OVERDUE_CARDS', dateKey: ctx.dateKey, minutes })
    }
    const id = window.setInterval(onTick, 1000)
    return () => window.clearInterval(id)
  }, [
    ctx.dateKey,
    dispatch,
    state.devMode,
    state.devDay,
    state.devTime,
    state.devClockAnchoredAt,
    state.devClockPaused,
    state.startDate,
  ])

  // DEV: só ao editar dia/hora no painel (âncora), não a cada tick do relógio simulado.
  const devDayAnchor = state.devDay
  const devTimeAnchor = state.devTime
  useEffect(() => {
    if (!state.devMode) return
    setModalOpen(false)
    setActiveId(null)
    setCardOrigin(null)
    setPreview(null)
    setCapturedAt(null)
    setError('')
    setBusy(false)
  }, [state.devMode, devDayAnchor, devTimeAnchor, ctx.dateKey, state.devGameCardReplayEpoch])

  // No modo DEV o relógio é manual; fora dele avança com o tempo real.
  void tick
  const nowMs = devMode ? clockDate.getTime() : Date.now()

  const activeCard = queue?.cards.find((c) => c.challengeId === activeId) ?? null
  const activeGameId = activeCard ? gameIdFromChallengeId(activeCard.challengeId) : null

  const workoutVisionMission = useMemo(() => {
    if (activeGameId !== 'workout-vision') return null
    return pickWorkoutVisionExercise(ctx.dateKey, deckWeek, ctx.letter)
  }, [activeGameId, ctx.dateKey, deckWeek, ctx.letter])

  useEffect(() => {
    if (!modalOpen || !activeCard) return
    if (activeCard.status === 'expired') {
      setModalOpen(false)
      setActiveId(null)
      setCardOrigin(null)
      setPreview(null)
      setCapturedAt(null)
      setError('')
      setBusy(false)
      return
    }
    if (
      activeCard.status === 'completed' &&
      !isDevGameCardReplayable(activeCard, state.devMode, state.devGameCardReplayEpoch)
    ) {
      setModalOpen(false)
      setActiveId(null)
      setCardOrigin(null)
      setPreview(null)
      setCapturedAt(null)
      setError('')
      setBusy(false)
    }
  }, [modalOpen, activeCard, state.devMode, state.devGameCardReplayEpoch])

  useEffect(() => {
    if (!modalOpen && !reviewView) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [modalOpen, reviewView])

  // Vindo da aba Treino → “Marcar feito”: abre o card de treino do dia.
  useEffect(() => {
    const navState = location.state as { openWorkoutCard?: boolean } | null
    if (!navState?.openWorkoutCard) return
    if (!queue?.cards?.length) return

    const card = orderedCards.find((c) => isMainWorkoutCard(c))
    navigate(location.pathname, { replace: true, state: {} })
    if (!card || card.status === 'completed' || card.status === 'expired') return

    const el =
      (document.querySelector(
        `[data-challenge-id="${card.challengeId}"]`,
      ) as HTMLElement | null) ?? null
    const origin = el
      ? measureCardOrigin(el)
      : { top: 120, left: 40, width: 72, height: 96 }

    setReviewView(null)
    setCardOrigin(origin)
    setActiveId(card.challengeId)
    setPreview(null)
    setCapturedAt(null)
    setError('')
    setBusy(false)
    setModalOpen(true)
  }, [location.state, location.pathname, navigate, orderedCards, queue])

  const total = orderedCards.length
  const doneCount = orderedCards.filter((c) => c.status === 'completed').length
  const lostCount = orderedCards.filter((c) => c.status === 'expired').length
  const finished = total > 0 && doneCount + lostCount >= total

  const remainMs = activeCard?.deadlineAt ? activeCard.deadlineAt - nowMs : 0
  const progress =
    activeCard?.deadlineAt && activeCard.durationMin
      ? Math.max(0, Math.min(1, remainMs / Math.max(activeCard.durationMin * 60_000, 1)))
      : 0

  const openCard = (card: DayCard, el: HTMLElement) => {
    const gid = gameIdFromChallengeId(card.challengeId)
    if (gid === 'word-search') {
      setWordSearchStartLevel(null)
    }
    if (isGameCard(card)) {
      if (card.status === 'expired') return
      if (
        needsDevGamePrepareReplay(card, state.devMode, state.devGameCardReplayEpoch)
      ) {
        dispatch({
          type: 'DEV_PREPARE_GAME_CARD_REPLAY',
          dateKey: ctx.dateKey,
          challengeId: card.challengeId,
        })
      }
    } else if (card.status === 'completed' || card.status === 'expired') {
      return
    }
    // Análise antiga sem request em voo (ex.: reload) não pode travar o modal
    if (card.status === 'analyzing' && !busy) {
      dispatch({
        type: 'FINISH_CARD_REJECT',
        dateKey: ctx.dateKey,
        challengeId: card.challengeId,
        aiMessage: '',
      })
    }
    setReviewView(null)
    setCardOrigin(measureCardOrigin(el))
    setActiveId(card.challengeId)
    setPreview(null)
    setCapturedAt(null)
    setError('')
    setBusy(false)
    setModalOpen(true)
  }

  const openReview = (card: DayCard, index: number, kind: 'lost' | 'done', el: HTMLElement) => {
    if (busy) return
    setModalOpen(false)
    setActiveId(null)
    setCardOrigin(null)
    setReviewView({ card, index, kind, origin: measureCardOrigin(el) })
  }

  const finishCloseModal = () => {
    setModalOpen(false)
    setActiveId(null)
    setCardOrigin(null)
    setPreview(null)
    setCapturedAt(null)
    setError('')
    setWordSearchStartLevel(null)
  }

  const finishCloseReview = () => {
    setReviewView(null)
  }

  const onCapturePhoto = (dataUrl: string, shotAt: number) => {
    setError('')
    setPreview(dataUrl)
    setCapturedAt(shotAt)
  }

  const workoutTimingFor = (card: DayCard): WorkoutTiming | null => {
    if (!isMainWorkoutCard(card)) return null
    return getWindowPhase(
      ctx.dateKey,
      card.windowStartMinutes,
      card.windowEndMinutes,
      nowMs,
    )
  }

  const canCompleteCard = (card: DayCard) => {
    if (card.status === 'active' || card.status === 'analyzing') return true
    if (isMainWorkoutCard(card) && card.status === 'locked') return true
    return false
  }

  const completeCard = (
    card: DayCard,
    aiMessage: string,
    photoDataUrl = '',
  ) => {
    const amount = card.coins
    const fromBalance = state.coins
    const fromWater = waterMlFromQueue(queue)
    const waterGain = card.waterMl ?? 0
    const waterGoalMl = waterMissionGoalMl(parseWeightKg(state.profile.weight))
    const hitWaterMission =
      waterGain > 0 &&
      waterGoalMl != null &&
      crossedWaterMissionGoal(fromWater, fromWater + waterGain, waterGoalMl)
    const bonus = hitWaterMission ? WATER_MISSION_BONUS_COINS : 0
    const toBalance = fromBalance + amount + bonus
    const timing = workoutTimingFor(card)
    const latePenalty =
      timing === 'past' ? WORKOUT_LATE_PENALTY : 0
    const stampMsg =
      timing === 'before'
        ? `${aiMessage} · Antecipado.`
        : timing === 'past'
          ? `${aiMessage} · Em atraso.`
          : aiMessage
    setWeekUnlockFlushPaused(true)
    setWaterMissionFlushPaused(true)
    noteCoinCrossing(fromBalance, toBalance)
    if (hitWaterMission && waterGoalMl != null) {
      queueWaterMissionCelebration(ctx.dateKey, waterGoalMl)
    }
    dispatch({
      type: 'FINISH_CARD_SUCCESS',
      dateKey: ctx.dateKey,
      challengeId: card.challengeId,
      photoDataUrl,
      aiMessage: stampMsg,
    })
    setDisplayCoins(fromBalance)
    setCoinCelebrating(true)
    finishCloseModal()
    setCelebration({
      amount: amount + bonus,
      fromBalance,
      toBalance,
      title: card.title,
      kind: card.kind,
      mode: 'reward',
      latePenalty: latePenalty || undefined,
      challengeId: card.challengeId,
    })
  }

  const finishCoinCelebration = () => {
    if (!celebration) return
    if (celebration.mode === 'reward' && celebration.latePenalty) {
      const penalty = celebration.latePenalty
      const fromBalance = celebration.toBalance
      const toBalance = Math.max(0, fromBalance - penalty)
      dispatch({
        type: 'APPLY_COIN_PENALTY',
        amount: penalty,
        dateKey: ctx.dateKey,
        challengeId: celebration.challengeId,
        reason: `Atraso: −${penalty} moeda`,
      })
      setDisplayCoins(fromBalance)
      setCelebration({
        amount: penalty,
        fromBalance,
        toBalance,
        title: celebration.title,
        kind: celebration.kind,
        mode: 'penalty',
      })
      return
    }
    const closePocketGameAfter =
      (celebration.wordSearchModal || celebration.quizModal) &&
      !(celebration.mode === 'reward' && celebration.latePenalty)
    setDisplayCoins(celebration.toBalance)
    setCelebration(null)
    setCoinCelebrating(false)
    setWeekUnlockFlushPaused(false)
    setWaterMissionFlushPaused(false)
    if (closePocketGameAfter) finishCloseModal()
  }

  const lockGameRoulettePot = useCallback(
    (stake: SpecialRouletteStake) => {
      setWeekUnlockFlushPaused(true)
      dispatch({ type: 'START_GAME_ROULETTE_POT', stake })
      setDisplayCoins((prev) => Math.max(0, prev - stake))
    },
    [dispatch, setDisplayCoins],
  )

  const settleWorkoutVision = (card: DayCard, payload: WorkoutVisionCompletePayload) => {
    const label = workoutVisionMission?.label ?? 'exercício'
    const aiMessage = `Desafio do dia: ${payload.reps} repetições em ${label} (WorkoutVision).`
    completeCard(card, aiMessage, '')
  }

  const beginNeonophisWinReward = (card: DayCard) => {
    const fromBalance = state.coins
    const toBalance = fromBalance + card.coins
    setWeekUnlockFlushPaused(true)
    setWaterMissionFlushPaused(true)
    noteCoinCrossing(fromBalance, toBalance)
    setDisplayCoins(fromBalance)
    setCelebration({
      amount: card.coins,
      fromBalance,
      toBalance,
      title: card.title,
      kind: card.kind,
      mode: 'reward',
      challengeId: card.challengeId,
      snakeWin: true,
    })
  }

  const settleMemoryMatch = (
    card: DayCard,
    payload: import('./SpecialCardMemoryMatch').MemoryMatchWinPayload,
  ) => {
    const reward = payload.totalReward
    const aiMessage = `Memória do treino: nível ${payload.lastLevel} (+${reward} moedas).`
    const fromBalance = state.coins
    const toBalance = fromBalance + reward
    setWeekUnlockFlushPaused(true)
    setWaterMissionFlushPaused(true)
    noteCoinCrossing(fromBalance, toBalance)
    dispatch({
      type: 'FINISH_CARD_SUCCESS',
      dateKey: ctx.dateKey,
      challengeId: card.challengeId,
      photoDataUrl: '',
      aiMessage,
      coinsAwarded: reward,
    })
    setDisplayCoins(fromBalance)
    setCoinCelebrating(true)
    setCelebration({
      amount: reward,
      fromBalance,
      toBalance,
      title: card.title,
      kind: card.kind,
      mode: 'reward',
      challengeId: card.challengeId,
    })
    finishCloseModal()
  }

  const settleQuiz = (card: DayCard, reward: number) => {
    const aiMessage = `Quiz: acertou (+${reward} moedas).`
    const fromBalance = state.coins
    const toBalance = fromBalance + reward
    setWeekUnlockFlushPaused(true)
    setWaterMissionFlushPaused(true)
    noteCoinCrossing(fromBalance, toBalance)
    dispatch({
      type: 'FINISH_CARD_SUCCESS',
      dateKey: ctx.dateKey,
      challengeId: card.challengeId,
      photoDataUrl: '',
      aiMessage,
      coinsAwarded: reward,
    })
    setDisplayCoins(fromBalance)
    setCoinCelebrating(true)
    setCelebration({
      amount: reward,
      fromBalance,
      toBalance,
      title: card.title,
      kind: card.kind,
      mode: 'reward',
      challengeId: card.challengeId,
      quizModal: true,
    })
  }

  const settleWordSearch = (
    card: DayCard,
    payload: import('./SpecialCardWordSearch').WordSearchWinPayload,
  ) => {
    const reward = payload.totalReward
    const aiMessage = `Caça-palavras: nível ${payload.level} (+${reward} moedas).`
    const fromBalance = state.coins
    const toBalance = fromBalance + reward
    setWeekUnlockFlushPaused(true)
    setWaterMissionFlushPaused(true)
    noteCoinCrossing(fromBalance, toBalance)
    dispatch({
      type: 'FINISH_CARD_SUCCESS',
      dateKey: ctx.dateKey,
      challengeId: card.challengeId,
      photoDataUrl: '',
      aiMessage,
      coinsAwarded: reward,
    })
    setDisplayCoins(fromBalance)
    setCoinCelebrating(true)
    setCelebration({
      amount: reward,
      fromBalance,
      toBalance,
      title: card.title,
      kind: card.kind,
      mode: 'reward',
      challengeId: card.challengeId,
      wordSearchModal: true,
    })
  }

  const settleNeonophis = (card: DayCard, payload: NeonophisCompletePayload) => {
    if (!payload.success) return
    const aiMessage = `Missão de Habilidade: ${payload.coins} moedas coletadas no Neon Ophis (1 min).`
    dispatch({
      type: 'FINISH_CARD_SUCCESS',
      dateKey: ctx.dateKey,
      challengeId: card.challengeId,
      photoDataUrl: '',
      aiMessage,
    })
    finishCloseModal()
  }

  const settleGameRoulette = (card: DayCard, outcome: SpecialRouletteOutcome) => {
    const aiMessage =
      outcome.kind === 'win'
        ? `Roleta: prêmio ${outcome.prizeTotal} moedas (aposta ${outcome.stake}).`
        : `Roleta: aposta ${outcome.stake} + penalidade ${outcome.extraLoss} moedas.`

    const potReturn = finalPotTotalForOutcome(outcome)
    const settledCoins = rouletteWalletAfterSettle(state.coins, outcome)

    dispatch({
      type: 'FINISH_GAME_ROULETTE',
      dateKey: ctx.dateKey,
      challengeId: card.challengeId,
      aiMessage,
      stake: outcome.stake,
      prizeTotal: outcome.prizeTotal,
      extraLoss: outcome.extraLoss,
      potReturn,
    })

    if (import.meta.env.DEV && potReturn > 0) {
      console.info('[game-roulette] settle', {
        potReturn,
        settledCoins,
        coinsBefore: state.coins,
      })
    }

    pinDisplayCoinsUntilSynced(settledCoins)
    setDisplayCoins(settledCoins)

    window.setTimeout(() => {
      finishCloseModal()
      setRouletteCelebrating(false)
      const chip = document.querySelector('.page-coins-chip')
      chip?.classList.add('coin-chip-pop')
      window.setTimeout(() => chip?.classList.remove('coin-chip-pop'), 650)
    }, 400)
  }

  const submitConfirm = () => {
    if (!activeCard || busy) return
    if (!canCompleteCard(activeCard)) return
    if (
      !isMainWorkoutCard(activeCard) &&
      activeCard.deadlineAt &&
      nowMs >= activeCard.deadlineAt
    ) {
      dispatch({ type: 'EXPIRE_OVERDUE_CARDS', dateKey: ctx.dateKey, minutes: clockMinutes })
      finishCloseModal()
      return
    }
    const label = activeCard.confirmLabel || 'Confirmar'
    const stamp = clockDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    completeCard(activeCard, `${label} às ${stamp} — sem verificação por foto.`)
  }

  const submit = async () => {
    if (!activeCard || !preview || busy) return
    if (!canCompleteCard(activeCard)) return
    if (
      !isMainWorkoutCard(activeCard) &&
      activeCard.deadlineAt &&
      nowMs >= activeCard.deadlineAt
    ) {
      dispatch({ type: 'EXPIRE_OVERDUE_CARDS', dateKey: ctx.dateKey, minutes: clockMinutes })
      finishCloseModal()
      return
    }

    setBusy(true)
    setError('')
    const challengeId = activeCard.challengeId
    dispatch({
      type: 'START_CARD_ANALYSIS',
      dateKey: ctx.dateKey,
      challengeId,
      photoDataUrl: preview,
    })

    try {
      const verdict = await simulateChallengeAi({
        challengeTitle: activeCard.title,
        photoDataUrl: preview,
        fileName: `sim-camera-${capturedAt ?? Date.now()}.jpg`,
        capturedAt: capturedAt ?? undefined,
      })
      if (verdict.approved) {
        completeCard(activeCard, verdict.message, preview)
      } else {
        dispatch({
          type: 'FINISH_CARD_REJECT',
          dateKey: ctx.dateKey,
          challengeId,
          aiMessage: verdict.message,
        })
        setError(verdict.message)
      }
    } catch {
      dispatch({
        type: 'FINISH_CARD_REJECT',
        dateKey: ctx.dateKey,
        challengeId,
        aiMessage: 'Falha ao verificar. Tente de novo.',
      })
      setError('Falha ao verificar. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  if (!queue) {
    return (
      <section className="card stack-sm">
        <p className="muted" style={{ margin: 0 }}>Preparando o baralho do dia…</p>
      </section>
    )
  }

  if (total === 0) {
    return (
      <section className="day-card-empty stack">
        <p className="eyebrow">Hoje</p>
        <h2 className="display h2" style={{ margin: 0 }}>Dia livre</h2>
        <p className="muted" style={{ margin: 0 }}>Nenhuma carta para hoje.</p>
      </section>
    )
  }

  const urgent = !!activeCard && remainMs > 0 && remainMs < 60_000
  const earned = orderedCards.reduce((sum, c) => sum + c.coinsAwarded, 0)
  const activeIndex = activeCard
    ? orderedCards.findIndex((c) => c.challengeId === activeCard.challengeId)
    : -1

  const sleepDeadlineLabel = dayRoutine.sleep?.start?.trim() || '23:00'
  const sleepStartMin = resolveRoutineMinutes(dayRoutine, 'sleep', 'start')
  // Atualiza a cada tick do relógio do app (real ou DEV) — evita useMemo preso em nowMs antigo.
  void tick
  const starExtrasRemainMs =
    sleepStartMin == null
      ? 0
      : starExtrasCountdownMs(ctx.dateKey, sleepStartMin, clockDate.getTime())
  const starCountdownLabel =
    sleepStartMin == null ? '00:00:00' : formatHmsCountdown(starExtrasRemainMs)
  const starExtrasPastDeadline = sleepStartMin != null && starExtrasRemainMs === 0
  const starCountdownUrgent =
    sleepStartMin != null && starExtrasRemainMs > 0 && starExtrasRemainMs <= 3_600_000
  const showStarField =
    starCards.length > 0 && starCardsRevealed && !starRevealAnimating

  const showStarFlight = starRevealAnimating && starCards.length > 0

  const activeWorkoutTiming = activeCard ? workoutTimingFor(activeCard) : null
  const activeWindowPhase = activeCard
    ? getWindowPhase(
        ctx.dateKey,
        activeCard.windowStartMinutes,
        activeCard.windowEndMinutes,
        nowMs,
      )
    : null
  const modalLocked =
    !!activeCard &&
    activeCard.status === 'locked' &&
    activeWorkoutTiming !== 'before' &&
    !(
      devMode &&
      activeWindowPhase === 'before' &&
      activeCard &&
      !isGameCard(activeCard)
    )
  const remainLabel =
    activeWorkoutTiming === 'past'
      ? 'Em atraso'
      : activeCard?.status === 'locked'
        ? formatWindowRange(
            activeCard.windowStartMinutes,
            activeCard.windowEndMinutes,
          )
        : formatRemain(remainMs)

  return (
    <section className="stack day-flow">
      {devMode && !isMobileSim ? (
        <div className="deck-toolbar">
          <div className="dev-clock-controls" aria-label="Relógio de desenvolvimento">
            <label className="dev-clock-field">
              <span>Dia</span>
              <input
                type="number"
                min={1}
                max={28}
                value={devDay}
                onChange={(e) => setDevDay(Number(e.target.value) || 1)}
              />
              <span className="dev-clock-suffix">/28</span>
            </label>
            <label className="dev-clock-field">
              <span>Hora</span>
              <input
                type="time"
                step={1}
                value={devTime}
                onChange={(e) => setDevTime(e.target.value || '08:00:00')}
              />
              <button
                type="button"
                className={`dev-clock-play${clockPaused ? ' is-paused' : ''}`}
                onClick={toggleDevClock}
                aria-label={clockPaused ? 'Continuar relógio' : 'Pausar relógio'}
                title={clockPaused ? 'Play' : 'Pause'}
              >
                {clockPaused ? '▶' : '❚❚'}
              </button>
              <span className="dev-clock-live" title="Relógio simulado em tempo real">
                {devTimeLive}
                {clockPaused ? ' · pausado' : ''}
              </span>
            </label>
            <DevNeonophisGridFields variant="toolbar" />
          </div>
        </div>
      ) : null}

      {finished ? (
        <div className="deck-summary">
          <strong>Baralho finalizado</strong>
          <span className="muted">+{formatCoins(earned)} moedinhas hoje</span>
        </div>
      ) : null}

      <div className="deck-grid" role="list" aria-label="Rotina do dia">
        {routineCards.map((card, index) => (
          <DeckTile
            key={card.challengeId}
            card={card}
            index={index}
            devMode={state.devMode}
            devGameCardReplayEpoch={state.devGameCardReplayEpoch}
            hidden={
              (modalOpen && activeId === card.challengeId) ||
              reviewView?.card.challengeId === card.challengeId
            }
            onOpen={(el) => openCard(card, el)}
            onOpenReview={(kind, el) => openReview(card, index, kind, el)}
          />
        ))}
      </div>

      <StarCardsFlightField
        active={showStarFlight}
        fieldRef={starFlightFieldRef}
        onComplete={handleStarIntroComplete}
      >
        {starCards.map((card, index) => (
          <div key={`flight-${card.challengeId}`} className="deck-star-flight-item">
            <DeckTile
              card={card}
              index={index}
              hideSchedule
              starCountdownLabel={starCountdownLabel}
              starCountdownUrgent={starCountdownUrgent || starExtrasPastDeadline}
              starDeadlineLost={starExtrasPastDeadline}
              devMode={state.devMode}
              devGameCardReplayEpoch={state.devGameCardReplayEpoch}
              hidden={false}
              onOpen={() => {}}
              onOpenReview={() => {}}
            />
          </div>
        ))}
      </StarCardsFlightField>

      {showStarField ? (
        <section className="deck-stars-field is-landed" aria-label="Cartas especiais">
          <p className="deck-stars-unlocked-banner">Cartas extras desbloqueadas</p>
          <div className="deck-grid deck-grid--stars" role="list">
            {starCards.map((card, index) => (
              <DeckTile
                key={card.challengeId}
                card={card}
                index={index}
                hideSchedule
                starCountdownLabel={starCountdownLabel}
                starCountdownUrgent={starCountdownUrgent || starExtrasPastDeadline}
                starDeadlineLost={starExtrasPastDeadline}
                devMode={state.devMode}
                devGameCardReplayEpoch={state.devGameCardReplayEpoch}
                hidden={
                  (modalOpen && activeId === card.challengeId) ||
                  reviewView?.card.challengeId === card.challengeId
                }
                onOpen={(el) => openCard(card, el)}
                onOpenReview={(kind, el) => openReview(card, index, kind, el)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {modalOpen && activeCard && cardOrigin && isGameCard(activeCard)
        ? createPortal(
            <GameCardModal
              card={activeCard}
              index={Math.max(0, activeIndex)}
              locked={modalLocked}
              busy={busy}
              balance={state.coins}
              playSessionKey={`${activeCard.challengeId}:r${state.devGameCardReplayEpoch}`}
              devGameCardReplayEpoch={state.devGameCardReplayEpoch}
              onClose={finishCloseModal}
              onPotStakeLocked={lockGameRoulettePot}
              onRouletteCelebratingChange={setRouletteCelebrating}
              onMainWalletSync={setDisplayCoins}
              onGameSettled={(outcome) => {
                const live =
                  queue?.cards.find((c) => c.challengeId === activeCard.challengeId) ?? activeCard
                settleGameRoulette(live, outcome)
              }}
              workoutVisionExercise={workoutVisionMission ?? undefined}
              sleepDeadlineLabel={sleepDeadlineLabel}
              onWorkoutVisionComplete={(payload) => {
                const live =
                  queue?.cards.find((c) => c.challengeId === activeCard.challengeId) ?? activeCard
                settleWorkoutVision(live, payload)
              }}
              openOrigin={cardOrigin}
              onNeonophisWinReward={() => {
                const live =
                  queue?.cards.find((c) => c.challengeId === activeCard.challengeId) ?? activeCard
                beginNeonophisWinReward(live)
              }}
              onNeonophisComplete={(payload) => {
                const live =
                  queue?.cards.find((c) => c.challengeId === activeCard.challengeId) ?? activeCard
                settleNeonophis(live, payload)
              }}
              onMemoryMatchWin={(payload) => {
                const live =
                  queue?.cards.find((c) => c.challengeId === activeCard.challengeId) ?? activeCard
                settleMemoryMatch(live, payload)
              }}
              wordSearchLevel={activeGameId === 'word-search' ? wordSearchStartLevel : null}
              onWordSearchLevelPick={(level) => setWordSearchStartLevel(level)}
              onWordSearchWin={(payload) => {
                const live =
                  queue?.cards.find((c) => c.challengeId === activeCard.challengeId) ?? activeCard
                settleWordSearch(live, payload)
              }}
              onQuizWin={(payload) => {
                const live =
                  queue?.cards.find((c) => c.challengeId === activeCard.challengeId) ?? activeCard
                settleQuiz(live, payload.reward)
              }}
            />,
            document.querySelector('.phone-app') ?? document.body,
          )
        : null}

      {modalOpen && activeCard && cardOrigin && !isGameCard(activeCard)
        ? createPortal(
            <CardModal
              card={activeCard}
              index={Math.max(0, activeIndex)}
              origin={cardOrigin}
              remainLabel={remainLabel}
              progress={
                activeCard.status === 'locked' || activeWorkoutTiming === 'past'
                  ? 0
                  : progress
              }
              urgent={urgent && !modalLocked && activeWorkoutTiming !== 'past'}
              preview={preview}
              error={error}
              busy={busy}
              locked={modalLocked}
              workoutTiming={activeWorkoutTiming}
              clockDate={clockDate}
              onExited={finishCloseModal}
              onCapture={onCapturePhoto}
              onRetake={() => {
                setPreview(null)
                setCapturedAt(null)
              }}
              onSubmit={submit}
              onConfirm={submitConfirm}
            />,
            document.querySelector('.phone-app') ?? document.body,
          )
        : null}

      {reviewView
        ? createPortal(
            <ReviewCardModal
              card={reviewView.card}
              index={reviewView.index}
              kind={reviewView.kind}
              origin={reviewView.origin}
              onExited={finishCloseReview}
            />,
            document.querySelector('.phone-app') ?? document.body,
          )
        : null}

      {celebration ? (
        <CoinRewardCelebration
          key={`${celebration.mode}-${celebration.title}-${celebration.fromBalance}-${celebration.toBalance}`}
          amount={celebration.amount}
          fromBalance={celebration.fromBalance}
          toBalance={celebration.toBalance}
          missionTitle={celebration.title}
          missionKind={celebration.kind}
          mode={celebration.mode}
          embedVariant={celebration.snakeWin ? 'snake-win' : undefined}
          targetSelector={
            celebration.quizModal
              ? '.game-card-modal-panel--quiz [data-coin-chip]'
              : celebration.wordSearchModal
                ? '.game-card-modal-panel--word-search [data-coin-chip]'
                : '[data-coin-chip]'
          }
          onBalanceChange={setDisplayCoinsStable}
          onDone={finishCoinCelebration}
        />
      ) : null}
    </section>
  )
}

function DeckTile({
  card,
  index,
  hidden,
  hideSchedule,
  starCountdownLabel,
  starCountdownUrgent,
  starDeadlineLost,
  devMode,
  devGameCardReplayEpoch,
  onOpen,
  onOpenReview,
}: {
  card: DayCard
  index: number
  hidden?: boolean
  hideSchedule?: boolean
  starCountdownLabel?: string
  starCountdownUrgent?: boolean
  starDeadlineLost?: boolean
  devMode: boolean
  devGameCardReplayEpoch: number
  onOpen: (el: HTMLElement) => void
  onOpenReview: (kind: 'lost' | 'done', el: HTMLElement) => void
}) {
  const devGamePlayable = isDevGameCardReplayable(card, devMode, devGameCardReplayEpoch)

  if (card.status === 'completed' && !devGamePlayable) {
    return (
      <button
        type="button"
        className={`deck-card is-done${hidden ? ' is-launching' : ''}`}
        role="listitem"
        data-challenge-id={card.challengeId}
        aria-label={`${card.title} — Carta Concluída. Toque para ver detalhes`}
        onClick={(e) => onOpenReview('done', e.currentTarget)}
      >
        <div className="deck-card-shell">
          <div className="deck-card-face deck-card-face-done">
            <span className="deck-card-num">{String(index + 1).padStart(2, '0')}</span>
            <p className="deck-card-kind">
              {bandLabel[card.band]} · {card.kind}
            </p>
            <h3>{card.title}</h3>
            <span className="deck-card-coins-mini">
              +{formatCoins(card.coinsAwarded || card.coins)} <CoinIcon />
            </span>
          </div>
          <div className="deck-result-overlay deck-done-overlay" aria-hidden />
          <div className="deck-banner deck-banner-diagonal deck-banner-done">
            <span>Carta Concluída</span>
          </div>
        </div>
      </button>
    )
  }

  if (card.status === 'expired') {
    return (
      <button
        type="button"
        className={`deck-card is-lost${hidden ? ' is-launching' : ''}`}
        role="listitem"
        data-challenge-id={card.challengeId}
        aria-label={`${card.title} — Carta Perdida. Toque para ver detalhes`}
        onClick={(e) => onOpenReview('lost', e.currentTarget)}
      >
        <div className="deck-card-shell">
          <div className="deck-card-face deck-card-face-lost">
            <span className="deck-card-num">{String(index + 1).padStart(2, '0')}</span>
            <p className="deck-card-kind">
              {bandLabel[card.band]} · {card.kind}
            </p>
            <h3>{card.title}</h3>
            <span className="deck-card-coins-mini muted">
              0 <CoinIcon />
            </span>
          </div>
          <div className="deck-result-overlay deck-lost-overlay" aria-hidden />
          <div className="deck-banner deck-banner-diagonal deck-banner-lost">
            <span>Carta Perdida</span>
          </div>
        </div>
      </button>
    )
  }

  // locked / active / analyzing — sempre viráveis (sem cadeado)
  const canConfirm = card.status === 'active' || card.status === 'analyzing'
  const special = isGameCard(card)
  const gameId = special ? gameIdFromChallengeId(card.challengeId) : null
  const dayChallenge = gameId === 'workout-vision'
  const roletaChallenge = gameId === 'slot-machine'
  const skillChallenge =
    gameId === 'neonophis' ||
    gameId === 'memory-match' ||
    gameId === 'word-search' ||
    gameId === 'quiz'
  const entertainmentChallenge = roletaChallenge || skillChallenge
  const gameStarBack = dayChallenge || entertainmentChallenge
  const timeLabel =
    card.windowKind === 'interval'
      ? formatWindowRange(card.windowStartMinutes, card.windowEndMinutes)
      : formatUnlockTime(card.windowStartMinutes)
  const showSchedule = !hideSchedule && !gameStarBack
  const starLostVisual =
    !!starDeadlineLost &&
    gameStarBack &&
    card.status !== 'completed' &&
    !devGamePlayable

  return (
    <button
      type="button"
      className={`deck-card is-back${canConfirm ? ' is-current' : ''}${special ? ' is-special' : ''}${gameStarBack ? ' is-day-challenge' : ''}${hideSchedule ? ' deck-card--star-row' : ''}${starLostVisual ? ' is-lost' : ''}${hidden ? ' is-launching' : ''}`}
      role="listitem"
      data-challenge-id={card.challengeId}
      aria-label={
        starLostVisual
          ? `${card.title} — Carta Perdida. Toque para ver detalhes`
          : showSchedule
            ? `Abrir ${card.title} · ${timeLabel}`
            : `Abrir ${card.title}`
      }
      onClick={(e) =>
        starLostVisual
          ? onOpenReview('lost', e.currentTarget)
          : onOpen(e.currentTarget)
      }
    >
      <div className="deck-card-shell">
        <div className="deck-card-back">
          <div className="deck-back-pattern" />
          {gameStarBack ? (
            <DayChallengeBackArt />
          ) : (
            <span className="deck-back-logo" aria-hidden>
              <img src="/card-seal.webp" alt="" />
            </span>
          )}
          <span
            className={`deck-back-label${canConfirm ? ' is-live' : ''}${special && !dayChallenge && !skillChallenge ? ' is-special-label' : ''}${dayChallenge || skillChallenge ? ' is-day-challenge-label' : ''}`}
          >
            {dayChallenge
              ? 'Desafio do dia'
              : entertainmentChallenge
                ? 'Moedas extras'
                : special
                  ? 'Carta especial'
                  : card.title}
          </span>
          {hideSchedule && gameStarBack && starCountdownLabel ? (
            <span className="deck-star-limit-block">
              <span className="deck-star-limit-label">Tempo Limite</span>
              <span
                className={`deck-star-countdown${starCountdownUrgent ? ' is-urgent' : ''}`}
                aria-live="polite"
              >
                {starCountdownLabel}
              </span>
            </span>
          ) : null}
          {showSchedule ? (
            <span className="deck-live-title deck-live-time">{timeLabel}</span>
          ) : null}
          {canConfirm ? <span className="deck-current-pulse" aria-hidden /> : null}
        </div>
        {starLostVisual ? (
          <>
            <div className="deck-result-overlay deck-lost-overlay" aria-hidden />
            <div className="deck-banner deck-banner-diagonal deck-banner-lost">
              <span>Carta Perdida</span>
            </div>
          </>
        ) : null}
      </div>
    </button>
  )
}

function CardModal({
  card,
  index,
  origin,
  remainLabel,
  progress,
  urgent,
  preview,
  error,
  busy,
  locked,
  workoutTiming,
  clockDate,
  onExited,
  onCapture,
  onRetake,
  onSubmit,
  onConfirm,
}: {
  card: DayCard
  index: number
  origin: CardOrigin
  remainLabel: string
  progress: number
  urgent: boolean
  preview: string | null
  error: string
  busy: boolean
  locked: boolean
  workoutTiming: WorkoutTiming | null
  clockDate: Date
  onExited: () => void
  onCapture: (dataUrl: string, capturedAt: number) => void
  onRetake: () => void
  onSubmit: () => void
  onConfirm: () => void
}) {
  const isConfirm = card.proofMode === 'confirm'
  const confirmLabel = card.confirmLabel || 'Confirmar'
  const anticipate = workoutTiming === 'before'
  const late = workoutTiming === 'past'
  const timingBanner = anticipate
    ? 'Antecipar treino?'
    : late
      ? 'Treino em atraso'
      : null
  const timingHint = anticipate
    ? 'Você está antes da janela da rotina. Pode concluir agora sem penalidade.'
    : late
      ? `Fora da janela: você ganha ${formatCoins(card.coins)} moedas e depois perde ${formatCoins(WORKOUT_LATE_PENALTY)} pelo atraso.`
      : null
  const submitLabel = anticipate
    ? preview
      ? 'Sim, antecipar treino'
      : 'Tire a foto para antecipar'
    : late
      ? preview
        ? 'Concluir com atraso'
        : 'Tire a foto para concluir'
      : preview
        ? 'Concluir carta'
        : 'Tire a foto para concluir'

  return (
    <ExpandFlipShell
      origin={origin}
      label={card.title}
      busy={busy}
      frontClassName={`${urgent ? 'is-urgent' : ''} ${locked ? 'is-locked-view' : ''} ${late ? 'is-late-view' : ''}`.trim()}
      onExited={onExited}
    >
      {(requestClose) => (
        <>
          <div className="deck-modal-glow" aria-hidden />
          {locked ? (
            <div className="deck-banner deck-banner-diagonal deck-banner-blocked" aria-hidden>
              <span>Carta bloqueada aguarde o horário de desbloqueio</span>
            </div>
          ) : null}
          {timingBanner ? (
            <div
              className={`deck-banner deck-banner-diagonal ${late ? 'deck-banner-late' : 'deck-banner-early'}`}
              aria-hidden
            >
              <span>{timingBanner}</span>
            </div>
          ) : null}

          <header className="deck-modal-head">
            <div>
              <p className="eyebrow">
                {bandLabel[card.band]} · Carta {String(index + 1).padStart(2, '0')} · {card.kind}
                {locked ? ' · fora da janela' : ''}
                {anticipate ? ' · antecipação' : ''}
                {late ? ' · atraso' : ''}
              </p>
              <h2 className="display h2 deck-modal-title">{card.title}</h2>
            </div>
            <button type="button" className="deck-modal-close" onClick={requestClose} disabled={busy}>
              ✕
            </button>
          </header>

          <div className="deck-modal-scroll">
            <p className="deck-modal-desc muted">{card.description}</p>
            {timingHint ? (
              <p className={`workout-timing-msg ${late ? 'is-late' : 'is-early'}`}>{timingHint}</p>
            ) : null}

            <div className="deck-modal-meta">
              <div className="day-card-coins">
                <CoinIcon />
                <strong>{formatCoins(card.coins)}</strong>
                <span>moedinhas</span>
              </div>
              <div className="day-timer">
                <div className="row-between" style={{ marginBottom: '0.3rem' }}>
                  <span className="muted" style={{ fontSize: '0.75rem' }}>
                    Janela {formatWindowRange(card.windowStartMinutes, card.windowEndMinutes)}
                  </span>
                  <strong className={urgent || late ? 'timer-urgent' : undefined}>
                    {locked ? 'Aguardando' : remainLabel}
                  </strong>
                </div>
                {!locked && workoutTiming !== 'past' ? (
                  <div className="progress-track">
                    <div
                      className={`progress-fill${urgent ? ' urgent' : ''}`}
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                ) : null}
                <p className="muted" style={{ margin: '0.3rem 0 0', fontSize: '0.7rem' }}>
                  {locked
                    ? `Confirme só entre ${formatWindowRange(card.windowStartMinutes, card.windowEndMinutes)}`
                    : isMainWorkoutCard(card)
                      ? anticipate
                        ? 'Antecipação liberada · sem penalidade de moedas'
                        : late
                          ? `+${formatCoins(card.coins)} agora · depois −${formatCoins(WORKOUT_LATE_PENALTY)} pelo atraso`
                          : 'Dentro da janela da rotina'
                      : card.windowKind === 'interval'
                        ? 'Só nesta janela da rotina · fora = Carta Perdida'
                        : `${POINT_TOLERANCE_MIN} min de tolerância · fora = Carta Perdida`}
                </p>
              </div>
            </div>

            <p className="proof-hint">{card.proofHint}</p>

            <div className="deck-modal-main">
              {locked ? (
                <div className="deck-locked-confirm">
                  <div>
                    <strong>Aguardando horário</strong>
                    <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                      Você pode ler a missão agora.{' '}
                      {isConfirm
                        ? `O botão “${confirmLabel}” libera na janela `
                        : 'Tirar a foto e concluir só libera na janela '}
                      {formatWindowRange(card.windowStartMinutes, card.windowEndMinutes)}.
                    </p>
                  </div>
                </div>
              ) : isConfirm ? (
                <div className="deck-confirm-only">
                  <strong>
                    {anticipate ? 'Antecipar treino?' : late ? 'Treino em atraso' : confirmLabel}
                  </strong>
                  <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    {timingHint ||
                      'Esta missão não usa câmera. Confirme no horário certo para ganhar as moedinhas.'}
                  </p>
                </div>
              ) : (
                <SimCamera
                  scene={resolveSimScene(card)}
                  clockDate={clockDate}
                  disabled={busy}
                  preview={preview}
                  onCapture={onCapture}
                  onRetake={onRetake}
                />
              )}
            </div>
          </div>

          <footer className="deck-modal-actions">
            {error ? <p className="form-error">{error}</p> : null}
            {busy ? (
              <div className="ai-result analyzing">
                <span className="ai-spinner" />
                Verificando…
              </div>
            ) : null}
            {!locked ? (
              isConfirm ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={busy}
                  onClick={onConfirm}
                >
                  {anticipate ? 'Sim, antecipar treino' : late ? 'Concluir com atraso' : confirmLabel}
                </button>
              ) : (
                <button
                  type="button"
                  className={`btn btn-primary btn-block${!preview ? ' is-awaiting-photo' : ''}`}
                  disabled={!preview || busy}
                  aria-disabled={!preview || busy}
                  onClick={onSubmit}
                >
                  {busy ? 'Verificando…' : submitLabel}
                </button>
              )
            ) : (
              <button type="button" className="btn btn-ghost btn-block" onClick={requestClose}>
                Fechar
              </button>
            )}
          </footer>
        </>
      )}
    </ExpandFlipShell>
  )
}

function ReviewCardModal({
  card,
  index,
  kind,
  origin,
  onExited,
}: {
  card: DayCard
  index: number
  kind: 'lost' | 'done'
  origin: CardOrigin
  onExited: () => void
}) {
  const isDone = kind === 'done'
  return (
    <ExpandFlipShell
      origin={origin}
      label={`${card.title} — ${isDone ? 'concluída' : 'perdida'}`}
      frontClassName={isDone ? 'deck-modal-front-done' : 'deck-modal-front-lost'}
      onExited={onExited}
    >
      {(requestClose) => (
        <>
          <div className={`deck-modal-glow ${isDone ? 'done-glow' : 'lost-glow'}`} aria-hidden />
          <header className="deck-modal-head">
            <div>
              <p className="eyebrow">
                {bandLabel[card.band]} · Carta {String(index + 1).padStart(2, '0')} · {card.kind}
              </p>
              <h2 className="display h2 deck-modal-title">{card.title}</h2>
            </div>
            <button type="button" className="deck-modal-close" onClick={requestClose}>
              ✕
            </button>
          </header>

          <div className="deck-modal-scroll">
            <div className={`result-status-pill ${isDone ? 'is-done' : 'is-lost'}`}>
              {isDone ? 'Carta Concluída' : 'Carta Perdida'}
            </div>
            <p className="deck-modal-desc muted">{card.description}</p>

            <div className="deck-modal-meta">
              <div className={`day-card-coins${isDone ? '' : ' day-card-coins-lost'}`}>
                <CoinIcon />
                <strong>
                  {formatCoins(isDone ? card.coinsAwarded || card.coins : 0)}
                </strong>
                <span>{isDone ? 'ganhas' : 'perdidas'}</span>
              </div>
              <div className="day-timer">
                <div className="row-between" style={{ marginBottom: '0.3rem' }}>
                  <span className="muted" style={{ fontSize: '0.75rem' }}>Janela</span>
                  <strong>
                    {formatWindowRange(card.windowStartMinutes, card.windowEndMinutes)}
                  </strong>
                </div>
                <p className="muted" style={{ margin: 0, fontSize: '0.78rem' }}>
                  {isDone
                    ? `Desafio validado. +${formatCoins(card.coinsAwarded || card.coins)} moedinhas creditadas.`
                    : `O prazo acabou. As ${formatCoins(card.coins)} moedinhas deste desafio foram perdidas.`}
                </p>
              </div>
            </div>

            <p className="proof-hint">
              {isDone ? 'Comprovante:' : 'Comprovante esperado:'} {card.proofHint}
            </p>

            <div className="deck-modal-main">
              {card.photoDataUrl ? (
                <img className="proof-preview deck-modal-photo" src={card.photoDataUrl} alt="Comprovante enviado" />
              ) : (
                <div className={`ai-result ${isDone ? 'ok' : 'bad'} deck-modal-status-card`}>
                  <div>
                    <strong>{isDone ? 'Registro' : 'Sem comprovação'}</strong>
                    <p style={{ margin: '0.35rem 0 0' }}>
                      {card.aiMessage ||
                        (isDone
                          ? 'Desafio concluído sem foto anexada.'
                          : 'Nenhuma foto foi validada a tempo para este desafio.')}
                    </p>
                  </div>
                </div>
              )}
              {card.photoDataUrl && card.aiMessage ? (
                <div className={`ai-result ${isDone ? 'ok' : 'bad'}`}>
                  <strong>Registro</strong>
                  <p style={{ margin: 0 }}>{card.aiMessage}</p>
                </div>
              ) : null}
            </div>
          </div>

          <footer className="deck-modal-actions">
            <button type="button" className="btn btn-ghost btn-block" onClick={requestClose}>
              Fechar
            </button>
          </footer>
        </>
      )}
    </ExpandFlipShell>
  )
}
