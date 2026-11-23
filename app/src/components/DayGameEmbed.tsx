import { getDayGame, gameIdFromChallengeId } from '../data/dayGames'
import type { SpecialRouletteOutcome } from '../data/specialCardRoulette'
import {
  SpecialCardRoulette,
  type RouletteDebugContext,
  type RoulettePhase,
} from './SpecialCardRoulette'
import {
  SpecialCardWorkoutVision,
  type WorkoutVisionPhase,
} from './SpecialCardWorkoutVision'
import type { WorkoutVisionCompletePayload } from './WorkoutVisionEmbed'
import { SpecialCardNeonophis, type NeonophisPhase } from './SpecialCardNeonophis'
import {
  SpecialCardMemoryMatch,
  type MemoryMatchPhase,
  type MemoryMatchWinPayload,
} from './SpecialCardMemoryMatch'
import {
  SpecialCardWordSearch,
  type WordSearchWinPayload,
} from './SpecialCardWordSearch'
import { SpecialCardQuiz, type QuizWinPayload } from './SpecialCardQuiz'
import { SpecialCardWordSearchIntro } from './SpecialCardWordSearchIntro'
import type { WordSearchLevel } from '../data/wordSearchLevels'
import type { NeonophisCompletePayload } from './SpecialCardNeonophis'
import type { PerfectSnakeWinRewardPayload } from './PerfectSnakeEmbed'

type DayGameEmbedProps = {
  challengeId: string
  balance: number
  phaseBusy?: boolean
  sessionKey?: string
  debugContext?: RouletteDebugContext
  onBusyChange?: (busy: boolean) => void
  missionTitle?: string
  onPotStakeLocked?: (stake: import('../data/specialCardRoulette').SpecialRouletteStake) => void
  onCelebratingChange?: (active: boolean) => void
  onWalletDisplay?: (value: number) => void
  onRoulettePhaseChange?: (phase: RoulettePhase) => void
  onSettled: (outcome: SpecialRouletteOutcome) => void
  workoutVisionExercise?: { label: string; lift: string }
  sleepDeadlineLabel?: string
  onWorkoutVisionPhaseChange?: (phase: WorkoutVisionPhase) => void
  onWorkoutVisionComplete?: (payload: WorkoutVisionCompletePayload) => void
  onWorkoutVisionDefer?: () => void
  onNeonophisPhaseChange?: (phase: NeonophisPhase) => void
  onNeonophisComplete?: (payload: NeonophisCompletePayload) => void
  onNeonophisWinReward?: (payload: PerfectSnakeWinRewardPayload) => void
  onNeonophisExit?: () => void
  neonophisPhase?: NeonophisPhase
  onMemoryMatchPhaseChange?: (phase: MemoryMatchPhase) => void
  onMemoryMatchWin?: (payload: MemoryMatchWinPayload) => void
  onMemoryMatchExit?: () => void
  memoryMatchPhase?: MemoryMatchPhase
  wordSearchLevel?: WordSearchLevel | null
  onWordSearchLevelPick?: (level: WordSearchLevel) => void
  onWordSearchWin?: (payload: WordSearchWinPayload) => void
  onQuizWin?: (payload: QuizWinPayload) => void
  onQuizLose?: () => void
}

/** Minijogo do dia — roleta integrada (slot) ou iframe legado. */
export function DayGameEmbed({
  challengeId,
  balance,
  phaseBusy,
  sessionKey,
  debugContext,
  onBusyChange,
  missionTitle,
  onPotStakeLocked,
  onCelebratingChange,
  onWalletDisplay,
  onRoulettePhaseChange,
  onSettled,
  workoutVisionExercise,
  sleepDeadlineLabel = '23:00',
  onWorkoutVisionPhaseChange,
  onWorkoutVisionComplete,
  onWorkoutVisionDefer,
  onNeonophisPhaseChange,
  onNeonophisComplete,
  onNeonophisWinReward,
  onNeonophisExit,
  neonophisPhase = 'intro',
  onMemoryMatchPhaseChange,
  onMemoryMatchWin,
  onMemoryMatchExit,
  memoryMatchPhase = 'intro',
  wordSearchLevel = null,
  onWordSearchLevelPick,
  onWordSearchWin,
  onQuizWin,
  onQuizLose,
}: DayGameEmbedProps) {
  const game = getDayGame(gameIdFromChallengeId(challengeId))
  const gameId = gameIdFromChallengeId(challengeId)

  if (gameId === 'workout-vision' && workoutVisionExercise) {
    return (
      <div className="day-game-embed day-game-embed--workout-vision">
        <SpecialCardWorkoutVision
          key={sessionKey}
          exerciseLabel={workoutVisionExercise.label}
          lift={workoutVisionExercise.lift}
          sleepDeadlineLabel={sleepDeadlineLabel}
          sessionKey={sessionKey}
          onBusyChange={onBusyChange}
          onPhaseChange={onWorkoutVisionPhaseChange}
          onComplete={(payload) => onWorkoutVisionComplete?.(payload)}
          onDefer={() => onWorkoutVisionDefer?.()}
        />
      </div>
    )
  }

  if (gameId === 'quiz') {
    return (
      <div className="day-game-embed day-game-embed--quiz">
        <SpecialCardQuiz
          sessionKey={sessionKey ?? challengeId}
          onBusyChange={onBusyChange}
          onWin={(payload) => onQuizWin?.(payload)}
          onLose={onQuizLose ?? (() => {})}
        />
      </div>
    )
  }

  if (gameId === 'word-search') {
    return (
      <div className="day-game-embed day-game-embed--word-search">
        {wordSearchLevel ? (
          <SpecialCardWordSearch
            level={wordSearchLevel}
            sessionKey={sessionKey ?? challengeId}
            onBusyChange={onBusyChange}
            onWin={(payload) => onWordSearchWin?.(payload)}
          />
        ) : (
          <SpecialCardWordSearchIntro
            onPickLevel={(level) => onWordSearchLevelPick?.(level)}
          />
        )}
      </div>
    )
  }

  if (gameId === 'memory-match') {
    return (
      <div className="day-game-embed day-game-embed--memory-match">
        <SpecialCardMemoryMatch
          phase={memoryMatchPhase}
          onPhaseChange={(next) => onMemoryMatchPhaseChange?.(next)}
          onBusyChange={onBusyChange}
          onWin={(payload) => onMemoryMatchWin?.(payload)}
          onExit={() => onMemoryMatchExit?.()}
        />
      </div>
    )
  }

  if (gameId === 'neonophis') {
    return (
      <div
        className="day-game-embed day-game-embed--neonophis"
        data-neonophis-phase={neonophisPhase}
      >
        <SpecialCardNeonophis
          phase={neonophisPhase}
          targetCoins={game?.coins || 10}
          durationSec={60}
          sessionKey={sessionKey}
          onBusyChange={onBusyChange}
          onPhaseChange={(next) => onNeonophisPhaseChange?.(next)}
          onWinReward={(payload) => onNeonophisWinReward?.(payload)}
          onComplete={(payload) => onNeonophisComplete?.(payload)}
          onExit={() => onNeonophisExit?.()}
        />
      </div>
    )
  }

  if (gameId === 'slot-machine') {
    return (
      <div className="day-game-embed day-game-embed--roulette">
        <SpecialCardRoulette
          key={sessionKey}
          balance={balance}
          phaseBusy={phaseBusy}
          debugContext={debugContext}
          onBusyChange={onBusyChange}
          missionTitle={missionTitle}
          onPotStakeLocked={onPotStakeLocked}
          onCelebratingChange={onCelebratingChange}
          onWalletDisplay={onWalletDisplay}
          onPhaseChange={onRoulettePhaseChange}
          onSettled={onSettled}
        />
      </div>
    )
  }

  if (!game?.embedPath) {
    return (
      <div className="day-game-missing">
        <strong>Jogo em breve</strong>
        <p className="muted" style={{ margin: '0.35rem 0 0' }}>
          Esta carta especial ainda não tem um minijogo ativo.
        </p>
      </div>
    )
  }

  return (
    <div className="day-game-embed">
      <iframe
        className="day-game-frame"
        title={game.title}
        src={game.embedPath}
        allow="autoplay"
        style={{ backgroundColor: 'transparent', colorScheme: 'dark' }}
      />
    </div>
  )
}
