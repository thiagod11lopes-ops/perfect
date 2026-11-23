import { WEEK_UNLOCK_COINS } from './coinEconomy'
import { diffDays, parseISODate } from '../utils/dates'

/** Verificação de portão no dia N (sem teto em 28 — inclui dia 29). */
export function challengeGateDayIndex(
  startDate: string,
  date: Date,
  devMode: boolean,
  devDay: number,
): number {
  if (devMode) return Math.max(1, devDay)
  return diffDays(parseISODate(startDate), date) + 1
}

export type WeekGateCheckpoint = {
  day: number
  minCoins: number
  eyebrow: string
  message: string
}

const MESSAGE_PREFIX =
  'Você não completou o mínimo de moedas da semana para seguir para '

export const WEEK_GATE_CHECKPOINTS: WeekGateCheckpoint[] = [
  {
    day: 8,
    minCoins: WEEK_UNLOCK_COINS,
    eyebrow: 'Fim da semana 1',
    message: `${MESSAGE_PREFIX}segunda semana`,
  },
  {
    day: 15,
    minCoins: WEEK_UNLOCK_COINS * 2,
    eyebrow: 'Fim da semana 2',
    message: `${MESSAGE_PREFIX}terceira semana`,
  },
  {
    day: 22,
    minCoins: WEEK_UNLOCK_COINS * 3,
    eyebrow: 'Fim da semana 3',
    message: `${MESSAGE_PREFIX}quarta semana`,
  },
  {
    day: 29,
    minCoins: WEEK_UNLOCK_COINS * 4,
    eyebrow: 'Fim do desafio',
    message:
      'Você não completou o mínimo de moedas da semana para alcançar o encerramento do desafio com 10.000 moedas',
  },
]

/** Portão ativo no dia do desafio, se o saldo cumulativo estiver abaixo do mínimo. */
export function activeWeekGateFail(
  gateDayIndex: number,
  totalCoins: number,
): WeekGateCheckpoint | null {
  for (const gate of WEEK_GATE_CHECKPOINTS) {
    if (gateDayIndex === gate.day && totalCoins < gate.minCoins) {
      return gate
    }
  }
  return null
}

/** @deprecated use activeWeekGateFail */
export function isWeek1UnlockFailDay(challengeDay: number, totalCoins: number): boolean {
  const gate = activeWeekGateFail(challengeDay, totalCoins)
  return gate?.day === 8
}