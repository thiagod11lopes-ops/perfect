import type { DailyChallenge } from './dailyChallenges'

/** Catálogo dos jogos especiais diários (roleta, desafio WV, futuros slots game-3…7). */
export type DayGameId =
  | 'slot-machine'
  | 'workout-vision'
  | 'neonophis'
  | 'memory-match'
  | 'word-search'
  | 'quiz'
  | 'game-3'
  | 'game-4'
  | 'game-5'
  | 'game-6'
  | 'game-7'

export interface DayGameDef {
  id: DayGameId
  title: string
  description: string
  proofHint: string
  coins: number
  /** Caminho servido em /public (iframe no modal). */
  embedPath: string | null
  enabled: boolean
}

export const DAY_GAMES: DayGameDef[] = [
  {
    id: 'slot-machine',
    title: 'Roleta da sorte',
    description:
      'Carta especial! Aposte 30, 60 ou 90 moedas e gire 3 vezes — prêmio de 10 a 30 moedas na maioria das rodadas.',
    proofHint: 'Escolha a aposta, gire a roleta e encerre a carta ao terminar.',
    coins: 0,
    embedPath: '/games/slot-machine/index.html',
    enabled: true,
  },
  {
    id: 'workout-vision',
    title: 'Desafio do dia',
    description:
      'Filmagem com WorkoutVision: faça o exercício do treino de hoje e confirme as repetições.',
    proofHint: 'Toque em Fazer agora, filme a série e conclua quando confirmar as reps.',
    coins: 30,
    embedPath: '/games/workout-vision/index.html',
    enabled: true,
  },
  {
    id: 'neonophis',
    title: 'Missão de Habilidade',
    description:
      'Neon Ophis: colete 10 moedas (maçãs) em 1 minuto para creditar na carteira principal.',
    proofHint: 'Jogue agora, atinja a meta de moedas no tempo e a carta conclui sozinha.',
    coins: 10,
    embedPath: '/games/neonophis/index.html',
    enabled: true,
  },
  {
    id: 'memory-match',
    title: 'Memória do treino',
    description:
      'Missão de Habilidade: encontre os pares dos exercícios em 1 minuto (níveis 1–3, até 20 moedas).',
    proofHint: 'Escolha o nível, memore os exercícios e conclua antes do tempo.',
    coins: 10,
    embedPath: null,
    enabled: true,
  },
  {
    id: 'word-search',
    title: 'Caça-palavras',
    description:
      'Encontre os nomes dos exercícios na grade (3, 6 ou 9 palavras · 30, 40 ou 50 moedas).',
    proofHint: 'Vire a carta, escolha o nível e marque cada palavra arrastando no tabuleiro.',
    coins: 30,
    embedPath: null,
    enabled: true,
  },
  {
    id: 'quiz',
    title: 'Quiz',
    description: 'Assista ao movimento do exercício e escolha o nome certo entre 4 opções (+10 moedas).',
    proofHint: 'Toque na carta, veja a animação e marque o exercício correto.',
    coins: 10,
    embedPath: null,
    enabled: true,
  },
  {
    id: 'game-3',
    title: 'Jogo 3',
    description: 'Em breve.',
    proofHint: 'Em breve.',
    coins: 15,
    embedPath: null,
    enabled: false,
  },
  {
    id: 'game-4',
    title: 'Jogo 4',
    description: 'Em breve.',
    proofHint: 'Em breve.',
    coins: 15,
    embedPath: null,
    enabled: false,
  },
  {
    id: 'game-5',
    title: 'Jogo 5',
    description: 'Em breve.',
    proofHint: 'Em breve.',
    coins: 15,
    embedPath: null,
    enabled: false,
  },
  {
    id: 'game-6',
    title: 'Jogo 6',
    description: 'Em breve.',
    proofHint: 'Em breve.',
    coins: 15,
    embedPath: null,
    enabled: false,
  },
  {
    id: 'game-7',
    title: 'Jogo 7',
    description: 'Em breve.',
    proofHint: 'Em breve.',
    coins: 15,
    embedPath: null,
    enabled: false,
  },
]

export function isGameCard(card: { kind?: string; challengeId?: string; proofMode?: string }) {
  return card.kind === 'jogo' || card.proofMode === 'game' || !!card.challengeId?.includes('-jogo-')
}

export function getDayGame(id: string | undefined | null): DayGameDef | null {
  if (!id) return null
  return DAY_GAMES.find((g) => g.id === id) ?? null
}

/** Hash estável a partir da data (mesmo baralho o dia inteiro). */
export function hashDateKey(dateKey: string): number {
  let h = 2166136261
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Um entretenimento por dia, nesta ordem; reinicia após os 5 (seg → roleta … sex → caça-palavras; sáb → roleta). */
export const ENTERTAINMENT_GAME_CYCLE: DayGameId[] = [
  'slot-machine',
  'memory-match',
  'quiz',
  'neonophis',
  'word-search',
]

const DAILY_WORKOUT_GAME: DayGameId = 'workout-vision'

export function weekdayFromDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** Índice 0 = segunda-feira … 6 = domingo (Date.getDay(): 0=dom, 1=seg). */
export function weekdayIndexFromMonday(weekday: number): number {
  return (weekday + 6) % 7
}

export function entertainmentGameForWeekday(weekday: number): DayGameId {
  const fromMon = weekdayIndexFromMonday(weekday)
  return ENTERTAINMENT_GAME_CYCLE[fromMon % ENTERTAINMENT_GAME_CYCLE.length]!
}

/** Sempre desafio filmado + um jogo do ciclo de entretenimento. */
export function dailyStarGameIds(weekday: number): DayGameId[] {
  return [DAILY_WORKOUT_GAME, entertainmentGameForWeekday(weekday)]
}

export function enabledDayGames(): DayGameDef[] {
  return DAY_GAMES.filter(
    (g) =>
      g.enabled &&
      (g.embedPath ||
        g.id === 'memory-match' ||
        g.id === 'word-search' ||
        g.id === 'quiz'),
  )
}

const STAR_CARD_DAY_END_MIN = 23 * 60 + 50

/** Carta-estrela: sem horário na rotina; janela interna cobre o dia inteiro. */
export function buildGameChallenge(week: 1 | 2 | 3 | 4, game: DayGameDef): DailyChallenge {
  return {
    id: `w${week}-jogo-${game.id}`,
    week,
    band: 'dia',
    unlockHour: 0,
    unlockMinutes: 0,
    windowStartMinutes: 0,
    windowEndMinutes: STAR_CARD_DAY_END_MIN,
    windowKind: 'interval',
    flexible: true,
    title: `✦ ${game.title}`,
    description: game.description,
    proofHint: game.proofHint,
    coins: game.coins,
    durationMin: STAR_CARD_DAY_END_MIN,
    kind: 'jogo',
    proofMode: 'game',
    confirmLabel: 'Concluir jogo',
  }
}

/** Exatamente 2 cartas-estrela do dia (desafio + entretenimento do ciclo). */
export function buildDailyStarChallenges(
  week: 1 | 2 | 3 | 4,
  weekday: number,
): DailyChallenge[] {
  return dailyStarGameIds(weekday)
    .map((id) => getDayGame(id))
    .filter((g): g is DayGameDef => g != null && g.enabled)
    .map((game) => buildGameChallenge(week, game))
}

/** Rotina cronometrada + cartas-estrela sempre no fim (fora da fila por horário). */
export function mergeRoutineWithStarCards(
  routineChallenges: DailyChallenge[],
  week: 1 | 2 | 3 | 4,
  weekday: number,
): DailyChallenge[] {
  const routineIds = new Set(routineChallenges.map((c) => c.id))
  const stars = buildDailyStarChallenges(week, weekday).filter((c) => !routineIds.has(c.id))
  return [...routineChallenges, ...stars]
}

/** @deprecated Use mergeRoutineWithStarCards */
export function injectDailyGameCard(
  challenges: DailyChallenge[],
  week: 1 | 2 | 3 | 4,
  _dateKey: string,
  weekday?: number,
): DailyChallenge[] {
  const wday = weekday ?? weekdayFromDateKey(_dateKey)
  return mergeRoutineWithStarCards(
    challenges.filter((c) => !/-jogo-/.test(c.id)),
    week,
    wday,
  )
}

export function gameIdFromChallengeId(challengeId: string): DayGameId | null {
  const m = /-jogo-(.+)$/.exec(challengeId)
  return (m?.[1] as DayGameId) ?? null
}
