import { isGameCard } from './dayGames'
import type { DayCard, DayQueue } from './types'

export type DevRoutineOutcomeResult = {
  cards: DayCard[]
  coinDelta: number
  completedSum: number
  routineTotal: number
  completedCount: number
}

function shufflePickIds(ids: string[], count: number, rng: () => number): Set<string> {
  const n = Math.min(Math.max(0, Math.floor(count)), ids.length)
  const pool = [...ids]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  return new Set(pool.slice(0, n))
}

/** Marca cartas de rotina (não estrela) como concluídas ou perdidas e calcula delta de moedas. */
export function applyDevRoutineOutcomes(
  queue: DayQueue,
  completedCount: number,
  rng: () => number = Math.random,
): DevRoutineOutcomeResult {
  const routine = queue.cards.filter((c) => !isGameCard(c))
  const completedIds = shufflePickIds(
    routine.map((c) => c.challengeId),
    completedCount,
    rng,
  )

  let coinDelta = 0
  let completedSum = 0

  const cards = queue.cards.map((card) => {
    if (isGameCard(card)) return card

    const prevAwarded =
      card.status === 'completed' ? Math.max(0, card.coinsAwarded || card.coins || 0) : 0
    const willComplete = completedIds.has(card.challengeId)

    if (willComplete) {
      const awarded = Math.max(0, card.coins || 0)
      completedSum += awarded
      coinDelta += awarded - prevAwarded
      return {
        ...card,
        status: 'completed' as const,
        coinsAwarded: awarded,
        deadlineAt: null,
        aiMessage: card.aiMessage ?? 'Concluída (simulação DEV).',
      }
    }

    coinDelta -= prevAwarded
    return {
      ...expireRoutineCard(card),
    }
  })

  return {
    cards,
    coinDelta,
    completedSum,
    routineTotal: routine.length,
    completedCount: completedIds.size,
  }
}

function expireRoutineCard(card: DayCard): DayCard {
  return {
    ...card,
    status: 'expired',
    coinsAwarded: 0,
    deadlineAt: null,
    aiMessage: 'Carta Perdida (simulação DEV).',
  }
}

/** Soma face das cartas de rotina concluídas (tarja verde) em um baralho. */
export function sumRoutineCompletedFace(queue: DayQueue): number {
  return queue.cards
    .filter((c) => !isGameCard(c) && c.status === 'completed')
    .reduce((sum, c) => sum + Math.max(0, c.coins || 0), 0)
}

/**
 * Carteira DEV = verdes dos dias já selados + verdes do dia atual (esta confirmação).
 * Ignora moedas digitadas no painel e não usa delta sobre saldo anterior.
 */
export function devWalletRoutineGreensFromQueues(
  dayQueues: Record<string, DayQueue>,
  devDayQueueSealed: Record<string, boolean>,
  currentDateKey: string,
  currentDayGreenSum: number,
): number {
  let total = Math.max(0, currentDayGreenSum)
  for (const [key, queue] of Object.entries(dayQueues)) {
    if (key === currentDateKey) continue
    if (!devDayQueueSealed[key]) continue
    total += sumRoutineCompletedFace(queue)
  }
  return total
}