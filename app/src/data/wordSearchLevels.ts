export type WordSearchLevel = 1 | 2 | 3

export type WordSearchLevelDef = {
  level: WordSearchLevel
  wordCount: 3 | 6 | 9
  reward: 30 | 40 | 50
}

export const WORD_SEARCH_LEVELS: WordSearchLevelDef[] = [
  { level: 1, wordCount: 3, reward: 30 },
  { level: 2, wordCount: 6, reward: 40 },
  { level: 3, wordCount: 9, reward: 50 },
]

export function wordSearchLevelDef(level: WordSearchLevel): WordSearchLevelDef {
  return WORD_SEARCH_LEVELS[level - 1]!
}