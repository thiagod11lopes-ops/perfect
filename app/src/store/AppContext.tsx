import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import { Week1RestartScheduler } from '../components/Week1RestartScheduler'
import {
  type DailyChallenge,
  getWindowPhase,
  isMainWorkoutCard,
  resolveChallengeDateKey,
  windowEndDeadlineMs,
} from '../data/dailyChallenges'
import {
  COIN_ECONOMY_SCALE_FROM_V1,
  COIN_ECONOMY_VERSION,
  roundCoinsNearest10,
} from '../data/coinEconomy'
import {
  applyDevRoutineOutcomes,
  devWalletRoutineGreensFromQueues,
} from '../data/devRoutineOutcomes'
import { gameIdFromChallengeId, isGameCard } from '../data/dayGames'
import {
  exampleWeeklyRoutine,
  emptyWeeklyRoutine,
  migrateWeeklyRoutine,
  nowMinutes,
  sleepForChallengeDateKey,
} from '../data/routine'
import type {
  AppState,
  DayCard,
  DayLog,
  DayQueue,
  LoadUnit,
  MealKey,
  Profile,
  WeeklyRoutine,
  WorkoutLoadEntry,
} from '../data/types'
import {
  WATER_MISSION_BONUS_COINS,
  crossedWaterMissionGoal,
  parseWeightKg,
  waterMlFromQueue,
  waterMissionGoalMl,
} from '../data/waterMission'
import {
  addDays,
  devSimulatedChallengeDateKey,
  normalizeClockTimeWithSeconds,
  resolveAppDate,
  resolveAppMinutes,
  toISODate,
} from '../utils/dates'

export const STORAGE_KEY = 'zero-ao-topo-mvp-v1'

const emptyProfile: Profile = {
  name: '',
  birthDate: '',
  age: '',
  sex: '',
  weight: '',
  height: '',
  goalKg: '',
  health: '',
  meds: '',
  allergies: '',
}

const devProfile: Profile = {
  name: 'Ana Desenvolvedora',
  birthDate: '1994-08-22',
  age: '31',
  sex: 'F',
  weight: '72',
  height: '168',
  goalKg: '5',
  health: 'Nenhum',
  meds: 'Não',
  allergies: 'Nenhuma',
}

const initialState: AppState = {
  onboardingComplete: false,
  acceptedRules: false,
  startDate: toISODate(new Date()),
  profile: emptyProfile,
  routine: emptyWeeklyRoutine(),
  weightFinal: '',
  coins: 0,
  coinEconomyVersion: COIN_ECONOMY_VERSION,
  devMode: false,
  devDay: 1,
  devTime: '08:00:00',
  devClockAnchoredAt: Date.now(),
  devClockPaused: false,
  devGameCardReplayEpoch: 0,
  devNeonophisGridW: 12,
  devNeonophisGridH: 20,
  devNeonophisCellPx: 16,
  dayQueues: {},
  starCardsRevealed: {},
  devDayQueueSealed: {},
  daily: {},
  shopping: {},
  photoNotes: {},
  workoutLoads: {},
  pendingWeek1RestartAfterDateKey: null,
}

function emptyDay(): DayLog {
  return {
    meals: {},
    workoutDone: false,
    waterMl: 0,
    missionChecks: [],
  }
}

function toDayCard(c: DailyChallenge): DayCard {
  const unlockMinutes = c.unlockMinutes ?? c.unlockHour * 60
  const windowStartMinutes = c.windowStartMinutes ?? unlockMinutes
  const windowEndMinutes = c.windowEndMinutes ?? unlockMinutes
  const windowKind = c.windowKind ?? (c.flexible ? 'interval' : 'tolerance')
  return {
    challengeId: c.id,
    title: c.title,
    description: c.description,
    proofHint: c.proofHint,
    kind: c.kind,
    band: c.band,
    unlockHour: c.unlockHour,
    unlockMinutes: windowStartMinutes,
    windowStartMinutes,
    windowEndMinutes,
    windowKind,
    flexible: windowKind === 'interval',
    proofMode:
      c.proofMode === 'confirm' ? 'confirm' : c.proofMode === 'game' ? 'game' : 'photo',
    confirmLabel: c.confirmLabel,
    coins: c.coins,
    durationMin: c.durationMin,
    waterMl: c.waterMl,
    status: 'locked',
    deadlineAt: null,
    coinsAwarded: 0,
  }
}

function activateCard(card: DayCard, dateKey: string): DayCard {
  return {
    ...card,
    status: 'active',
    deadlineAt: windowEndDeadlineMs(dateKey, card.windowStartMinutes, card.windowEndMinutes),
  }
}

function expireCard(card: DayCard): DayCard {
  return {
    ...card,
    status: 'expired',
    coinsAwarded: 0,
    aiMessage: 'Fora da janela de horário — moedinhas perdidas.',
    deadlineAt: null,
  }
}

function lockCard(card: DayCard): DayCard {
  return {
    ...card,
    status: 'locked',
    deadlineAt: null,
    aiMessage: undefined,
    photoDataUrl: undefined,
    coinsAwarded: 0,
    ...(isGameCard(card)
      ? { gameSettleNet: undefined as number | undefined, gamePlayEpoch: undefined as number | undefined }
      : {}),
  }
}

type WindowStateOpts = {
  devMode?: boolean
  devGameCardReplayEpoch?: number
}

function windowStateOpts(state: AppState): WindowStateOpts {
  return {
    devMode: state.devMode,
    devGameCardReplayEpoch: state.devGameCardReplayEpoch,
  }
}

function applyWindowState(
  card: DayCard,
  dateKey: string,
  _minutes: number,
  nowMs: number = Date.now(),
  opts?: WindowStateOpts,
): DayCard {
  // Fase com data absoluta — overnight (23h–6h) não marca o dia inteiro como passado
  const phase = getWindowPhase(
    dateKey,
    card.windowStartMinutes,
    card.windowEndMinutes,
    nowMs,
  )
  const before = phase === 'before'
  const inWindow = phase === 'in'
  const past = phase === 'past'

  const windowDeadline = windowEndDeadlineMs(
    dateKey,
    card.windowStartMinutes,
    card.windowEndMinutes,
  )

  // Cartas-estrela (desafio + moedas extras): sem fila por horário, sempre jogáveis.
  if (isGameCard(card)) {
    if (card.status === 'completed') {
      if (opts?.devMode) {
        const epoch = opts.devGameCardReplayEpoch ?? 0
        const playEpoch = card.gamePlayEpoch ?? 0
        if (playEpoch < epoch) {
          return { ...activateCard(lockCard(card), dateKey), deadlineAt: null }
        }
      }
      return card
    }
    if (card.status === 'expired') {
      return { ...activateCard(lockCard(card), dateKey), deadlineAt: null }
    }
    if (card.status === 'analyzing') return card
    if (card.status === 'active') {
      if (card.deadlineAt == null) return card
      return { ...card, deadlineAt: null }
    }
    return { ...activateCard(card, dateKey), deadlineAt: null }
  }

  // Treino principal: antecipar ou atrasar ainda permite concluir (não vira Carta Perdida).
  if (isMainWorkoutCard(card)) {
    // Concluída (incl. antecipação) permanece estável — tarja verde e moedas.
    if (card.status === 'completed') return card
    // Não interrompe análise em andamento (foto / verificação).
    if (card.status === 'analyzing') return card
    if (before) {
      if (card.status === 'locked' && card.deadlineAt == null) return card
      return lockCard(card)
    }
    // Na janela ou em atraso: permanece ativa para concluir (+ penalidade só no atraso).
    if (card.status === 'active') {
      const nextDeadline = past ? null : windowDeadline
      if (card.deadlineAt === nextDeadline) return card
      return { ...card, deadlineAt: nextDeadline }
    }
    return {
      ...activateCard(card, dateKey),
      deadlineAt: past ? null : windowDeadline,
    }
  }

  // Concluída: estável; carta de jogo no DEV pode voltar a jogar após mudar o relógio.
  if (card.status === 'completed') {
    if (isGameCard(card) && opts?.devMode) {
      if (before) return card
      const epoch = opts.devGameCardReplayEpoch ?? 0
      const playEpoch = card.gamePlayEpoch ?? 0
      if (playEpoch < epoch) {
        const cleared = lockCard(card)
        if (inWindow) return activateCard(cleared, dateKey)
        return cleared
      }
      return card
    }
    // Rotina no DEV (ex.: sorteio “cartas concluídas”): tarja verde fixa até mudar o dia.
    if (opts?.devMode) return card
    if (before) return lockCard(card)
    return card
  }

  // Perdida: estável no passado / no minuto final pós-timer.
  // Se o relógio voltar para dentro da janela (ainda com tempo), reativa (verde).
  if (card.status === 'expired') {
    // Rotina no DEV: tarja vermelha fixa (não reativa ao ajustar horário).
    if (opts?.devMode) return card
    if (before) return lockCard(card)
    if (inWindow && nowMs < windowDeadline) return activateCard(card, dateKey)
    return card
  }

  // Timer zerou (deadlineAt) ou janela já passou → Carta Perdida
  const deadlinePassed =
    (card.status === 'active' || card.status === 'analyzing') &&
    card.deadlineAt != null &&
    nowMs >= card.deadlineAt
  if (deadlinePassed || past) {
    return expireCard(card)
  }

  if (inWindow) {
    if (card.status === 'active' || card.status === 'analyzing') {
      if (card.deadlineAt === windowDeadline) return card
      return { ...card, deadlineAt: windowDeadline }
    }
    // locked (ou outro) dentro da janela → ativa
    return activateCard(card, dateKey)
  }

  if (before) {
    // DEV madrugada (ex. 05:00): rotinas futuras ficam no verso inicial, sem “cadeado”.
    if (opts?.devMode && !isGameCard(card)) {
      if (
        card.status === 'locked' &&
        card.deadlineAt == null &&
        !card.aiMessage &&
        !card.photoDataUrl
      ) {
        return card
      }
      return lockCard(card)
    }
    if (card.status === 'locked' && card.deadlineAt == null && !card.aiMessage && !card.photoDataUrl) {
      return card
    }
    return lockCard(card)
  }

  if (card.status === 'locked' && card.deadlineAt == null && !card.aiMessage && !card.photoDataUrl) {
    return card
  }
  return lockCard(card)
}

function mergePreservedCard(base: DayCard, prev: DayCard | undefined): DayCard {
  if (!prev) return base
  if (isGameCard(base)) {
    if (prev.status === 'completed') {
      return {
        ...base,
        status: 'completed',
        photoDataUrl: prev.photoDataUrl,
        aiMessage: prev.aiMessage,
        coinsAwarded: prev.coinsAwarded,
        deadlineAt: null,
        gameSettleNet: prev.gameSettleNet,
        gamePlayEpoch: prev.gamePlayEpoch,
      }
    }
    if (prev.status === 'expired') {
      return {
        ...base,
        status: 'expired',
        photoDataUrl: prev.photoDataUrl,
        aiMessage: prev.aiMessage,
        coinsAwarded: prev.coinsAwarded,
        deadlineAt: prev.deadlineAt,
        gameSettleNet: prev.gameSettleNet,
        gamePlayEpoch: prev.gamePlayEpoch,
      }
    }
    if (
      prev.status === 'active' ||
      prev.status === 'analyzing' ||
      prev.status === 'locked'
    ) {
      return {
        ...base,
        status: prev.status,
        photoDataUrl: prev.photoDataUrl,
        aiMessage: prev.aiMessage,
        coinsAwarded: prev.coinsAwarded,
        deadlineAt: prev.deadlineAt,
        gameSettleNet: prev.gameSettleNet,
        gamePlayEpoch: prev.gamePlayEpoch,
      }
    }
    return base
  }
  if (prev.status === 'completed') {
    return {
      ...base,
      status: 'completed',
      photoDataUrl: prev.photoDataUrl,
      aiMessage: prev.aiMessage,
      coinsAwarded: prev.coinsAwarded,
      deadlineAt: null,
    }
  }
  if (prev.status === 'expired' || prev.status === 'active' || prev.status === 'locked') {
    return {
      ...base,
      status: prev.status,
      photoDataUrl: prev.photoDataUrl,
      aiMessage: prev.aiMessage,
      coinsAwarded: prev.coinsAwarded,
      deadlineAt: prev.deadlineAt,
    }
  }
  if (prev.status === 'analyzing') {
    return {
      ...base,
      status: 'active',
      photoDataUrl: undefined,
      aiMessage: undefined,
      coinsAwarded: 0,
      deadlineAt: prev.deadlineAt,
    }
  }
  return base
}

function sortCardsBySchedule(cards: DayCard[]): DayCard[] {
  return [...cards].sort((a, b) => {
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
}

function buildQueue(
  dateKey: string,
  challenges: DailyChallenge[],
  minutes: number,
  previous?: DayCard[],
  nowMs: number = Date.now(),
  opts?: WindowStateOpts,
): DayQueue {
  const prevMap = new Map((previous ?? []).map((c) => [c.challengeId, c]))
  const cards = sortCardsBySchedule(
    challenges.map((c) => {
      const merged = mergePreservedCard(toDayCard(c), prevMap.get(c.id))
      return applyWindowState(merged, dateKey, minutes, nowMs, opts)
    }),
  )
  return { dateKey, cards }
}

function syncUnlocks(
  queue: DayQueue,
  minutes: number,
  nowMs: number = Date.now(),
  opts?: WindowStateOpts,
): DayQueue {
  const cards = sortCardsBySchedule(
    queue.cards.map((card) => applyWindowState(card, queue.dateKey, minutes, nowMs, opts)),
  )
  return { ...queue, cards }
}

function expireOverdue(
  queue: DayQueue,
  minutes: number,
  nowMs: number = Date.now(),
  opts?: WindowStateOpts,
): DayQueue {
  const cards = sortCardsBySchedule(
    queue.cards.map((card) => applyWindowState(card, queue.dateKey, minutes, nowMs, opts)),
  )
  return { ...queue, cards }
}

function appNowMs(state: AppState) {
  return resolveAppDate(state).getTime()
}

function sealDevDayQueue(
  sealed: Record<string, boolean>,
  dateKey: string,
): Record<string, boolean> {
  if (sealed[dateKey]) return sealed
  return { ...sealed, [dateKey]: true }
}

/** DEV: ao avançar o dia, solta baralho não “selado” para abrir cartas novas às 05:00. */
function openFreshDevDayQueues(
  state: AppState,
  fromDay: number,
  toDay: number,
): Pick<AppState, 'dayQueues' | 'starCardsRevealed'> {
  if (!state.devMode || toDay <= fromDay) {
    return { dayQueues: state.dayQueues, starCardsRevealed: state.starCardsRevealed }
  }
  const dateKey = devSimulatedChallengeDateKey(state.startDate, toDay)
  if (state.devDayQueueSealed[dateKey]) {
    return { dayQueues: state.dayQueues, starCardsRevealed: state.starCardsRevealed }
  }
  const dayQueues = { ...state.dayQueues }
  const starCardsRevealed = { ...state.starCardsRevealed }
  delete dayQueues[dateKey]
  delete starCardsRevealed[dateKey]
  return { dayQueues, starCardsRevealed }
}

function effectiveQueueDateKey(state: AppState): string {
  if (state.devMode) {
    return devSimulatedChallengeDateKey(state.startDate, state.devDay)
  }
  const now = resolveAppDate(state)
  return resolveChallengeDateKey(
    now,
    sleepForChallengeDateKey(state.routine, now),
    state.startDate,
  )
}

/** Modo DEV: reinicia só cartas de jogo no baralho indicado (roleta jogável de novo). */
function resetGameCardsInQueues(
  state: AppState,
  dateKeys: string[],
): Record<string, DayQueue> {
  const minutes = resolveAppMinutes(state)
  const nowMs = resolveAppDate(state).getTime()
  let dayQueues = state.dayQueues
  for (const dateKey of dateKeys) {
    const queue = dayQueues[dateKey]
    if (!queue) continue
    let touched = false
    const cards = queue.cards.map((card) => {
      if (!isGameCard(card)) return card
      touched = true
      const fresh: DayCard = {
        ...card,
        status: 'locked',
        photoDataUrl: undefined,
        aiMessage: undefined,
        coinsAwarded: 0,
        deadlineAt: null,
        gameSettleNet: undefined,
        gamePlayEpoch: state.devGameCardReplayEpoch,
      }
      return applyWindowState(fresh, dateKey, minutes, nowMs, windowStateOpts(state))
    })
    if (touched) {
      dayQueues = {
        ...dayQueues,
        [dateKey]: { ...queue, cards: sortCardsBySchedule(cards) },
      }
    }
  }
  return dayQueues
}

/** Ajusta saldo quando uma carta concluída é reiniciada (relógio voltou). */
function coinsDeltaAfterSync(prev: DayCard[] | undefined, next: DayCard[]): number {
  if (!prev?.length) return 0
  let delta = 0
  for (const old of prev) {
    if (old.status !== 'completed') continue
    const neu = next.find((c) => c.challengeId === old.challengeId)
    if (!neu || neu.status !== 'completed') {
      if (isGameCard(old)) {
        const credit = old.gameSettleNet ?? 0
        if (credit <= 0) continue
        delta -= credit
      } else {
        delta -= old.coinsAwarded || 0
      }
    }
  }
  return delta
}

function clockMinutes(state: AppState) {
  return resolveAppMinutes(state)
}

type Action =
  | { type: 'RESET' }
  | { type: 'COMPLETE_ONBOARDING'; profile: Profile; routine: WeeklyRoutine; startDate: string }
  | { type: 'PATCH_PROFILE'; patch: Partial<Profile> }
  | { type: 'SET_ROUTINE'; routine: WeeklyRoutine }
  | { type: 'TOGGLE_MEAL'; date: string; meal: MealKey }
  | { type: 'TOGGLE_WORKOUT'; date: string }
  | { type: 'SET_WATER'; date: string; ml: number }
  | { type: 'ADD_WATER'; date: string; ml: number }
  | { type: 'TOGGLE_MISSION'; date: string; index: number; total: number }
  | { type: 'TOGGLE_SHOP'; week: number; id: string }
  | { type: 'SET_WEIGHT_FINAL'; value: string }
  | { type: 'SET_PHOTO_NOTE'; key: string; note: string }
  | { type: 'SET_WORKOUT_LOAD'; key: string; value: string; unit: LoadUnit }
  | { type: 'ENSURE_DAY_QUEUE'; dateKey: string; challenges: DailyChallenge[]; minutes: number }
  | { type: 'SYNC_DAY_UNLOCKS'; dateKey: string; minutes: number }
  | { type: 'EXPIRE_OVERDUE_CARDS'; dateKey: string; minutes?: number }
  | { type: 'START_CARD_ANALYSIS'; dateKey: string; challengeId: string; photoDataUrl: string }
  | {
      type: 'FINISH_CARD_SUCCESS'
      dateKey: string
      challengeId: string
      photoDataUrl: string
      aiMessage: string
      coinsAwarded?: number
    }
  | { type: 'FINISH_CARD_REJECT'; dateKey: string; challengeId: string; aiMessage: string }
  | {
      type: 'APPLY_COIN_PENALTY'
      amount: number
      dateKey?: string
      challengeId?: string
      reason?: string
    }
  | { type: 'ADD_COINS'; amount: number }
  | { type: 'DEDUCT_COINS'; amount: number }
  | { type: 'GAME_ROULETTE_SPIN_DELTA'; delta: number }
  | { type: 'START_GAME_ROULETTE_POT'; stake: number }
  | {
      type: 'FINISH_GAME_ROULETTE'
      dateKey: string
      challengeId: string
      aiMessage: string
      stake: number
      prizeTotal: number
      extraLoss: number
      potReturn: number
    }
  | { type: 'LOAD_DEMO' }
  | { type: 'LOAD_DEV_MODE'; day?: number; time?: string; coins?: number }
  | { type: 'SET_DEV_CLOCK'; day?: number; time?: string; pause?: boolean }
  | { type: 'SET_DEV_CLOCK_PAUSED'; paused: boolean; day?: number; time?: string }
  | { type: 'SET_DEV_COINS'; coins: number }
  | { type: 'DEV_RESTART_CHALLENGE' }
  | {
      type: 'DEV_SIMULATE_ROUTINE_OUTCOMES'
      dateKey: string
      completedCount: number
      challenges: DailyChallenge[]
      minutes: number
    }
  | { type: 'SET_DEV_NEONOPHIS_GRID'; gridW?: number; gridH?: number; cellPx?: number }
  | { type: 'DEV_PREPARE_GAME_CARD_REPLAY'; dateKey: string; challengeId: string }
  | { type: 'REVEAL_STAR_CARDS'; dateKey: string }
  | { type: 'EXIT_DEV_MODE' }
  | { type: 'SCHEDULE_WEEK1_RESTART'; anchorDateKey: string }
  | { type: 'APPLY_WEEK1_RESTART'; startDate: string }
  | { type: 'QUIT_PROGRAM' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'RESET':
      return { ...initialState, startDate: toISODate(new Date()) }
    case 'QUIT_PROGRAM':
      return { ...initialState, startDate: toISODate(new Date()) }
    case 'SCHEDULE_WEEK1_RESTART':
      return {
        ...state,
        pendingWeek1RestartAfterDateKey: action.anchorDateKey,
        coins: 0,
      }
    case 'APPLY_WEEK1_RESTART':
      return {
        ...state,
        pendingWeek1RestartAfterDateKey: null,
        startDate: action.startDate,
        coins: 0,
        dayQueues: {},
        starCardsRevealed: {},
        devDayQueueSealed: {},
        daily: {},
        shopping: {},
        photoNotes: {},
        workoutLoads: {},
        weightFinal: '',
        devGameCardReplayEpoch: state.devGameCardReplayEpoch + 1,
        ...(state.devMode
          ? {
              devDay: 1,
              devTime: '08:00:00',
              devClockAnchoredAt: Date.now(),
              devClockPaused: false,
            }
          : {}),
      }
    case 'PATCH_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.patch } }
    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        onboardingComplete: true,
        acceptedRules: true,
        profile: action.profile,
        routine: action.routine,
        startDate: action.startDate,
        dayQueues: {},
        devMode: false,
        devDay: 1,
        devTime: '08:00:00',
        devClockAnchoredAt: Date.now(),
        devClockPaused: false,
      }
    case 'SET_ROUTINE':
      return { ...state, routine: action.routine, dayQueues: {} }
    case 'TOGGLE_MEAL': {
      const day = state.daily[action.date] ?? emptyDay()
      return {
        ...state,
        daily: {
          ...state.daily,
          [action.date]: {
            ...day,
            meals: { ...day.meals, [action.meal]: !day.meals[action.meal] },
          },
        },
      }
    }
    case 'TOGGLE_WORKOUT': {
      const day = state.daily[action.date] ?? emptyDay()
      return {
        ...state,
        daily: {
          ...state.daily,
          [action.date]: { ...day, workoutDone: !day.workoutDone },
        },
      }
    }
    case 'SET_WATER': {
      const day = state.daily[action.date] ?? emptyDay()
      return {
        ...state,
        daily: {
          ...state.daily,
          [action.date]: { ...day, waterMl: Math.max(0, action.ml) },
        },
      }
    }
    case 'ADD_WATER': {
      const day = state.daily[action.date] ?? emptyDay()
      return {
        ...state,
        daily: {
          ...state.daily,
          [action.date]: { ...day, waterMl: Math.max(0, day.waterMl + action.ml) },
        },
      }
    }
    case 'TOGGLE_MISSION': {
      const day = state.daily[action.date] ?? emptyDay()
      const checks = [...(day.missionChecks.length ? day.missionChecks : Array(action.total).fill(false))]
      while (checks.length < action.total) checks.push(false)
      checks[action.index] = !checks[action.index]
      return {
        ...state,
        daily: {
          ...state.daily,
          [action.date]: { ...day, missionChecks: checks },
        },
      }
    }
    case 'TOGGLE_SHOP': {
      const key = String(action.week)
      const weekMap = { ...(state.shopping[key] ?? {}) }
      weekMap[action.id] = !weekMap[action.id]
      return { ...state, shopping: { ...state.shopping, [key]: weekMap } }
    }
    case 'SET_WEIGHT_FINAL':
      return { ...state, weightFinal: action.value }
    case 'SET_PHOTO_NOTE':
      return {
        ...state,
        photoNotes: { ...state.photoNotes, [action.key]: action.note },
      }
    case 'SET_WORKOUT_LOAD': {
      const unit: LoadUnit = action.unit === 'placas' ? 'placas' : 'kg'
      const entry: WorkoutLoadEntry = { value: action.value, unit }
      return {
        ...state,
        workoutLoads: { ...state.workoutLoads, [action.key]: entry },
      }
    }
    case 'ENSURE_DAY_QUEUE': {
      const existing = state.dayQueues[action.dateKey]
      const nowMs = appNowMs(state)
      const nextIds = action.challenges
        .map(
          (c) =>
            `${c.id}:${c.windowStartMinutes}-${c.windowEndMinutes}:${c.windowKind}:${c.title}:${c.coins}:${c.description.slice(0, 48)}`,
        )
        .join('|')
      const prevIds =
        existing?.cards
          .map(
            (c) =>
              `${c.challengeId}:${c.windowStartMinutes}-${c.windowEndMinutes}:${c.windowKind}:${c.title}:${c.coins}:${c.description.slice(0, 48)}`,
          )
          .join('|') ?? ''
      const wOpts = windowStateOpts(state)
      if (existing && prevIds === nextIds) {
        const nextQueue = expireOverdue(
          syncUnlocks(existing, action.minutes, nowMs, wOpts),
          action.minutes,
          nowMs,
          wOpts,
        )
        const delta = coinsDeltaAfterSync(existing.cards, nextQueue.cards)
        return {
          ...state,
          coins: Math.max(0, state.coins + delta),
          dayQueues: {
            ...state.dayQueues,
            [action.dateKey]: nextQueue,
          },
        }
      }
      if (!action.challenges.length) {
        return {
          ...state,
          dayQueues: {
            ...state.dayQueues,
            [action.dateKey]: { dateKey: action.dateKey, cards: [] },
          },
        }
      }
      const rebuilt = expireOverdue(
        buildQueue(action.dateKey, action.challenges, action.minutes, existing?.cards, nowMs, wOpts),
        action.minutes,
        nowMs,
        wOpts,
      )
      const delta = coinsDeltaAfterSync(existing?.cards, rebuilt.cards)
      return {
        ...state,
        coins: Math.max(0, state.coins + delta),
        dayQueues: {
          ...state.dayQueues,
          [action.dateKey]: rebuilt,
        },
      }
    }
    case 'SYNC_DAY_UNLOCKS': {
      const queue = state.dayQueues[action.dateKey]
      if (!queue) return state
      const nowMs = appNowMs(state)
      const wOpts = windowStateOpts(state)
      const nextQueue = expireOverdue(
        syncUnlocks(queue, action.minutes, nowMs, wOpts),
        action.minutes,
        nowMs,
        wOpts,
      )
      const delta = coinsDeltaAfterSync(queue.cards, nextQueue.cards)
      return {
        ...state,
        coins: Math.max(0, state.coins + delta),
        dayQueues: {
          ...state.dayQueues,
          [action.dateKey]: nextQueue,
        },
      }
    }
    case 'EXPIRE_OVERDUE_CARDS': {
      const queue = state.dayQueues[action.dateKey]
      if (!queue) return state
      const minutes = action.minutes ?? clockMinutes(state)
      const nowMs = appNowMs(state)
      const wOpts = windowStateOpts(state)
      const nextQueue = expireOverdue(queue, minutes, nowMs, wOpts)
      const delta = coinsDeltaAfterSync(queue.cards, nextQueue.cards)
      return {
        ...state,
        coins: Math.max(0, state.coins + delta),
        dayQueues: {
          ...state.dayQueues,
          [action.dateKey]: nextQueue,
        },
      }
    }
    case 'START_CARD_ANALYSIS': {
      const queue = state.dayQueues[action.dateKey]
      if (!queue) return state
      const i = queue.cards.findIndex((c) => c.challengeId === action.challengeId)
      if (i < 0) return state
      const card = queue.cards[i]
      const canAnalyze =
        card.status === 'active' ||
        card.status === 'analyzing' ||
        (isMainWorkoutCard(card) && card.status === 'locked')
      if (!canAnalyze) return state
      const cards = queue.cards.map((c, idx) =>
        idx === i
          ? { ...c, status: 'analyzing' as const, photoDataUrl: action.photoDataUrl, aiMessage: 'Analisando…' }
          : c,
      )
      return {
        ...state,
        dayQueues: { ...state.dayQueues, [action.dateKey]: { ...queue, cards } },
      }
    }
    case 'FINISH_CARD_SUCCESS': {
      const queue = state.dayQueues[action.dateKey]
      if (!queue) return state
      const i = queue.cards.findIndex((c) => c.challengeId === action.challengeId)
      if (i < 0) return state
      const card = queue.cards[i]
      const gameId = gameIdFromChallengeId(card.challengeId)
      const isWorkoutVisionGame = isGameCard(card) && gameId === 'workout-vision'
      const isNeonophisGame = isGameCard(card) && gameId === 'neonophis'
      const isMemoryMatchGame = isGameCard(card) && gameId === 'memory-match'
      const isWordSearchGame = isGameCard(card) && gameId === 'word-search'
      const isQuizGame = isGameCard(card) && gameId === 'quiz'
      const canFinish =
        card.status === 'analyzing' ||
        card.status === 'active' ||
        (isMainWorkoutCard(card) && card.status === 'locked') ||
        (isWorkoutVisionGame &&
          card.status !== 'completed' &&
          card.status !== 'expired') ||
        (isNeonophisGame &&
          card.status !== 'completed' &&
          card.status !== 'expired') ||
        (isMemoryMatchGame &&
          card.status !== 'completed' &&
          card.status !== 'expired') ||
        (isWordSearchGame &&
          card.status !== 'completed' &&
          card.status !== 'expired') ||
        (isQuizGame && card.status !== 'completed' && card.status !== 'expired')
      if (!canFinish) return state
      const waterGain = card.waterMl ?? 0
      const fromWater = waterMlFromQueue(queue)
      const toWater = fromWater + waterGain
      const waterGoalMl = waterMissionGoalMl(parseWeightKg(state.profile.weight))
      const bonus =
        waterGain > 0 &&
        waterGoalMl != null &&
        crossedWaterMissionGoal(fromWater, toWater, waterGoalMl)
          ? WATER_MISSION_BONUS_COINS
          : 0
      const earned = roundCoinsNearest10(
        Math.max(0, action.coinsAwarded ?? card.coins) + bonus,
      )
      const cards = queue.cards.map((c, idx) =>
        idx === i
          ? {
              ...c,
              status: 'completed' as const,
              photoDataUrl: action.photoDataUrl,
              aiMessage:
                bonus > 0
                  ? `${action.aiMessage} · Missão 3,5 L! +${bonus} moedas extras.`
                  : action.aiMessage,
              coinsAwarded: earned,
              deadlineAt: null,
            }
          : c,
      )
      const day = state.daily[action.dateKey] ?? emptyDay()
      const dayChanged = waterGain > 0 || isMainWorkoutCard(card)
      const nextDay = {
        ...day,
        ...(waterGain > 0 ? { waterMl: Math.max(day.waterMl, toWater) } : {}),
        ...(isMainWorkoutCard(card) ? { workoutDone: true } : {}),
      }
      return {
        ...state,
        coins: state.coins + earned,
        dayQueues: { ...state.dayQueues, [action.dateKey]: { ...queue, cards } },
        daily: dayChanged
          ? { ...state.daily, [action.dateKey]: nextDay }
          : state.daily,
      }
    }
    case 'APPLY_COIN_PENALTY': {
      const amount = roundCoinsNearest10(Math.max(0, Math.floor(action.amount) || 0))
      if (amount <= 0) return state
      let dayQueues = state.dayQueues
      if (action.dateKey && action.challengeId) {
        const queue = state.dayQueues[action.dateKey]
        if (queue) {
          const cards = queue.cards.map((c) =>
            c.challengeId === action.challengeId
              ? {
                  ...c,
                  coinsAwarded: Math.max(0, (c.coinsAwarded || 0) - amount),
                  aiMessage: action.reason
                    ? `${c.aiMessage ? `${c.aiMessage} · ` : ''}${action.reason}`
                    : c.aiMessage,
                }
              : c,
          )
          dayQueues = { ...state.dayQueues, [action.dateKey]: { ...queue, cards } }
        }
      }
      return {
        ...state,
        coins: Math.max(0, state.coins - amount),
        dayQueues,
      }
    }
    case 'FINISH_CARD_REJECT': {
      const queue = state.dayQueues[action.dateKey]
      if (!queue) return state
      const i = queue.cards.findIndex((c) => c.challengeId === action.challengeId)
      if (i < 0) return state
      const card = queue.cards[i]
      if (card.status !== 'analyzing' && card.status !== 'active') return state
      const cards = queue.cards.map((c, idx) =>
        idx === i
          ? {
              ...c,
              status: 'active' as const,
              aiMessage: action.aiMessage || undefined,
              photoDataUrl: action.aiMessage ? c.photoDataUrl : undefined,
            }
          : c,
      )
      return {
        ...state,
        dayQueues: { ...state.dayQueues, [action.dateKey]: { ...queue, cards } },
      }
    }
    case 'LOAD_DEMO': {
      const start = new Date()
      start.setDate(start.getDate() - 3)
      const today = toISODate(new Date())
      const yesterday = toISODate(new Date(Date.now() - 86400000))
      return {
        onboardingComplete: true,
        acceptedRules: true,
        startDate: toISODate(start),
        profile: {
          name: 'Participante Demo',
          birthDate: '1992-05-14',
          age: '33',
          sex: 'F',
          weight: '78',
          height: '165',
          goalKg: '6',
          health: 'Nenhum',
          meds: 'Não',
          allergies: 'Nenhuma',
        },
        routine: exampleWeeklyRoutine(),
        weightFinal: '',
        coins: 0,
        coinEconomyVersion: COIN_ECONOMY_VERSION,
        devMode: false,
        devDay: 1,
        devTime: '08:00:00',
        devClockAnchoredAt: Date.now(),
        devClockPaused: false,
        devGameCardReplayEpoch: 0,
        devNeonophisGridW: 12,
        devNeonophisGridH: 20,
        devNeonophisCellPx: 16,
        dayQueues: {},
        starCardsRevealed: {},
        devDayQueueSealed: {},
        daily: {
          [yesterday]: {
            meals: { cafe: true, almoco: true, lanche: true, jantar: true },
            workoutDone: true,
            waterMl: 2500,
            missionChecks: [true, true, false],
          },
          [today]: {
            meals: { cafe: true, almoco: true },
            workoutDone: false,
            waterMl: 1200,
            missionChecks: [true, false, false],
          },
        },
        shopping: {},
        photoNotes: {
          [toISODate(start)]: 'Registro inicial — privado',
        },
        workoutLoads: {},
        pendingWeek1RestartAfterDateKey: null,
      }
    }
    case 'LOAD_DEV_MODE': {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const day = Math.min(28, Math.max(1, action.day ?? 1))
      const time = normalizeClockTimeWithSeconds(action.time ?? '08:00:00')
      const coins =
        typeof action.coins === 'number'
          ? Math.max(0, Math.floor(action.coins))
          : Math.max(0, (day - 1) * 180)
      const daily: Record<string, DayLog> = {}
      for (let i = 0; i < day - 1; i++) {
        const key = toISODate(addDays(start, i))
        daily[key] = {
          meals: { cafe: true, almoco: true, lanche: true, jantar: true },
          workoutDone: i % 7 !== 6,
          waterMl: 2500 + (i % 3) * 200,
          missionChecks: [true, true, i % 2 === 0],
        }
      }
      return {
        onboardingComplete: true,
        acceptedRules: true,
        startDate: toISODate(start),
        profile: devProfile,
        routine: exampleWeeklyRoutine(),
        weightFinal: '',
        coins,
        coinEconomyVersion: COIN_ECONOMY_VERSION,
        devMode: true,
        devDay: day,
        devTime: time,
        devClockAnchoredAt: Date.now(),
        devClockPaused: false,
        devGameCardReplayEpoch: 0,
        devNeonophisGridW: 12,
        devNeonophisGridH: 20,
        devNeonophisCellPx: 16,
        dayQueues: {},
        starCardsRevealed: {},
        devDayQueueSealed: {},
        daily,
        shopping: {
          '1': { 'w1-1': true, 'w1-2': true },
        },
        photoNotes: {
          [toISODate(start)]: 'Foto inicial — modo desenvolvimento',
        },
        workoutLoads: {},
        pendingWeek1RestartAfterDateKey: null,
      }
    }
    case 'SET_DEV_CLOCK': {
      if (!state.devMode) return state
      const nextDay =
        typeof action.day === 'number' ? Math.min(28, Math.max(1, action.day)) : state.devDay
      const dayChanged = nextDay !== state.devDay
      const rawTime = action.time ?? (dayChanged ? '05:00:00' : state.devTime)
      const nextTime = normalizeClockTimeWithSeconds(rawTime)
      const timeChanged = action.time !== undefined && nextTime !== state.devTime
      const shouldPause = Boolean(action.pause) || state.devClockPaused
      const devClockPaused = dayChanged ? true : shouldPause
      const devClockAnchoredAt =
        timeChanged || action.time !== undefined || action.day !== undefined
          ? Date.now()
          : state.devClockAnchoredAt
      const openedQueues = dayChanged
        ? openFreshDevDayQueues(state, state.devDay, nextDay)
        : { dayQueues: state.dayQueues, starCardsRevealed: state.starCardsRevealed }
      const interim: AppState = {
        ...state,
        ...openedQueues,
        devDay: nextDay,
        devTime: nextTime,
        devClockAnchoredAt,
      }
      const replayBump = dayChanged || timeChanged
      const nextReplayEpoch = replayBump
        ? state.devGameCardReplayEpoch + 1
        : state.devGameCardReplayEpoch
      const interimWithEpoch: AppState = {
        ...interim,
        devGameCardReplayEpoch: nextReplayEpoch,
      }
      const dateKey = effectiveQueueDateKey(interimWithEpoch)
      const prevQueue = interim.dayQueues[dateKey]
      const dayQueues = replayBump
        ? resetGameCardsInQueues(interimWithEpoch, [dateKey])
        : interim.dayQueues
      const nextQueue = dayQueues[dateKey]
      const coinsDelta =
        prevQueue && nextQueue
          ? coinsDeltaAfterSync(prevQueue.cards, nextQueue.cards)
          : 0
      return {
        ...state,
        devDay: nextDay,
        devTime: nextTime,
        devClockPaused,
        devClockAnchoredAt,
        devGameCardReplayEpoch: nextReplayEpoch,
        dayQueues,
        starCardsRevealed: interim.starCardsRevealed,
        coins: Math.max(0, state.coins + coinsDelta),
      }
    }
    case 'SET_DEV_CLOCK_PAUSED': {
      if (!state.devMode) return state
      const paused = Boolean(action.paused)
      if (paused === state.devClockPaused) return state
      if (paused) {
        const nextDay =
          typeof action.day === 'number' ? Math.min(28, Math.max(1, action.day)) : state.devDay
        const nextTime = normalizeClockTimeWithSeconds(action.time ?? state.devTime)
        return {
          ...state,
          devClockPaused: true,
          devDay: nextDay,
          devTime: nextTime,
          devClockAnchoredAt: Date.now(),
        }
      }
      return {
        ...state,
        devClockPaused: false,
        devClockAnchoredAt: Date.now(),
      }
    }
    case 'ADD_COINS': {
      const amount = roundCoinsNearest10(Math.max(0, Math.floor(action.amount) || 0))
      if (amount <= 0) return state
      return {
        ...state,
        coins: state.coins + amount,
      }
    }
    case 'DEDUCT_COINS': {
      const amount = roundCoinsNearest10(Math.max(0, Math.floor(action.amount) || 0))
      if (amount <= 0 || state.coins < amount) return state
      return {
        ...state,
        coins: state.coins - amount,
      }
    }
    case 'GAME_ROULETTE_SPIN_DELTA': {
      const delta = roundCoinsNearest10(Math.floor(action.delta) || 0)
      if (delta === 0) return state
      return {
        ...state,
        coins: Math.max(0, state.coins + delta),
      }
    }
    case 'START_GAME_ROULETTE_POT': {
      const stake = Math.max(0, Math.floor(action.stake) || 0)
      if (stake <= 0 || state.coins < stake) return state
      return {
        ...state,
        coins: state.coins - stake,
      }
    }
    case 'FINISH_GAME_ROULETTE': {
      const extraLoss = roundCoinsNearest10(Math.max(0, Math.floor(action.extraLoss) || 0))
      const potReturn = roundCoinsNearest10(Math.max(0, Math.floor(action.potReturn) || 0))
      const extraDebit = Math.min(state.coins, extraLoss)
      const walletCredit = potReturn - extraDebit
      const nextCoins = Math.max(0, state.coins + walletCredit)

      const queue = state.dayQueues[action.dateKey]
      if (!queue) {
        return { ...state, coins: nextCoins }
      }
      const i = queue.cards.findIndex((c) => c.challengeId === action.challengeId)
      if (i < 0) {
        return { ...state, coins: nextCoins }
      }
      const card = queue.cards[i]
      const canFinish =
        card.status === 'analyzing' ||
        card.status === 'active' ||
        (isMainWorkoutCard(card) && card.status === 'locked') ||
        (isGameCard(card) &&
          card.status !== 'completed' &&
          card.status !== 'expired')
      if (!canFinish) {
        return { ...state, coins: nextCoins }
      }
      const cards = queue.cards.map((c, idx) =>
        idx === i
          ? {
              ...c,
              status: 'completed' as const,
              aiMessage: action.aiMessage,
              coinsAwarded: potReturn,
              deadlineAt: null,
              gamePlayEpoch: state.devGameCardReplayEpoch,
              gameSettleNet: walletCredit,
            }
          : c,
      )
      return {
        ...state,
        coins: nextCoins,
        dayQueues: { ...state.dayQueues, [action.dateKey]: { ...queue, cards } },
      }
    }
    case 'SET_DEV_COINS': {
      if (!state.devMode) return state
      return {
        ...state,
        coins: Math.max(0, Math.floor(action.coins) || 0),
      }
    }
    case 'DEV_RESTART_CHALLENGE': {
      if (!state.devMode) return state
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return {
        ...state,
        startDate: toISODate(today),
        coins: 0,
        devDay: 1,
        devTime: '05:00:00',
        devClockAnchoredAt: Date.now(),
        devClockPaused: true,
        devGameCardReplayEpoch: state.devGameCardReplayEpoch + 1,
        dayQueues: {},
        starCardsRevealed: {},
        devDayQueueSealed: {},
        daily: {},
        shopping: {},
        workoutLoads: {},
        weightFinal: '',
        pendingWeek1RestartAfterDateKey: null,
      }
    }
    case 'DEV_SIMULATE_ROUTINE_OUTCOMES': {
      if (!state.devMode) return state
      const existing = state.dayQueues[action.dateKey]
      const nowMs = appNowMs(state)
      const wOpts = windowStateOpts(state)
      const nextIds = action.challenges
        .map(
          (c) =>
            `${c.id}:${c.windowStartMinutes}-${c.windowEndMinutes}:${c.windowKind}:${c.title}:${c.coins}:${c.description.slice(0, 48)}`,
        )
        .join('|')
      const prevIds =
        existing?.cards
          .map(
            (c) =>
              `${c.challengeId}:${c.windowStartMinutes}-${c.windowEndMinutes}:${c.windowKind}:${c.title}:${c.coins}:${c.description.slice(0, 48)}`,
          )
          .join('|') ?? ''

      let queue = existing
      if (!queue || prevIds !== nextIds) {
        if (!action.challenges.length) return state
        queue = expireOverdue(
          buildQueue(
            action.dateKey,
            action.challenges,
            action.minutes,
            existing?.cards,
            nowMs,
            wOpts,
          ),
          action.minutes,
          nowMs,
          wOpts,
        )
      } else {
        queue = expireOverdue(
          syncUnlocks(queue, action.minutes, nowMs, wOpts),
          action.minutes,
          nowMs,
          wOpts,
        )
      }

      const outcome = applyDevRoutineOutcomes(queue, action.completedCount)
      const nextCoins = devWalletRoutineGreensFromQueues(
        state.dayQueues,
        state.devDayQueueSealed,
        action.dateKey,
        outcome.completedSum,
      )

      return {
        ...state,
        coins: nextCoins,
        dayQueues: {
          ...state.dayQueues,
          [action.dateKey]: { ...queue, cards: outcome.cards },
        },
        devDayQueueSealed: sealDevDayQueue(state.devDayQueueSealed, action.dateKey),
      }
    }
    case 'SET_DEV_NEONOPHIS_GRID': {
      if (!state.devMode) return state
      const nextW = action.gridW ?? state.devNeonophisGridW
      const nextH = action.gridH ?? state.devNeonophisGridH
      const nextCell = action.cellPx ?? state.devNeonophisCellPx
      return {
        ...state,
        devNeonophisGridW: Math.min(48, Math.max(6, Math.floor(nextW) || 12)),
        devNeonophisGridH: Math.min(64, Math.max(6, Math.floor(nextH) || 20)),
        devNeonophisCellPx: Math.min(48, Math.max(6, Math.floor(nextCell) || 16)),
      }
    }
    case 'DEV_PREPARE_GAME_CARD_REPLAY': {
      if (!state.devMode) return state
      const queue = state.dayQueues[action.dateKey]
      if (!queue) return state
      const minutes = clockMinutes(state)
      const nowMs = appNowMs(state)
      const wOpts = windowStateOpts(state)
      let coinsDelta = 0
      const cards = queue.cards.map((card) => {
        if (card.challengeId !== action.challengeId || !isGameCard(card)) return card
        if (card.status === 'completed') {
          coinsDelta -= card.gameSettleNet ?? 0
        }
        const fresh: DayCard = {
          ...card,
          status: 'locked',
          photoDataUrl: undefined,
          aiMessage: undefined,
          coinsAwarded: 0,
          deadlineAt: null,
          gameSettleNet: undefined,
          gamePlayEpoch: state.devGameCardReplayEpoch,
        }
        return applyWindowState(fresh, action.dateKey, minutes, nowMs, wOpts)
      })
      return {
        ...state,
        coins: Math.max(0, state.coins + coinsDelta),
        dayQueues: {
          ...state.dayQueues,
          [action.dateKey]: { ...queue, cards: sortCardsBySchedule(cards) },
        },
      }
    }
    case 'REVEAL_STAR_CARDS': {
      return {
        ...state,
        starCardsRevealed: {
          ...state.starCardsRevealed,
          [action.dateKey]: true,
        },
      }
    }
    case 'EXIT_DEV_MODE':
      return {
        ...state,
        devMode: false,
        dayQueues: {},
      }
    default:
      return state
  }
}

type Ctx = {
  state: AppState
  dispatch: React.Dispatch<Action>
  getDay: (date: string) => DayLog
}

const AppContext = createContext<Ctx | null>(null)

function normalizeWorkoutLoads(raw: unknown): Record<string, WorkoutLoadEntry> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, WorkoutLoadEntry> = {}
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue
    const value = typeof (entry as WorkoutLoadEntry).value === 'string' ? (entry as WorkoutLoadEntry).value : ''
    const unit: LoadUnit = (entry as WorkoutLoadEntry).unit === 'placas' ? 'placas' : 'kg'
    out[key] = { value, unit }
  }
  return out
}

function migrateState(raw: Partial<AppState> & { challengeProofs?: unknown }): AppState {
  const rawQueues = raw.dayQueues ?? {}
  let migratedQueues: Record<string, DayQueue> = {}
  for (const [key, queue] of Object.entries(rawQueues)) {
    if (!queue || !Array.isArray(queue.cards)) continue
    migratedQueues[key] = {
      ...queue,
      cards: queue.cards.map((c) => {
        const unlockMinutes = typeof c.unlockMinutes === 'number' ? c.unlockMinutes : c.unlockHour * 60
        const windowStartMinutes =
          typeof c.windowStartMinutes === 'number' ? c.windowStartMinutes : unlockMinutes
        const windowEndMinutes =
          typeof c.windowEndMinutes === 'number'
            ? c.windowEndMinutes
            : (unlockMinutes + 10) % 1440
        const windowKind = c.windowKind ?? (c.flexible ? 'interval' : 'tolerance')
        // Análise é efêmera (promise em memória). Persistido = travado → volta a active.
        const status = c.status === 'analyzing' ? ('active' as const) : c.status
        const aiMessage =
          status === 'active' && c.aiMessage === 'Analisando…' ? undefined : c.aiMessage
        const id = c.challengeId ?? ''
        const proofMode =
          c.proofMode === 'confirm' ||
          id.endsWith('-acorde') ||
          id.endsWith('-sono') ||
          id.endsWith('-jejum-inicio') ||
          id.endsWith('-jejum-fim')
            ? ('confirm' as const)
            : ('photo' as const)
        const confirmLabel =
          c.confirmLabel ||
          (id.endsWith('-acorde')
            ? 'Acordado'
            : id.endsWith('-sono')
              ? 'Iniciar Sono'
              : id.endsWith('-jejum-inicio')
                ? 'Iniciar Jejum'
                : id.endsWith('-jejum-fim')
                  ? 'Finalizar Jejum'
                  : undefined)
        return {
          ...c,
          status,
          aiMessage,
          unlockMinutes: windowStartMinutes,
          windowStartMinutes,
          windowEndMinutes,
          windowKind,
          proofMode,
          confirmLabel,
        }
      }),
    }
  }
  let coins = typeof raw.coins === 'number' ? raw.coins : 0
  const rawVersion =
    typeof (raw as { coinEconomyVersion?: unknown }).coinEconomyVersion === 'number'
      ? (raw as { coinEconomyVersion: number }).coinEconomyVersion
      : 1

  const scaleCoinQueues = (
    queues: Record<string, DayQueue>,
    factor: number,
    mode: 'full' | 'awarded-only',
  ) =>
    Object.fromEntries(
      Object.entries(queues).map(([key, queue]) => [
        key,
        {
          ...queue,
          cards: queue.cards.map((c) => {
            const awarded = Math.max(0, Math.floor((c.coinsAwarded || 0) * factor))
            const face = c.coins || 0
            // full: multiplica face. awarded-only: só se ainda parecer valor antigo (<10 ou não múltiplo de 10).
            const nextFace =
              mode === 'full' || face <= 0
                ? Math.max(0, Math.floor(face * factor))
                : face < 10 || face % 10 !== 0
                  ? Math.max(0, Math.floor(face * factor))
                  : face
            return { ...c, coins: nextFace, coinsAwarded: awarded }
          }),
        },
      ]),
    )

  /** Save marcado como v2 sem ter multiplicado (ex.: awarded 3 com face 30, saldo 252). */
  const looksUnscaledV2 = (queues: Record<string, DayQueue>, balance: number) => {
    if (balance > 0 && balance % 10 !== 0) return true
    for (const queue of Object.values(queues)) {
      for (const c of queue.cards) {
        const awarded = c.coinsAwarded || 0
        if (awarded <= 0) continue
        if (awarded * COIN_ECONOMY_SCALE_FROM_V1 === (c.coins || 0)) return true
        if (awarded < 10 && (c.coins || 0) >= 10) return true
      }
    }
    return false
  }

  // v1 → ×10; v2 inconsistente → repara saldo/awarded ×10; sobe para v3.
  let coinEconomyVersion = rawVersion
  if (coinEconomyVersion < 2) {
    const factor = COIN_ECONOMY_SCALE_FROM_V1
    coins = Math.max(0, Math.floor(coins * factor))
    migratedQueues = scaleCoinQueues(migratedQueues, factor, 'full')
    coinEconomyVersion = COIN_ECONOMY_VERSION
  } else if (coinEconomyVersion < COIN_ECONOMY_VERSION) {
    if (looksUnscaledV2(migratedQueues, coins)) {
      const factor = COIN_ECONOMY_SCALE_FROM_V1
      coins = Math.max(0, Math.floor(coins * factor))
      migratedQueues = scaleCoinQueues(migratedQueues, factor, 'awarded-only')
    }
    coinEconomyVersion = COIN_ECONOMY_VERSION
  }

  const devDayQueueSealed: Record<string, boolean> =
    raw.devDayQueueSealed && typeof raw.devDayQueueSealed === 'object'
      ? { ...raw.devDayQueueSealed }
      : {}
  for (const [key, queue] of Object.entries(migratedQueues)) {
    if (devDayQueueSealed[key]) continue
    const hasRoutineOutcome = queue.cards.some(
      (c) => !isGameCard(c) && (c.status === 'completed' || c.status === 'expired'),
    )
    if (hasRoutineOutcome) devDayQueueSealed[key] = true
  }

  return {
    ...initialState,
    ...raw,
    coins,
    coinEconomyVersion,
    routine: migrateWeeklyRoutine(raw.routine),
    dayQueues: migratedQueues,
    starCardsRevealed:
      raw.starCardsRevealed && typeof raw.starCardsRevealed === 'object'
        ? { ...raw.starCardsRevealed }
        : {},
    devDayQueueSealed,
    daily: raw.daily ?? {},
    shopping: raw.shopping ?? {},
    photoNotes: raw.photoNotes ?? {},
    workoutLoads: normalizeWorkoutLoads(raw.workoutLoads),
    profile: { ...emptyProfile, ...(raw.profile ?? {}) },
    devMode: Boolean(raw.devMode),
    devDay: typeof raw.devDay === 'number' ? Math.min(28, Math.max(1, raw.devDay)) : 1,
    devTime:
      typeof raw.devTime === 'string' && raw.devTime
        ? normalizeClockTimeWithSeconds(raw.devTime)
        : '08:00:00',
    // Ao recarregar, parte do horário salvo e começa a correr de novo
    devClockAnchoredAt: Date.now(),
    devClockPaused: Boolean(raw.devClockPaused),
    devGameCardReplayEpoch:
      typeof raw.devGameCardReplayEpoch === 'number' ? raw.devGameCardReplayEpoch : 0,
    devNeonophisGridW:
      typeof raw.devNeonophisGridW === 'number'
        ? Math.min(48, Math.max(6, Math.floor(raw.devNeonophisGridW)))
        : 12,
    devNeonophisGridH:
      typeof raw.devNeonophisGridH === 'number'
        ? Math.min(64, Math.max(6, Math.floor(raw.devNeonophisGridH)))
        : 20,
    devNeonophisCellPx:
      typeof raw.devNeonophisCellPx === 'number'
        ? Math.min(48, Math.max(6, Math.floor(raw.devNeonophisCellPx)))
        : 16,
    pendingWeek1RestartAfterDateKey:
      typeof raw.pendingWeek1RestartAfterDateKey === 'string'
        ? raw.pendingWeek1RestartAfterDateKey
        : null,
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    return migrateState(JSON.parse(raw) as Partial<AppState>)
  } catch {
    return initialState
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const getDay = (date: string) => state.daily[date] ?? emptyDay()

  return (
    <AppContext.Provider value={{ state, dispatch, getDay }}>
      <Week1RestartScheduler />
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export { nowMinutes }
