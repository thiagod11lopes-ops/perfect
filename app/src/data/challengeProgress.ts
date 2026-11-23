import type { DayQueue } from './types'

/**
 * Crescimento do desafio (28 dias):
 * % = concluídas / (concluídas + perdidas) em todo o ciclo.
 */
export function challengeCardStats(dayQueues: Record<string, DayQueue>): {
  completed: number
  lost: number
  resolved: number
  /** 0–100 no ciclo de 28 dias. */
  percent: number
} {
  let completed = 0
  let lost = 0
  for (const queue of Object.values(dayQueues)) {
    for (const card of queue.cards) {
      if (card.status === 'completed') completed += 1
      else if (card.status === 'expired') lost += 1
    }
  }
  const resolved = completed + lost
  const percent =
    resolved === 0 ? 0 : Math.min(100, Math.round((completed / resolved) * 100))
  return { completed, lost, resolved, percent }
}
