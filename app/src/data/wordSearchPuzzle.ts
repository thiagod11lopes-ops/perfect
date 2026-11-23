import type { WordSearchLevelDef } from './wordSearchLevels'
import { drawBankWordsForPuzzle, type SearchWord } from './wordSearchCycle'
export { normalizeWordSearchText } from './wordSearchText'

export type WordSearchEntry = {
  id: string
  display: string
  normalized: string
  cells: { r: number; c: number }[]
}

const GRID_ROWS = 10
const GRID_COLS = 10

/** Só esquerda→direita, cima→baixo e diagonal ↘ (nunca invertidas). */
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
] as const

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
}

function canPlace(
  grid: string[][],
  word: string,
  r: number,
  c: number,
  dr: number,
  dc: number,
): { r: number; c: number }[] | null {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const cells: { r: number; c: number }[] = []
  for (let i = 0; i < word.length; i++) {
    const nr = r + dr * i
    const nc = c + dc * i
    if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return null
    const ch = grid[nr]![nc]!
    if (ch !== '' && ch !== word[i]) return null
    cells.push({ r: nr, c: nc })
  }
  return cells
}

function listPlacements(
  grid: string[][],
  word: string,
): { r: number; c: number }[][] {
  const out: { r: number; c: number }[][] = []
  for (const [dr, dc] of DIRECTIONS) {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const placed = canPlace(grid, word, r, c, dr, dc)
        if (placed) out.push(placed)
      }
    }
  }
  return out
}

type GridCellChange = { r: number; c: number; prev: string }

function applyPlacement(
  grid: string[][],
  word: string,
  placed: { r: number; c: number }[],
): GridCellChange[] {
  const changes: GridCellChange[] = []
  for (let i = 0; i < word.length; i++) {
    const cell = placed[i]!
    const prev = grid[cell.r]![cell.c]!
    changes.push({ r: cell.r, c: cell.c, prev })
    grid[cell.r]![cell.c] = word[i]!
  }
  return changes
}

function undoPlacement(grid: string[][], changes: GridCellChange[]) {
  for (const ch of changes) {
    grid[ch.r]![ch.c] = ch.prev
  }
}

function fillRandom(grid: string[][], rand: () => number) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
      if (grid[r]![c] === '') {
        grid[r]![c] = letters[Math.floor(rand() * letters.length)]!
      }
    }
  }
}

type PlaceItem = { n: string; i: number; display: string }

function backtrackPlace(
  items: PlaceItem[],
  idx: number,
  grid: string[][],
  rand: () => number,
  words: WordSearchEntry[],
): boolean {
  if (idx >= items.length) return true
  const item = items[idx]!
  const options = listPlacements(grid, item.n)
  shuffleInPlace(options, rand)
  for (const placed of options) {
    const changes = applyPlacement(grid, item.n, placed)
    words.push({
      id: `w-${item.i}`,
      display: item.display,
      normalized: item.n,
      cells: placed,
    })
    if (backtrackPlace(items, idx + 1, grid, rand, words)) return true
    words.pop()
    undoPlacement(grid, changes)
  }
  return false
}

function tryPlacePuzzle(
  entries: SearchWord[],
  rand: () => number,
): { rows: number; cols: number; grid: string[][]; words: WordSearchEntry[] } | null {
  const grid: string[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => ''),
  )
  const words: WordSearchEntry[] = []

  const order: PlaceItem[] = entries
    .map((e, i) => ({ n: e.normalized, i, display: e.display }))
    .sort((a, b) => b.n.length - a.n.length)

  if (!backtrackPlace(order, 0, grid, rand, words)) return null

  fillRandom(grid, rand)
  return { rows: GRID_ROWS, cols: GRID_COLS, grid, words }
}

export function buildWordSearchPuzzle(
  levelDef: WordSearchLevelDef,
  sessionKey: string,
): { rows: number; cols: number; grid: string[][]; words: WordSearchEntry[] } {
  const seed = sessionKey.split('').reduce((h, ch) => Math.imul(h, 31) + ch.charCodeAt(0), 0)
  const entries = drawBankWordsForPuzzle(levelDef.wordCount, sessionKey)

  for (let gen = 0; gen < 96; gen++) {
    const placeRand = mulberry32(seed + gen * 917 + 3)
    const result = tryPlacePuzzle(entries, placeRand)
    if (result) return result
  }

  throw new Error(
    `word-search: could not place ${levelDef.wordCount} words on ${GRID_ROWS}x${GRID_COLS}`,
  )
}