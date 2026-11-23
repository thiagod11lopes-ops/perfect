import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getMemoryMatchExercisePool } from '../data/exerciseDemos'
import {
  MEMORY_MATCH_DURATION_SEC,
  type MemoryLevelDef,
  type MemoryMatchLevel,
} from '../data/memoryMatchLevels'
import { MemoryMatchCountdown } from './MemoryMatchCountdown'
import { MemoryMatchMatchCelebration } from './MemoryMatchMatchCelebration'

/** Após o 2º flip (0.58s): 0,5s sem X → X ~2s → volta face baixa. */
const MEMORY_MISMATCH_FLIP_MS = 580
const MEMORY_MISMATCH_PRE_X_MS = 500
const MEMORY_MISMATCH_MARK_MS = 2000
const MEMORY_MISMATCH_REVEAL_MS = MEMORY_MISMATCH_FLIP_MS + MEMORY_MISMATCH_PRE_X_MS
const MEMORY_MATCH_CELEBRATION_MS = 2000

type Card = {
  uid: string
  pairKey: string
  title: string
  faceSrc: string
  faceMedia: 'video'
  faceUp: boolean
  matched: boolean
}

type Phase = 'countdown' | 'play' | 'won' | 'failed'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function buildDeck(level: MemoryLevelDef, seed: number): Card[] {
  const pool = getMemoryMatchExercisePool()
  const shuffled = shuffle(pool)
  let pickIdx = 0
  const nextEx = () => {
    const ex = shuffled[pickIdx % Math.max(shuffled.length, 1)] ?? pool[0]!
    pickIdx += 1
    return ex
  }

  const cards: Card[] = []

  if (level.tripleCount) {
    const ex = nextEx()
    for (let k = 0; k < 3; k++) {
      cards.push({
        uid: `${seed}-triple-${k}`,
        pairKey: 'triple0',
        title: ex.title,
        faceSrc: ex.faceSrc,
        faceMedia: ex.faceMedia,
        faceUp: false,
        matched: false,
      })
    }
  }

  for (let p = 0; p < level.pairCount; p++) {
    const ex = nextEx()
    const pairKey = `p${p}`
    for (const suffix of ['a', 'b'] as const) {
      cards.push({
        uid: `${seed}-${pairKey}-${suffix}`,
        pairKey,
        title: ex.title,
        faceSrc: ex.faceSrc,
        faceMedia: ex.faceMedia,
        faceUp: false,
        matched: false,
      })
    }
  }

  return shuffle(cards)
}

type Props = {
  level: MemoryMatchLevel
  levelDef: MemoryLevelDef
  boardKey: number
  onWin: (level: MemoryMatchLevel) => void
  onRetry: () => void
  onExit: () => void
}

export function MemoryMatchBoard({
  level,
  levelDef,
  boardKey,
  onWin,
  onRetry,
  onExit,
}: Props) {
  const [phase, setPhase] = useState<Phase>('countdown')
  const [cards, setCards] = useState<Card[]>(() => buildDeck(levelDef, boardKey))
  const [timeLeftMs, setTimeLeftMs] = useState(MEMORY_MATCH_DURATION_SEC * 1000)
  const [lockFlips, setLockFlips] = useState(true)
  const [mismatchPair, setMismatchPair] = useState<[string, string] | null>(null)
  const [mismatchMarksVisible, setMismatchMarksVisible] = useState(false)
  const pendingFlip = useRef<string[]>([])
  const mismatchShowTimer = useRef<number | null>(null)
  const mismatchResolveTimer = useRef<number | null>(null)
  const matchCelebrateTimer = useRef<number | null>(null)
  const [matchCelebrationKey, setMatchCelebrationKey] = useState(0)
  const wonReported = useRef(false)
  const onWinRef = useRef(onWin)
  onWinRef.current = onWin

  const clearMatchCelebrateTimer = useCallback(() => {
    if (matchCelebrateTimer.current !== null) {
      window.clearTimeout(matchCelebrateTimer.current)
      matchCelebrateTimer.current = null
    }
  }, [])

  const clearMismatchTimers = useCallback(() => {
    if (mismatchShowTimer.current !== null) {
      window.clearTimeout(mismatchShowTimer.current)
      mismatchShowTimer.current = null
    }
    if (mismatchResolveTimer.current !== null) {
      window.clearTimeout(mismatchResolveTimer.current)
      mismatchResolveTimer.current = null
    }
  }, [])

  useEffect(() => {
    setCards(buildDeck(levelDef, boardKey))
    setPhase('countdown')
    setTimeLeftMs(MEMORY_MATCH_DURATION_SEC * 1000)
    setLockFlips(true)
    setMismatchPair(null)
    setMismatchMarksVisible(false)
    pendingFlip.current = []
    wonReported.current = false
    setMatchCelebrationKey(0)
    clearMismatchTimers()
    clearMatchCelebrateTimer()
  }, [levelDef, boardKey, clearMismatchTimers, clearMatchCelebrateTimer])

  const matchedAll = useMemo(() => cards.length > 0 && cards.every((c) => c.matched), [cards])

  useEffect(() => {
    if (phase !== 'play' || matchedAll) return
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = now - t0
      const remain = Math.max(0, MEMORY_MATCH_DURATION_SEC * 1000 - elapsed)
      setTimeLeftMs(remain)
      if (remain <= 0) {
        setPhase('failed')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, boardKey, matchedAll])

  useEffect(() => {
    if (phase !== 'play' || !matchedAll || wonReported.current) return
    wonReported.current = true
    const levelWon = level
    const winTimer = window.setTimeout(() => {
      setPhase('won')
      onWinRef.current(levelWon)
    }, MEMORY_MATCH_CELEBRATION_MS)
    return () => window.clearTimeout(winTimer)
  }, [phase, matchedAll, level])

  const onCountdownDone = useCallback(() => {
    setPhase('play')
    setLockFlips(false)
  }, [])

  const flipCard = (uid: string) => {
    if (lockFlips || phase !== 'play') return
    const target = cards.find((c) => c.uid === uid)
    if (!target || target.faceUp || target.matched) return
    if (pendingFlip.current.length >= 2) return

    const next = cards.map((c) => (c.uid === uid ? { ...c, faceUp: true } : c))
    pendingFlip.current.push(uid)
    setCards(next)

    if (pendingFlip.current.length < 2) return

    setLockFlips(true)
    const [a, b] = pendingFlip.current
    const ca = next.find((c) => c.uid === a)!
    const cb = next.find((c) => c.uid === b)!
    if (ca.pairKey === cb.pairKey) {
      pendingFlip.current = []
      const matchedKey = ca.pairKey
      clearMismatchTimers()
      setMismatchPair(null)
      setMismatchMarksVisible(false)
      setCards((prev) =>
        prev.map((c) =>
          c.pairKey === matchedKey
            ? { ...c, matched: true, faceUp: true }
            : c,
        ),
      )
      clearMatchCelebrateTimer()
      setMatchCelebrationKey(Date.now())
      matchCelebrateTimer.current = window.setTimeout(() => {
        setMatchCelebrationKey(0)
        setLockFlips(false)
        matchCelebrateTimer.current = null
      }, MEMORY_MATCH_CELEBRATION_MS)
      return
    }

    setMismatchPair([a, b])
    setMismatchMarksVisible(false)
    clearMismatchTimers()
    mismatchShowTimer.current = window.setTimeout(() => {
      setMismatchMarksVisible(true)
      mismatchShowTimer.current = null
    }, MEMORY_MISMATCH_REVEAL_MS)
    mismatchResolveTimer.current = window.setTimeout(() => {
      setMismatchMarksVisible(false)
      setMismatchPair(null)
      setCards((prev) =>
        prev.map((c) =>
          c.uid === a || c.uid === b ? { ...c, faceUp: false } : c,
        ),
      )
      pendingFlip.current = []
      setLockFlips(false)
      mismatchResolveTimer.current = null
    }, MEMORY_MISMATCH_REVEAL_MS + MEMORY_MISMATCH_MARK_MS)
  }

  const showMismatchMark = (uid: string) =>
    mismatchMarksVisible && mismatchPair !== null && (mismatchPair[0] === uid || mismatchPair[1] === uid)

  useEffect(
    () => () => {
      clearMismatchTimers()
      clearMatchCelebrateTimer()
    },
    [clearMismatchTimers, clearMatchCelebrateTimer],
  )

  const sec = Math.ceil(timeLeftMs / 1000)

  return (
    <div
      className="memory-match-board"
      data-level={level}
      data-cards={levelDef.cards}
    >
      <header className="memory-match-hud">
        <span className="memory-match-hud-level">
          Nível {level} · {levelDef.cards} cartas
          {levelDef.tripleCount ? ' · tripla' : ''}
        </span>
        <span className={`memory-match-hud-time${sec <= 10 ? ' is-urgent' : ''}`}>{sec}s</span>
        <span className="memory-match-hud-reward">+{levelDef.reward}</span>
      </header>

      <div className="memory-match-grid deck-grid">
        {cards.map((card) => (
          <button
            key={card.uid}
            type="button"
            className={`memory-match-card deck-card${card.faceUp || card.matched ? ' is-face' : ' is-back'}${card.matched ? ' is-matched' : ''}`}
            onClick={() => flipCard(card.uid)}
            disabled={lockFlips || phase !== 'play' || card.matched}
            aria-label={card.faceUp || card.matched ? card.title : 'Carta virada'}
          >
            <div className="deck-card-shell memory-match-card-shell memory-match-flip-scene">
              <div
                className={`memory-match-flip-inner${card.faceUp || card.matched ? ' is-flipped' : ''}`}
              >
                <div className="memory-match-flip-face memory-match-flip-face--back deck-card-back memory-match-back">
                  <div className="deck-back-pattern" aria-hidden />
                  <img src="/card-seal.webp" alt="" className="memory-match-seal deck-back-logo" />
                </div>
                <div className="memory-match-flip-face memory-match-flip-face--front memory-match-face">
                  <video
                    className="memory-match-video"
                    src={card.faceSrc}
                    autoPlay={card.faceUp || card.matched}
                    loop
                    muted
                    playsInline
                    preload="metadata"
                  />
                </div>
              </div>
              {showMismatchMark(card.uid) ? (
                <div className="memory-match-card-x" aria-hidden>
                  <svg
                    className="memory-match-card-x-svg"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <line
                      className="memory-match-card-x-line memory-match-card-x-line--a"
                      x1="0"
                      y1="0"
                      x2="100"
                      y2="100"
                    />
                    <line
                      className="memory-match-card-x-line memory-match-card-x-line--b"
                      x1="100"
                      y1="0"
                      x2="0"
                      y2="100"
                    />
                  </svg>
                  <div className="memory-match-card-x-sheen" />
                </div>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {matchCelebrationKey > 0 ? (
        <MemoryMatchMatchCelebration burstKey={matchCelebrationKey} />
      ) : null}

      <MemoryMatchCountdown active={phase === 'countdown'} onDone={onCountdownDone} />

      {phase === 'failed' ? (
        <div className="memory-match-over" role="dialog" aria-labelledby="memory-fail-title">
          <article className="game-over-card memory-match-over-card">
            <h1 id="memory-fail-title" className="game-over-title">
              TEMPO ESGOTADO
            </h1>
            <div className="game-over-actions">
              <button type="button" className="game-over-btn game-over-btn--primary" onClick={onRetry}>
                Tentar novamente
              </button>
              <button type="button" className="game-over-btn game-over-btn--ghost" onClick={onExit}>
                Sair
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  )
}