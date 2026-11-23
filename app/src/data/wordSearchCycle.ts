import { WORD_SEARCH_BANK } from './wordSearchBank'
import { normalizeWordSearchText } from './wordSearchText'

const CYCLE_STORAGE_KEY = 'zero-ao-topo-word-search-cycle-v1'
const PUZZLE_CACHE_KEY = 'zero-ao-topo-word-search-puzzle-words-v1'

export type SearchWord = { display: string; normalized: string }

type CycleState = {
  used: string[]
  queue: string[]
  queueIndex: number
}

type PuzzleCache = Record<string, string[]>

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleBank(seed: number): string[] {
  const rand = mulberry32(seed)
  const arr = [...WORD_SEARCH_BANK]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return arr
}

function storage(): Storage | null {
  return typeof localStorage !== 'undefined' ? localStorage : null
}

function loadCycle(): CycleState {
  const ls = storage()
  if (!ls) return { used: [], queue: shuffleBank(0x9e3779b1), queueIndex: 0 }
  try {
    const raw = ls.getItem(CYCLE_STORAGE_KEY)
    if (!raw) return { used: [], queue: shuffleBank(0x9e3779b1), queueIndex: 0 }
    const parsed = JSON.parse(raw) as Partial<CycleState>
    return {
      used: Array.isArray(parsed.used) ? parsed.used : [],
      queue: Array.isArray(parsed.queue) ? parsed.queue : shuffleBank(0x9e3779b1),
      queueIndex: typeof parsed.queueIndex === 'number' ? parsed.queueIndex : 0,
    }
  } catch {
    return { used: [], queue: shuffleBank(0x9e3779b1), queueIndex: 0 }
  }
}

function saveCycle(state: CycleState) {
  storage()?.setItem(CYCLE_STORAGE_KEY, JSON.stringify(state))
}

function loadPuzzleCache(): PuzzleCache {
  const ls = storage()
  if (!ls) return {}
  try {
    const raw = ls.getItem(PUZZLE_CACHE_KEY)
    return raw ? (JSON.parse(raw) as PuzzleCache) : {}
  } catch {
    return {}
  }
}

function savePuzzleCache(cache: PuzzleCache) {
  storage()?.setItem(PUZZLE_CACHE_KEY, JSON.stringify(cache))
}

function fitsGrid(display: string): boolean {
  return normalizeWordSearchText(display).length <= 10
}

function resetCycleFresh(state: CycleState, seed: number) {
  state.used = []
  state.queue = shuffleBank(seed)
  state.queueIndex = 0
}

/** Palavras que cabem na grade ≤10 letras (normalizadas). */
function asSearchWord(display: string): SearchWord {
  return { display, normalized: normalizeWordSearchText(display) }
}

/**
 * Sorteia `wordCount` palavras do ciclo (sem repetir até esgotar o banco).
 * Nomes longos (>10 na grade) são ignorados sem marcar como usados.
 */
export function drawBankWordsForPuzzle(wordCount: number, sessionKey: string): SearchWord[] {
  const cache = loadPuzzleCache()
  const cached = cache[sessionKey]
  if (cached?.length) {
    return cached.map(asSearchWord)
  }

  const seed = sessionKey.split('').reduce((h, ch) => Math.imul(h, 31) + ch.charCodeAt(0), 0)
  const state = loadCycle()
  const picked: SearchWord[] = []

  const pullNext = (): boolean => {
    if (picked.length >= wordCount) return true
    let guard = 0
    const maxGuard = WORD_SEARCH_BANK.length * 3 + 8
    while (picked.length < wordCount && guard < maxGuard) {
      guard++
      if (state.queueIndex >= state.queue.length) {
        return false
      }
      const display = state.queue[state.queueIndex]!
      state.queueIndex++
      if (state.used.includes(display)) continue
      if (!fitsGrid(display)) continue
      state.used.push(display)
      picked.push(asSearchWord(display))
    }
    return picked.length >= wordCount
  }

  if (!pullNext()) {
    resetCycleFresh(state, seed ^ 0x85ebca6b)
    while (!pullNext()) {
      resetCycleFresh(state, seed ^ Math.imul(state.used.length + 1, 0x27d4eb2d))
      if (picked.length >= wordCount) break
    }
  }

  saveCycle(state)
  cache[sessionKey] = picked.map((w) => w.display)
  savePuzzleCache(cache)
  return picked
}

export function wordSearchCycleStats() {
  const state = loadCycle()
  return {
    bankSize: WORD_SEARCH_BANK.length,
    usedCount: state.used.length,
    remainingInQueue: Math.max(0, state.queue.length - state.queueIndex),
  }
}