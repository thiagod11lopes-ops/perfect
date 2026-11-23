import { nanoid } from 'nanoid'
import {
  MIN_MATCH_SEQUENCE_NUMBER,
  REELS_NUMBER,
  ROW_NUMBER,
  SYMBOLS_METADATA,
} from '@/game-configs'
import { getScreenResult } from '@/game-utils'
import { Symbol, SymbolType } from '@/types'

export type HorizontalMatchLength = 0 | 1 | 2 | 3 | 4 | 5

/** Ícones que aparecem nos rolos (inclui moedas e kettlebell, não wildcard). */
const EMBED_REEL_SYMBOLS: readonly SymbolType[] = (
  Object.entries(SYMBOLS_METADATA) as [SymbolType, (typeof SYMBOLS_METADATA)[SymbolType]][]
)
  .filter(([, meta]) => (meta.frequency ?? 0) > 0)
  .map(([type]) => type)

function symbolOf(type: SymbolType): Symbol {
  const meta = SYMBOLS_METADATA[type]
  return { ...meta, id: nanoid() }
}

function pickRandomSymbolType(pool: readonly SymbolType[]): SymbolType {
  return pool[Math.floor(Math.random() * pool.length)] ?? SymbolType.REACT
}

function pickWinAndBreakTypes(): { winType: SymbolType; breakType: SymbolType } {
  const winType = pickRandomSymbolType(EMBED_REEL_SYMBOLS)
  const breakPool = EMBED_REEL_SYMBOLS.filter((t) => t !== winType)
  const breakType =
    breakPool.length > 0 ? pickRandomSymbolType(breakPool) : SymbolType.REDUX
  return { winType, breakType }
}

const LOSS_ROW_SYMBOLS: SymbolType[][] = [
  [SymbolType.REACT, SymbolType.REDUX, SymbolType.VUE, SymbolType.ANGULAR, SymbolType.MOBX],
  [SymbolType.VUE, SymbolType.PINIA, SymbolType.REACT, SymbolType.MOBX, SymbolType.REDUX],
  [SymbolType.MOBX, SymbolType.ANGULAR, SymbolType.PINIA, SymbolType.VUE, SymbolType.REACT],
]

const FILLER: SymbolType[] = [
  SymbolType.PINIA,
  SymbolType.PIXIJS,
  SymbolType.CYPRESS,
  SymbolType.JEST,
]

function fillerSymbol(reel: number, row: number, avoid: Iterable<SymbolType>): Symbol {
  const avoidSet = new Set(avoid)
  const pick = FILLER[(reel + row * 3) % FILLER.length]
  if (!avoidSet.has(pick)) return symbolOf(pick)
  return symbolOf(FILLER[(reel + 1) % FILLER.length])
}

function buildPayRowScreen(
  rowIndex: number,
  matchLen: number,
  paysWin: boolean,
  winType: SymbolType,
  breakType: SymbolType,
): Symbol[][] {
  const screen: Symbol[][] = []
  for (let reel = 0; reel < REELS_NUMBER; reel++) {
    const col: Symbol[] = []
    for (let row = 0; row < ROW_NUMBER; row++) {
      if (row === rowIndex) {
        if (reel < matchLen) {
          col.push(symbolOf(winType))
        } else if (reel === matchLen) {
          col.push(symbolOf(breakType))
        } else {
          col.push(symbolOf(LOSS_ROW_SYMBOLS[row][reel]))
        }
      } else {
        col.push(fillerSymbol(reel, row, [winType, breakType]))
      }
    }
    screen.push(col)
  }

  if (import.meta.env.DEV) {
    const result = getScreenResult(screen)
    if (paysWin && !result.winPayLines.length) {
      console.warn('[perfect-embed] tela vencedora sem payline', {
        matchLen,
        rowIndex,
        winType,
      })
    }
    if (!paysWin && result.winPayLines.length) {
      console.warn('[perfect-embed] tela de perda com payline', { matchLen, rowIndex })
    }
  }

  return screen
}

/**
 * Grade 5×3 alinhada às paylines horizontais (PL_2, PL_1, PL_3).
 * `horizontalMatch` = quantos símbolos iguais na mesma linha, da esquerda para a direita.
 * Símbolo vencedor é sorteado entre todos os ícones dos rolos a cada chamada.
 */
export function buildPerfectEmbedScreen(
  horizontalMatch: HorizontalMatchLength,
  payRow: number,
): Symbol[][] {
  const rowIndex = ((payRow % ROW_NUMBER) + ROW_NUMBER) % ROW_NUMBER

  if (horizontalMatch <= 0) {
    const screen: Symbol[][] = []
    for (let reel = 0; reel < REELS_NUMBER; reel++) {
      const col: Symbol[] = []
      for (let row = 0; row < ROW_NUMBER; row++) {
        col.push(symbolOf(LOSS_ROW_SYMBOLS[row][reel]))
      }
      screen.push(col)
    }
    return screen
  }

  const { winType, breakType } = pickWinAndBreakTypes()

  if (horizontalMatch < MIN_MATCH_SEQUENCE_NUMBER) {
    return buildPayRowScreen(rowIndex, horizontalMatch, false, winType, breakType)
  }

  const matchLen = Math.min(5, Math.max(MIN_MATCH_SEQUENCE_NUMBER, horizontalMatch))
  return buildPayRowScreen(rowIndex, matchLen, true, winType, breakType)
}