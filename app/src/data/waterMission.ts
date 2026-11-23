import type { DayQueue } from './types'

/** Número de cartas de água no baralho do dia (rotina). */
export const WATER_CARD_COUNT = 10
/** Meta diária: peso (kg) × 35 ml. */
export const WATER_ML_PER_KG = 35
/** Moedas extras ao completar a meta de água do dia. */
export const WATER_MISSION_BONUS_COINS = 100

/** Sufixos das 10 cartas de água — ordem = índice da porção (0…9). */
export const WATER_PORTION_SUFFIXES = [
  'agua-manha',
  'agua-cafe',
  'agua-colacao',
  'agua-meio',
  'pos-treino',
  'agua-descanso',
  'agua-tarde',
  'agua-jantar',
  'agua-ceia',
  'agua-noite',
] as const

const WATER_SUFFIX_RE =
  /-?(agua-manha|agua-cafe|agua-colacao|agua-meio|pos-treino|agua-descanso|agua-tarde|agua-jantar|agua-ceia|agua-noite)$/

export function parseWeightKg(weight: string | undefined): number | null {
  if (!weight?.trim()) return null
  const n = Number(String(weight).replace(',', '.').trim())
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function dailyWaterGoalMl(weightKg: number): number {
  return Math.round(weightKg * WATER_ML_PER_KG)
}

/** Reparte a meta diária em 10 porções (soma exata). */
export function splitWaterPortionsMl(weightKg: number): number[] {
  const total = dailyWaterGoalMl(weightKg)
  const base = Math.floor(total / WATER_CARD_COUNT)
  const extra = total % WATER_CARD_COUNT
  return Array.from({ length: WATER_CARD_COUNT }, (_, i) => base + (i < extra ? 1 : 0))
}

export function waterPortionSuffix(challengeId: string): string | null {
  const m = WATER_SUFFIX_RE.exec(challengeId)
  return m?.[1] ?? null
}

export function waterPortionIndex(challengeId: string): number | null {
  const suffix = waterPortionSuffix(challengeId)
  if (!suffix) return null
  const idx = (WATER_PORTION_SUFFIXES as readonly string[]).indexOf(suffix)
  return idx >= 0 ? idx : null
}

export function waterMissionGoalMl(weightKg: number | null): number | null {
  if (weightKg == null) return null
  return dailyWaterGoalMl(weightKg)
}

/** Volume (ml) da carta de água conforme peso do participante. */
export function waterMlForChallenge(
  challengeId: string,
  weightKg: number | null,
): number | undefined {
  if (weightKg == null) return undefined
  const idx = waterPortionIndex(challengeId)
  if (idx == null) return undefined
  return splitWaterPortionsMl(weightKg)[idx]
}

export function formatWaterMl(ml: number): string {
  if (ml >= 1000 && ml % 1000 === 0) return `${ml / 1000} L`
  if (ml >= 1000) return `${(ml / 1000).toFixed(1).replace('.', ',')} L`
  return `${ml} ml`
}

/** Soma ml das cartas de água concluídas no baralho do dia. */
export function waterMlFromQueue(queue: DayQueue | undefined): number {
  if (!queue) return 0
  let total = 0
  for (const card of queue.cards) {
    if (card.status === 'completed' && card.waterMl) total += card.waterMl
  }
  return total
}

export function crossedWaterMissionGoal(fromMl: number, toMl: number, goalMl: number): boolean {
  return fromMl < goalMl && toMl >= goalMl
}