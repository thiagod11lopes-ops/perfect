import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  buildWordSearchPuzzle,
  normalizeWordSearchText,
} from '../data/wordSearchPuzzle'
import type { WordSearchLevelDef } from '../data/wordSearchLevels'
import { WORD_SEARCH_DEV_REVEAL } from '../lib/wordSearchDev'

type Props = {
  levelDef: WordSearchLevelDef
  sessionKey: string
  onWin: (reward: number) => void
}

type CellKey = string

function keyOf(r: number, c: number): CellKey {
  return `${r},${c}`
}

function lineFromSelection(
  cells: { r: number; c: number }[],
): { r: number; c: number }[] | null {
  if (cells.length === 0) return null
  if (cells.length === 1) return cells
  const [a, b] = cells
  const dr = Math.sign(b!.r - a!.r)
  const dc = Math.sign(b!.c - a!.c)
  if (dr === 0 && dc === 0) return cells
  for (let i = 2; i < cells.length; i++) {
    const prev = cells[i - 1]!
    const cur = cells[i]!
    if (cur.r - prev.r !== dr || cur.c - prev.c !== dc) return null
  }
  return cells
}

export function WordSearchBoard({ levelDef, sessionKey, onWin }: Props) {
  const puzzle = useMemo(
    () => buildWordSearchPuzzle(levelDef, sessionKey),
    [levelDef, sessionKey],
  )
  const [found, setFound] = useState<Set<string>>(() => new Set())
  const [activePath, setActivePath] = useState<{ r: number; c: number }[]>([])
  const [snapOn, setSnapOn] = useState(true)
  const [badFlash, setBadFlash] = useState<Set<CellKey>>(() => new Set())
  const [revealGlow, setRevealGlow] = useState<Set<CellKey>>(() => new Set())
  const dragging = useRef(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const revealTimerRef = useRef<number | null>(null)
  const [listFontPx, setListFontPx] = useState<number | null>(null)
  const onWinRef = useRef(onWin)
  const wonRef = useRef(false)
  onWinRef.current = onWin

  useEffect(() => {
    setFound(new Set())
    setActivePath([])
    setSnapOn(true)
    wonRef.current = false
    const t = window.setTimeout(() => setSnapOn(false), 1200 + puzzle.rows * puzzle.cols * 12)
    return () => window.clearTimeout(t)
  }, [puzzle, sessionKey])

  const gridMap = useMemo(() => {
    const m = new Map<CellKey, string>()
    puzzle.grid.forEach((row, r) =>
      row.forEach((ch, c) => {
        m.set(keyOf(r, c), ch)
      }),
    )
    return m
  }, [puzzle.grid])

  const foundCells = useMemo(() => {
    const s = new Set<CellKey>()
    for (const w of puzzle.words) {
      if (!found.has(w.id)) continue
      w.cells.forEach((c) => s.add(keyOf(c.r, c.c)))
    }
    return s
  }, [found, puzzle.words])

  const activeKeys = useMemo(
    () => new Set(activePath.map((c) => keyOf(c.r, c.c))),
    [activePath],
  )

  const tryComplete = useCallback(
    (path: { r: number; c: number }[]) => {
      const line = lineFromSelection(path)
      if (!line?.length) return
      const letters = line.map((c) => gridMap.get(keyOf(c.r, c.c)) ?? '').join('')
      const rev = letters.split('').reverse().join('')
      const match = puzzle.words.find(
        (w) =>
          !found.has(w.id) &&
          (w.normalized === letters || w.normalized === rev),
      )
      if (match) {
        const next = new Set(found)
        next.add(match.id)
        setFound(next)
        if (next.size >= puzzle.words.length && !wonRef.current) {
          wonRef.current = true
          window.setTimeout(() => onWinRef.current(levelDef.reward), 450)
        }
        return
      }
      const flash = new Set(line.map((c) => keyOf(c.r, c.c)))
      setBadFlash(flash)
      window.setTimeout(() => setBadFlash(new Set()), 380)
    },
    [found, gridMap, levelDef.reward, puzzle.words],
  )

  const appendCell = (r: number, c: number) => {
    setActivePath((prev) => {
      const exists = prev.some((p) => p.r === r && p.c === c)
      if (exists) return prev
      if (!prev.length) return [{ r, c }]
      const line = lineFromSelection([...prev, { r, c }])
      return line ?? prev
    })
  }

  const onPointerDown = (r: number, c: number) => {
    dragging.current = true
    setActivePath([{ r, c }])
  }

  const onPointerEnter = (r: number, c: number) => {
    if (!dragging.current) return
    appendCell(r, c)
  }

  const endDrag = () => {
    if (!dragging.current) return
    dragging.current = false
    tryComplete(activePath)
    setActivePath([])
  }

  useEffect(() => {
    const up = () => endDrag()
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  })

  useEffect(() => {
    const onReveal = () => {
      const s = new Set<CellKey>()
      for (const w of puzzle.words) {
        for (const cell of w.cells) {
          s.add(keyOf(cell.r, cell.c))
        }
      }
      setRevealGlow(s)
      if (revealTimerRef.current != null) {
        window.clearTimeout(revealTimerRef.current)
      }
      revealTimerRef.current = window.setTimeout(() => {
        setRevealGlow(new Set())
        revealTimerRef.current = null
      }, 2000)
    }
    window.addEventListener(WORD_SEARCH_DEV_REVEAL, onReveal)
    return () => {
      window.removeEventListener(WORD_SEARCH_DEV_REVEAL, onReveal)
      if (revealTimerRef.current != null) {
        window.clearTimeout(revealTimerRef.current)
        revealTimerRef.current = null
      }
    }
  }, [puzzle.words])

  const syncListFontToGrid = useCallback(() => {
    const grid = gridRef.current
    if (!grid) return
    const cell =
      grid.querySelector<HTMLElement>('.wordsearch-cell.is-settled') ??
      grid.querySelector<HTMLElement>('.wordsearch-cell')
    if (!cell) return
    const cs = getComputedStyle(cell)
    let px = parseFloat(cs.fontSize)
    if (!Number.isFinite(px)) return
    const tr = cs.transform
    if (tr && tr !== 'none') {
      const m = new DOMMatrix(tr)
      const scale = Math.hypot(m.a, m.b)
      if (scale > 0) px *= scale
    }
    const rounded = Math.round(px * 100) / 100
    setListFontPx((prev) => (prev === rounded ? prev : rounded))
  }, [])

  useLayoutEffect(() => {
    syncListFontToGrid()
    const grid = gridRef.current
    if (!grid) return
    const ro = new ResizeObserver(() => syncListFontToGrid())
    ro.observe(grid)
    const main = grid.closest<HTMLElement>('.wordsearch-main')
    if (main) ro.observe(main)
    window.addEventListener('resize', syncListFontToGrid)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', syncListFontToGrid)
    }
  }, [syncListFontToGrid, puzzle, sessionKey])

  useLayoutEffect(() => {
    if (snapOn) return
    const id = window.requestAnimationFrame(() => {
      syncListFontToGrid()
      window.setTimeout(syncListFontToGrid, 80)
    })
    return () => window.cancelAnimationFrame(id)
  }, [snapOn, syncListFontToGrid])

  const listLabelStyle =
    listFontPx != null
      ? ({
          fontSize: `${Math.round(listFontPx * 1.5 * 100) / 100}px`,
          lineHeight: 1,
        } as const)
      : undefined

  return (
    <div className="wordsearch-board">
      <header className="wordsearch-hud">
        <span className="wordsearch-hud-title">Caça-palavras</span>
        <span className="wordsearch-hud-meta">
          {found.size}/{puzzle.words.length} · +{levelDef.reward}
        </span>
      </header>
      <div className="wordsearch-main">
        <div
          ref={gridRef}
          className="wordsearch-grid"
          style={{
            gridTemplateColumns: `repeat(${puzzle.cols}, minmax(0, 1fr))`,
          }}
          role="grid"
        >
          {puzzle.grid.map((row, r) =>
            row.map((letter, c) => {
              const k = keyOf(r, c)
              const isActive = activeKeys.has(k)
              const isFound = foundCells.has(k)
              const isBad = badFlash.has(k)
              const isReveal = revealGlow.has(k)
              const chaos = snapOn ? (r * 31 + c * 17 + letter.charCodeAt(0)) % 4 : 0
              return (
                <button
                  key={k}
                  type="button"
                  className={`wordsearch-cell${isActive ? ' is-active' : ''}${isFound ? ' is-found' : ''}${isBad ? ' is-bad' : ''}${isReveal ? ' is-reveal' : ''}${snapOn ? ` is-chaos-${chaos}` : ' is-settled'}`}
                  style={{ ['--ws-delay' as string]: `${(r * puzzle.cols + c) * 18}ms` }}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    onPointerDown(r, c)
                  }}
                  onPointerEnter={() => onPointerEnter(r, c)}
                  aria-label={letter}
                >
                  {letter}
                </button>
              )
            }),
          )}
        </div>
        <ul className="wordsearch-list" aria-label="Palavras">
          {puzzle.words.map((w) => (
            <li
              key={w.id}
              className={`wordsearch-list-item${found.has(w.id) ? ' is-done' : ''}`}
              style={listLabelStyle}
            >
              <span
                className="wordsearch-list-check"
                aria-hidden
                style={listLabelStyle}
              >
                {found.has(w.id) ? '✓' : '·'}
              </span>
              <span style={listLabelStyle}>{w.display}</span>
              <span className="wordsearch-list-norm" aria-hidden>
                {normalizeWordSearchText(w.display)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}