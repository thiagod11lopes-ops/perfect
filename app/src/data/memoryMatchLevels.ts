export type MemoryMatchLevel = 1 | 2 | 3

export type MemoryLevelDef = {
  level: MemoryMatchLevel
  /** Pares clássicos (2 cartas iguais). */
  pairCount: number
  /** Um exercício em tripla: combina quaisquer 2 das 3 (nível 2). */
  tripleCount?: number
  cards: number
  reward: number
  cols: number
  rows: number
}

export const MEMORY_MATCH_LEVELS: MemoryLevelDef[] = [
  { level: 1, pairCount: 3, cards: 6, reward: 10, cols: 3, rows: 2 },
  { level: 2, pairCount: 3, tripleCount: 1, cards: 9, reward: 20, cols: 3, rows: 3 },
  { level: 3, pairCount: 6, cards: 12, reward: 20, cols: 3, rows: 4 },
]

export const MEMORY_MATCH_DURATION_SEC = 60
export const MEMORY_MATCH_COUNTDOWN_SEC = 5

export function memoryLevelDef(level: MemoryMatchLevel): MemoryLevelDef {
  return MEMORY_MATCH_LEVELS[level - 1]!
}