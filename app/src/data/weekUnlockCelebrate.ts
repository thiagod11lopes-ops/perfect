import {
  WEEK_UNLOCK_MILESTONES,
  crossedWeekUnlockMilestones,
  maxUnlockedWeek,
  type WeekNum,
} from './coinEconomy'

export type WeekUnlockCue = {
  unlockedWeek: 2 | 3 | 4
  milestone: number
}

/** Único dia do desafio em que a celebração da próxima semana pode aparecer. */
export const WEEK_UNLOCK_CELEBRATION_DAY: Record<2 | 3 | 4, number> = {
  2: 7,
  3: 14,
  4: 21,
}

export const WEEK_UNLOCK_CELEBRATION_DAYS = [7, 14, 21] as const

export function isWeekUnlockCelebrationDay(challengeDay: number): boolean {
  return (WEEK_UNLOCK_CELEBRATION_DAYS as readonly number[]).includes(challengeDay)
}

function celebrationAllowedForDay(challengeDay: number, unlockedWeek: 2 | 3 | 4): boolean {
  return challengeDay === WEEK_UNLOCK_CELEBRATION_DAY[unlockedWeek]
}

/** Estado de sessão — sobrevive a remount do React (Strict Mode / re-render). */
let initialized = false
let lastCelebratedWeek: WeekNum = 1
let prevCoins = 0
const pending: WeekUnlockCue[] = []
/** Semana cuja animação está na tela (ainda não marcada como celebrada). */
let displayingWeek: 2 | 3 | 4 | null = null

/** Pausa o flush enquanto a animação de moedas da carta está na tela. */
let flushPaused = false

type Listener = () => void
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

export function subscribeWeekUnlock(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setWeekUnlockFlushPaused(paused: boolean) {
  if (flushPaused === paused) {
    if (!paused) emit()
    return
  }
  flushPaused = paused
  emit()
}

export function isWeekUnlockFlushPaused() {
  return flushPaused
}

function queueCue(cue: WeekUnlockCue) {
  if (cue.unlockedWeek <= lastCelebratedWeek) return
  if (displayingWeek === cue.unlockedWeek) return
  if (pending.some((p) => p.unlockedWeek === cue.unlockedWeek)) return
  pending.push(cue)
  emit()
}

function queueCrossings(from: number, to: number) {
  if (to <= from) return
  for (const hit of crossedWeekUnlockMilestones(from, to)) {
    queueCue(hit)
  }
  const unlocked = maxUnlockedWeek(to)
  for (let w = lastCelebratedWeek + 1; w <= unlocked; w++) {
    if (w === 2 || w === 3 || w === 4) {
      queueCue({
        unlockedWeek: w,
        milestone: WEEK_UNLOCK_MILESTONES[w],
      })
    }
  }
}

/**
 * Atualiza a fila de celebrações com base no saldo.
 * Dispara ao atingir OU ultrapassar 2500 / 5000 / 7500.
 */
export function noteCoinsForWeekUnlock(totalCoins: number): void {
  const coins = Math.max(0, totalCoins)

  if (!initialized) {
    initialized = true
    prevCoins = coins
    lastCelebratedWeek = maxUnlockedWeek(coins)
    pending.length = 0
    displayingWeek = null
    return
  }

  const from = prevCoins
  const to = coins
  prevCoins = to

  // Queda de saldo (DEV): recua o marcador para poder celebrar de novo ao subir.
  if (to < from) {
    const unlocked = maxUnlockedWeek(to)
    lastCelebratedWeek = unlocked
    if (displayingWeek != null && displayingWeek > unlocked) displayingWeek = null
    for (let i = pending.length - 1; i >= 0; i--) {
      if (pending[i].unlockedWeek > unlocked) pending.splice(i, 1)
    }
    emit()
    return
  }

  if (to === from) return
  queueCrossings(from, to)
}

/** Garante o enfileiramento mesmo se o Host ainda não processou o saldo. */
export function noteCoinCrossing(fromCoins: number, toCoins: number): void {
  const from = Math.max(0, fromCoins)
  const to = Math.max(0, toCoins)
  if (!initialized) {
    initialized = true
    prevCoins = from
    lastCelebratedWeek = maxUnlockedWeek(from)
    pending.length = 0
    displayingWeek = null
  }
  if (to > prevCoins) prevCoins = to
  queueCrossings(from, to)
}

export function hasPendingWeekUnlock(): boolean {
  return pending.length > 0
}

export function hasPendingWeekUnlockForDay(challengeDay: number): boolean {
  return pending.some((p) => celebrationAllowedForDay(challengeDay, p.unlockedWeek))
}

export function shiftWeekUnlockCelebration(): WeekUnlockCue | null {
  const next = pending.shift() ?? null
  displayingWeek = next?.unlockedWeek ?? null
  emit()
  return next
}

/** Só retira da fila a celebração cuja semana corresponde ao dia 7 / 14 / 21. */
export function shiftWeekUnlockCelebrationForDay(challengeDay: number): WeekUnlockCue | null {
  if (!isWeekUnlockCelebrationDay(challengeDay)) return null
  const idx = pending.findIndex((p) => celebrationAllowedForDay(challengeDay, p.unlockedWeek))
  if (idx < 0) return null
  const [cue] = pending.splice(idx, 1)
  displayingWeek = cue.unlockedWeek
  emit()
  return cue
}

/** Chamar só quando a animação de desbloqueio terminar. */
export function markWeekUnlockCelebrated(week: WeekNum): void {
  if (week > lastCelebratedWeek) lastCelebratedWeek = week
  if (displayingWeek === week) displayingWeek = null
  emit()
}

/**
 * Prepara um salto DEV: baseline em `fromCoins` (ex.: 0) para que o próximo
 * noteCoins celebre tudo até o novo saldo.
 */
export function resetWeekUnlockCelebrationState(totalCoins = 0): void {
  initialized = true
  prevCoins = Math.max(0, totalCoins)
  lastCelebratedWeek = maxUnlockedWeek(prevCoins)
  pending.length = 0
  displayingWeek = null
  flushPaused = false
  emit()
}
