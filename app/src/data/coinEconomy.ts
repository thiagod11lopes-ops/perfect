import type { DayCard, DayQueue } from './types'
import { challengeWeek, parseISODate } from '../utils/dates'

/**
 * Escala da economia de moedas.
 * v1 = valores originais (unlock 250, treino 2…)
 * v2 = ×10 (unlock 2500, treino 20…) — alguns saves marcaram v2 sem multiplicar
 * v3 = reparo: garante saldo/awarded ×10 quando v2 ficou inconsistente
 */
export const COIN_ECONOMY_VERSION = 3
/** Fator aplicado ao migrar de v1 → escala atual (saldo + coinsAwarded). */
export const COIN_ECONOMY_SCALE_FROM_V1 = 10

/** Moedas ganhas ao concluir um bloco do treino (séries + cardio). */
export const BLOCK_COMPLETE_COINS = 0

/** Arredonda moedas ao múltiplo de 10 mais próximo (≥ 0). */
export function roundCoinsNearest10(amount: number): number {
  const n = Math.floor(amount)
  if (n <= 0) return 0
  return Math.round(n / 10) * 10
}

/** Teto teórico de ganho líquido em um dia (rotina + 2 cartas-estrela no máximo). */
export const DAILY_COIN_GAIN_CAP = 540

/** A cada N moedas cumulativas, libera a próxima semana. */
export const WEEK_UNLOCK_COINS = 2500

/** Marcos: semana 2 = 2500, semana 3 = 5000, semana 4 = 7500. */
export const WEEK_UNLOCK_MILESTONES = {
  2: WEEK_UNLOCK_COINS * 1,
  3: WEEK_UNLOCK_COINS * 2,
  4: WEEK_UNLOCK_COINS * 3,
} as const

/** Teto-alvo de moedas possíveis por semana (margem acima do unlock). */
export const WEEK_MAX_TARGET = 3100

export type WeekNum = 1 | 2 | 3 | 4

/** Semana do baralho a partir do id da carta (ex.: w2-treino → 2). */
export function weekFromChallengeId(challengeId: string, fallback?: WeekNum): WeekNum | null {
  const m = /^w([1-4])-/.exec(challengeId)
  if (m) return Number(m[1]) as WeekNum
  return fallback ?? null
}

function cardCoins(card: DayCard) {
  return card.coinsAwarded || card.coins || 0
}

/** Soma moedas creditadas (cartas concluídas) nos baralhos, opcionalmente filtrando a semana. */
export function coinsEarnedFromQueues(
  dayQueues: Record<string, DayQueue>,
  startDate: string,
  week?: WeekNum,
): number {
  let total = 0
  for (const [dateKey, queue] of Object.entries(dayQueues)) {
    const calendarWeek = challengeWeek(startDate, parseISODate(dateKey))
    for (const card of queue.cards) {
      if (card.status !== 'completed') continue
      const cardWeek = weekFromChallengeId(card.challengeId, calendarWeek)
      if (week != null && cardWeek !== week) continue
      total += cardCoins(card)
    }
  }
  return total
}

/**
 * Semana liberada: 1 + quantos blocos de 2500 moedas (máx. 4).
 * 0–2499 → 1 · 2500–4999 → 2 · 5000–7499 → 3 · 7500+ → 4
 */
export function maxUnlockedWeek(totalCoins: number): WeekNum {
  const blocks = Math.floor(Math.max(0, totalCoins) / WEEK_UNLOCK_COINS)
  return Math.min(4, 1 + blocks) as WeekNum
}

/** Semana efetiva do baralho (não passa da semana liberada por moedas). */
export function effectiveChallengeWeek(
  calendarWeek: WeekNum,
  unlockedWeek: WeekNum,
): WeekNum {
  return Math.min(calendarWeek, unlockedWeek) as WeekNum
}

export function weekUnlockProgress(totalCoins: number): {
  earned: number
  need: number
  remaining: number
  nextWeek: WeekNum | null
  milestone: number | null
  /** Início do bloco atual (0 → 2500, 2500 → 5000, 5000 → 7500). */
  segmentStart: number
  /** Moedas ganhas dentro do bloco atual. */
  segmentEarned: number
  /** Tamanho do bloco (sempre 2500). */
  segmentNeed: number
  /** 0–100 do bloco atual (não do total absoluto). */
  percent: number
} {
  const earned = Math.max(0, totalCoins)
  const unlocked = maxUnlockedWeek(earned)
  if (unlocked >= 4) {
    return {
      earned,
      need: WEEK_UNLOCK_MILESTONES[4],
      remaining: 0,
      nextWeek: null,
      milestone: null,
      segmentStart: WEEK_UNLOCK_MILESTONES[4],
      segmentEarned: WEEK_UNLOCK_COINS,
      segmentNeed: WEEK_UNLOCK_COINS,
      percent: 100,
    }
  }
  const nextWeek = (unlocked + 1) as 2 | 3 | 4
  const need = WEEK_UNLOCK_MILESTONES[nextWeek]
  const segmentStart = need - WEEK_UNLOCK_COINS
  const segmentEarned = Math.max(0, Math.min(WEEK_UNLOCK_COINS, earned - segmentStart))
  const remaining = Math.max(0, need - earned)
  return {
    earned,
    need,
    remaining,
    nextWeek,
    milestone: need,
    segmentStart,
    segmentEarned,
    segmentNeed: WEEK_UNLOCK_COINS,
    percent: Math.min(100, Math.round((segmentEarned / WEEK_UNLOCK_COINS) * 100)),
  }
}

/**
 * Marcos de liberação cruzados entre dois saldos.
 * Vale ao atingir o mínimo (ex.: 2500) OU ao ultrapassar (ex.: 2498 → 2530).
 */
export function crossedWeekUnlockMilestones(
  fromCoins: number,
  toCoins: number,
): Array<{ unlockedWeek: 2 | 3 | 4; milestone: number }> {
  const from = Math.max(0, fromCoins)
  const to = Math.max(0, toCoins)
  if (to <= from) return []
  const hits: Array<{ unlockedWeek: 2 | 3 | 4; milestone: number }> = []
  for (const week of [2, 3, 4] as const) {
    const milestone = WEEK_UNLOCK_MILESTONES[week]
    // from abaixo do marco e to no marco ou acima → celebra
    if (from < milestone && to >= milestone) {
      hits.push({ unlockedWeek: week, milestone })
    }
  }
  return hits
}

/** Primeiro marco cruzado no salto de saldo (atalho). */
export function crossedWeekUnlockMilestone(
  fromCoins: number,
  toCoins: number,
): { unlockedWeek: 2 | 3 | 4; milestone: number } | null {
  return crossedWeekUnlockMilestones(fromCoins, toCoins)[0] ?? null
}
