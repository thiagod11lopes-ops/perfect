import type { DayCard } from './types'
import { isGameCard } from './dayGames'

/**
 * Carta de jogo no DEV elegível para nova rodada (relógio reiniciou a sessão).
 * Não inclui completed com epoch atual — isso evita refund da aposta ao só abrir após concluir.
 */
export function isDevGameCardReplayable(
  card: DayCard,
  devMode: boolean,
  devGameCardReplayEpoch: number,
): boolean {
  if (!devMode || !isGameCard(card)) return false
  if (card.status === 'expired') return false
  return (card.gamePlayEpoch ?? 0) < devGameCardReplayEpoch
}

/** Refund + reset de fila só se a carta ainda está completed com sessão antiga. */
export function needsDevGamePrepareReplay(
  card: DayCard,
  devMode: boolean,
  devGameCardReplayEpoch: number,
): boolean {
  if (!isDevGameCardReplayable(card, devMode, devGameCardReplayEpoch)) return false
  return card.status === 'completed'
}