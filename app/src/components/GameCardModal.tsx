import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { EXPAND_MS, FLIP_MS, type CardOrigin } from './ExpandFlipShell'
import { CoinIcon } from './CoinIcon'
import { DayGameEmbed } from './DayGameEmbed'
import type { DayCard } from '../data/types'
import type { SpecialRouletteOutcome } from '../data/specialCardRoulette'
import { gameIdFromChallengeId } from '../data/dayGames'
import type { RoulettePhase } from './SpecialCardRoulette'
import type { WorkoutVisionPhase } from './SpecialCardWorkoutVision'
import type { WorkoutVisionCompletePayload } from './WorkoutVisionEmbed'
import type { NeonophisPhase } from './SpecialCardNeonophis'
import type { MemoryMatchPhase, MemoryMatchWinPayload } from './SpecialCardMemoryMatch'
import type { WordSearchWinPayload } from './SpecialCardWordSearch'
import type { QuizWinPayload } from './SpecialCardQuiz'
import type { WordSearchLevel } from '../data/wordSearchLevels'
import type { NeonophisCompletePayload } from './NeonophisEmbed'
import { formatCoins } from '../utils/format'
import { PageCoinsChip } from './CoinsDisplay'
import { DayChallengeBackArt } from './DayChallengeBackArt'

type GameCardModalProps = {
  card: DayCard
  index: number
  locked: boolean
  busy?: boolean
  balance: number
  /** Remonta roleta ao mudar relógio DEV / status da carta. */
  playSessionKey: string
  devGameCardReplayEpoch?: number
  onClose: () => void
  onGameSettled: (outcome: SpecialRouletteOutcome) => void
  onPotStakeLocked?: (stake: import('../data/specialCardRoulette').SpecialRouletteStake) => void
  onRouletteCelebratingChange?: (active: boolean) => void
  /** Chip global de moedas (fora do modal). */
  onMainWalletSync?: (value: number) => void
  workoutVisionExercise?: { label: string; lift: string }
  sleepDeadlineLabel?: string
  onWorkoutVisionComplete?: (payload: WorkoutVisionCompletePayload) => void
  onNeonophisComplete?: (payload: NeonophisCompletePayload) => void
  onNeonophisWinReward?: (
    payload: import('./PerfectSnakeEmbed').PerfectSnakeWinRewardPayload,
  ) => void
  onMemoryMatchWin?: (payload: MemoryMatchWinPayload) => void
  wordSearchLevel?: WordSearchLevel | null
  onWordSearchLevelPick?: (level: WordSearchLevel) => void
  onWordSearchWin?: (payload: WordSearchWinPayload) => void
  onQuizWin?: (payload: QuizWinPayload) => void
  /** Origem da carta no baralho (mesmo flip expand + rotateY da rotina). */
  openOrigin: CardOrigin
}

/** Modal do minijogo: cabeçalho + moedas + roleta. */
export function GameCardModal({
  card,
  index,
  locked,
  busy = false,
  balance,
  playSessionKey,
  devGameCardReplayEpoch,
  onClose,
  onGameSettled,
  onPotStakeLocked,
  onRouletteCelebratingChange,
  onMainWalletSync,
  workoutVisionExercise,
  sleepDeadlineLabel,
  onWorkoutVisionComplete,
  onNeonophisComplete,
  onNeonophisWinReward,
  onMemoryMatchWin,
  wordSearchLevel = null,
  onWordSearchLevelPick,
  onWordSearchWin,
  onQuizWin,
  openOrigin,
}: GameCardModalProps) {
  const [rouletteBusy, setRouletteBusy] = useState(false)
  const [wvBusy, setWvBusy] = useState(false)
  const [skillBusy, setSkillBusy] = useState(false)
  const [roulettePhase, setRoulettePhase] = useState<RoulettePhase>('loading')
  const [wvPhase, setWvPhase] = useState<WorkoutVisionPhase>('intro')
  const [skillPhase, setSkillPhase] = useState<NeonophisPhase>('intro')
  const [memoryPhase, setMemoryPhase] = useState<MemoryMatchPhase>('intro')
  const [memoryBusy, setMemoryBusy] = useState(false)
  const [wordSearchBusy, setWordSearchBusy] = useState(false)
  const [quizBusy, setQuizBusy] = useState(false)
  const [flipUnflipping, setFlipUnflipping] = useState(false)
  const [flipShrinking, setFlipShrinking] = useState(false)
  const [flipOpenExpanded, setFlipOpenExpanded] = useState(false)
  const [flipFaceFlipped, setFlipFaceFlipped] = useState(false)
  const [shownCoins, setShownCoins] = useState(balance)
  const flipCloseStarted = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const gameId = gameIdFromChallengeId(card.challengeId)
  const isRouletteCard = gameId === 'slot-machine'
  const isWorkoutVisionCard = gameId === 'workout-vision'
  const isSkillCard = gameId === 'neonophis'
  const isMemoryCard = gameId === 'memory-match'
  const isWordSearchCard = gameId === 'word-search'
  const isQuizCard = gameId === 'quiz'
  const flipBackLabel = isWorkoutVisionCard ? 'Desafio do dia' : 'Moedas extras'
  const skillEmbedActive =
    (isSkillCard && skillPhase === 'embed') ||
    (isMemoryCard && memoryPhase === 'play') ||
    (isWordSearchCard && !!wordSearchLevel) ||
    isQuizCard
  const modalBusy = busy || rouletteBusy || wvBusy || skillBusy || memoryBusy || wordSearchBusy || quizBusy
  const pocketGameHeader = isWordSearchCard || isQuizCard
  const pocketGameTitle = isQuizCard ? 'Quiz' : 'Caça palavras'

  useEffect(() => {
    setShownCoins(balance)
  }, [balance])

  useEffect(() => {
    setRouletteBusy(false)
    setWvBusy(false)
    setSkillBusy(false)
    setRoulettePhase('loading')
    setWvPhase('intro')
    setSkillPhase('intro')
    setMemoryPhase('intro')
    setMemoryBusy(false)
    setWordSearchBusy(false)
    setQuizBusy(false)
    setFlipUnflipping(false)
    setFlipShrinking(false)
    setFlipOpenExpanded(false)
    setFlipFaceFlipped(false)
    flipCloseStarted.current = false
  }, [card.challengeId, devGameCardReplayEpoch])

  useEffect(() => {
    setFlipUnflipping(false)
    setFlipShrinking(false)
    setFlipOpenExpanded(false)
    setFlipFaceFlipped(false)
    flipCloseStarted.current = false

    let raf2 = 0
    let flipTimer = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setFlipOpenExpanded(true))
    })
    flipTimer = window.setTimeout(() => setFlipFaceFlipped(true), EXPAND_MS + 30)
    return () => {
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)
      window.clearTimeout(flipTimer)
    }
  }, [card.challengeId, devGameCardReplayEpoch])

  const beginAnimatedClose = useCallback(() => {
    if (modalBusy || flipCloseStarted.current) return
    flipCloseStarted.current = true
    setQuizBusy(false)
    setFlipUnflipping(true)
  }, [modalBusy])

  const handleQuizLoseFromQuiz = useCallback(() => {
    beginAnimatedClose()
  }, [beginAnimatedClose])

  useEffect(() => {
    if (!flipUnflipping) return
    let shrinkTimer = 0
    let closeTimer = 0
    shrinkTimer = window.setTimeout(() => {
      setFlipShrinking(true)
      setFlipOpenExpanded(false)
    }, FLIP_MS)
    closeTimer = window.setTimeout(() => {
      onCloseRef.current()
    }, FLIP_MS + EXPAND_MS + 40)
    return () => {
      window.clearTimeout(shrinkTimer)
      window.clearTimeout(closeTimer)
    }
  }, [flipUnflipping])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.info('[game-card-modal] open', {
      playSessionKey,
      cardStatus: card.status,
      balance,
      gamePlayEpoch: card.gamePlayEpoch,
      gameSettleNet: card.gameSettleNet,
      locked,
    })
  }, [playSessionKey, card.status, card.gamePlayEpoch, card.gameSettleNet, balance, locked])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !modalBusy) beginAnimatedClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalBusy, beginAnimatedClose])

  const flipAtDeckOrigin =
    (!flipOpenExpanded && !flipUnflipping && !flipShrinking) || flipShrinking

  const flipSceneStyle: CSSProperties | undefined = flipAtDeckOrigin
    ? {
        top: openOrigin.top,
        left: openOrigin.left,
        width: openOrigin.width,
        height: openOrigin.height,
      }
    : undefined

  const panelClassName = [
    'game-card-modal-panel',
    skillEmbedActive || isMemoryCard || isWordSearchCard ? '' : 'game-card-modal-panel--compact',
    'game-card-modal-panel--game',
    isRouletteCard ? 'game-card-modal-panel--roleta' : '',
    isRouletteCard && roulettePhase === 'slot' ? 'game-card-modal-panel--roleta-slot' : '',
    isRouletteCard && roulettePhase === 'pick' ? 'game-card-modal-panel--roleta-pick' : '',
    isRouletteCard && roulettePhase === 'loading' ? 'game-card-modal-panel--roleta-loading' : '',
    isWorkoutVisionCard ? 'game-card-modal-panel--workout-vision' : '',
    isWorkoutVisionCard && wvPhase === 'embed' ? 'game-card-modal-panel--workout-vision-embed' : '',
    isSkillCard || isMemoryCard || isWordSearchCard || isQuizCard
      ? 'game-card-modal-panel--neonophis'
      : '',
    isMemoryCard || isWordSearchCard || isQuizCard
      ? 'game-card-modal-panel--memory-match'
      : '',
    isWordSearchCard ? 'game-card-modal-panel--word-search' : '',
    isQuizCard ? 'game-card-modal-panel--quiz' : '',
    skillEmbedActive ? 'game-card-modal-panel--neonophis-embed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const panelDataAttrs = {
    'data-roulette-phase': isRouletteCard ? roulettePhase : undefined,
    'data-wv-phase': isWorkoutVisionCard ? wvPhase : undefined,
    'data-skill-phase': isSkillCard ? skillPhase : undefined,
  }

  const panelInner = (
    <>
        <header
          className={[
            'game-card-modal-head',
            isWordSearchCard ? 'game-card-modal-head--word-search' : '',
            isQuizCard ? 'game-card-modal-head--quiz' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {pocketGameHeader ? (
            <>
              <h2
                className={`display h2 ${
                  isQuizCard ? 'game-card-modal-quiz-title' : 'game-card-modal-wordsearch-title'
                }`}
              >
                {pocketGameTitle}
              </h2>
              <PageCoinsChip
                className={
                  isQuizCard ? 'game-card-modal-quiz-coins' : 'game-card-modal-wordsearch-coins'
                }
              />
              <div className="game-card-modal-actions">
                <button
                  type="button"
                  className="game-card-modal-close"
                  onClick={beginAnimatedClose}
                  disabled={modalBusy}
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="game-card-modal-copy">
                <p className="eyebrow game-card-modal-eyebrow">
                  Carta {String(index + 1).padStart(2, '0')} · especial
                  {locked ? ' · fora da janela' : ''}
                </p>
                <h2 className="display h2 game-card-modal-title">{card.title}</h2>
              </div>

              <div
                className="game-card-modal-coins"
                aria-label={`${formatCoins(shownCoins)} moedinhas`}
              >
                <CoinIcon />
                <strong>{formatCoins(shownCoins)}</strong>
              </div>

              <div className="game-card-modal-actions">
                <button
                  type="button"
                  className="game-card-modal-close"
                  onClick={beginAnimatedClose}
                  disabled={modalBusy}
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            </>
          )}
        </header>

        <div className="game-card-modal-body game-card-modal-body--game">
          <DayGameEmbed
            challengeId={card.challengeId}
            balance={balance}
            sessionKey={playSessionKey}
            phaseBusy={rouletteBusy}
            debugContext={{
              sessionKey: playSessionKey,
              cardStatus: card.status,
              gamePlayEpoch: card.gamePlayEpoch,
              devGameCardReplayEpoch,
              windowLocked: locked,
            }}
            missionTitle={card.title}
            onPotStakeLocked={onPotStakeLocked}
            onCelebratingChange={onRouletteCelebratingChange}
            onWalletDisplay={(value) => {
              setShownCoins(value)
              onMainWalletSync?.(value)
            }}
            onRoulettePhaseChange={setRoulettePhase}
            onSettled={onGameSettled}
            workoutVisionExercise={workoutVisionExercise}
            sleepDeadlineLabel={sleepDeadlineLabel}
            onWorkoutVisionPhaseChange={setWvPhase}
            onWorkoutVisionComplete={onWorkoutVisionComplete}
            onWorkoutVisionDefer={beginAnimatedClose}
            neonophisPhase={skillPhase}
            onNeonophisPhaseChange={(next) => {
              setSkillPhase(next)
              if (isSkillCard) setSkillBusy(next === 'embed')
            }}
            onNeonophisComplete={onNeonophisComplete}
            onNeonophisWinReward={onNeonophisWinReward}
            onNeonophisExit={beginAnimatedClose}
            memoryMatchPhase={memoryPhase}
            onMemoryMatchPhaseChange={(next) => {
              setMemoryPhase(next)
              if (isMemoryCard) setMemoryBusy(next === 'play')
            }}
            onMemoryMatchWin={onMemoryMatchWin}
            onMemoryMatchExit={beginAnimatedClose}
            wordSearchLevel={wordSearchLevel}
            onWordSearchLevelPick={onWordSearchLevelPick}
            onWordSearchWin={onWordSearchWin}
            onQuizWin={onQuizWin}
            onQuizLose={handleQuizLoseFromQuiz}
            onBusyChange={(next) => {
              if (isWorkoutVisionCard) setWvBusy(next)
              else if (isSkillCard) setSkillBusy(next)
              else if (isMemoryCard) setMemoryBusy(next)
              else if (isWordSearchCard) setWordSearchBusy(next)
              else if (isQuizCard) setQuizBusy(next)
              else setRouletteBusy(next)
            }}
          />
        </div>
    </>
  )

  return (
    <div
      className="game-card-modal"
      role="dialog"
      aria-modal="true"
      aria-label={card.title}
    >
      <button
        type="button"
        className="game-card-modal-backdrop"
        aria-label="Fechar"
        onClick={() => {
          if (!modalBusy) beginAnimatedClose()
        }}
      />
      <div
        className={[
          'game-card-modal-quiz-flip-scene',
          flipAtDeckOrigin ? 'is-from-origin' : 'is-expanded',
          flipOpenExpanded ? 'is-open-ready' : '',
          flipFaceFlipped && !flipUnflipping ? 'is-face-open' : '',
          flipUnflipping ? 'is-unflipping' : '',
          flipShrinking ? 'is-shrinking' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={flipSceneStyle}
      >
        <div
          className={`game-card-modal-quiz-flip-inner${
            flipFaceFlipped && !flipUnflipping ? ' is-flipped' : ''
          }`}
        >
          <div className="game-card-modal-quiz-flip-face game-card-modal-quiz-flip-face--back">
            <div className="deck-card is-day-challenge game-card-modal-quiz-deck-back">
              <div className="deck-card-back">
                <div className="deck-back-pattern" />
                <DayChallengeBackArt large={!flipAtDeckOrigin} />
                <span
                  className={`deck-back-label${
                    isWorkoutVisionCard ? ' is-day-challenge-label' : ''
                  }`}
                >
                  {flipBackLabel}
                </span>
              </div>
            </div>
          </div>
          <div
            className={`game-card-modal-quiz-flip-face game-card-modal-quiz-flip-face--front ${panelClassName}`}
            {...panelDataAttrs}
          >
            {panelInner}
          </div>
        </div>
      </div>
    </div>
  )
}
