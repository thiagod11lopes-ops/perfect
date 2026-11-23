import { useEffect, useMemo, useRef, useState } from 'react'
import { buildQuizRound } from '../data/quizRound'

export type QuizWinPayload = { reward: number }

const QUIZ_OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const
const QUIZ_WRONG_SPLASH_MS = 4000

type Props = {
  sessionKey: string
  onBusyChange?: (busy: boolean) => void
  onWin: (payload: QuizWinPayload) => void
  onLose: () => void
}

export function SpecialCardQuiz({ sessionKey, onBusyChange, onWin, onLose }: Props) {
  const round = useMemo(() => buildQuizRound(sessionKey), [sessionKey])
  const [locked, setLocked] = useState(false)
  const [pendingChoice, setPendingChoice] = useState<string | null>(null)
  const [wrongFlash, setWrongFlash] = useState(false)
  const [pickedWrong, setPickedWrong] = useState<string | null>(null)
  const onLoseRef = useRef(onLose)
  const onBusyChangeRef = useRef(onBusyChange)
  onLoseRef.current = onLose
  onBusyChangeRef.current = onBusyChange

  useEffect(() => {
    onBusyChangeRef.current?.(false)
  }, [sessionKey])

  const stageChoice = (choice: string) => {
    if (locked || wrongFlash) return
    setPendingChoice(choice)
  }

  const cancelConfirm = () => {
    if (locked || wrongFlash) return
    setPendingChoice(null)
  }

  const confirmChoice = () => {
    if (locked || wrongFlash || !pendingChoice) return
    pick(pendingChoice)
  }

  const pick = (choice: string) => {
    if (locked) return
    if (choice === round.correctTitle) {
      setLocked(true)
      onBusyChange?.(true)
      onWin({ reward: 10 })
      return
    }
    setLocked(true)
    setPickedWrong(choice)
    setWrongFlash(true)
    onBusyChange?.(true)
  }

  useEffect(() => {
    if (!wrongFlash) return
    const t = window.setTimeout(() => {
      setWrongFlash(false)
      onBusyChangeRef.current?.(false)
      onLoseRef.current()
    }, QUIZ_WRONG_SPLASH_MS)
    return () => window.clearTimeout(t)
  }, [wrongFlash])

  return (
    <div className="skill-mission skill-mission--embed skill-mission--quiz skill-mission--quiz-play">
      <div className="quiz-board">
        <p className="quiz-question">Me diga o nome desse exercício</p>
        <div className="quiz-video-wrap">
          <video
            className="quiz-video"
            src={round.videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
        </div>
        <div className="quiz-answer-block">
          <div className="quiz-choices" role="group" aria-label="Escolha o exercício">
            {round.choices.map((label, index) => (
              <button
                key={label}
                type="button"
                className={[
                  'quiz-choice-btn',
                  pendingChoice === label ? ' is-pending-pick' : '',
                  pickedWrong === label ? ' is-wrong-pick' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={locked}
                onClick={() => stageChoice(label)}
              >
                <span className="quiz-choice-letter" aria-hidden>
                  {QUIZ_OPTION_LETTERS[index] ?? '?'}
                </span>
                <span className="quiz-choice-label">{label}</span>
              </button>
            ))}
          </div>
          {pendingChoice && !locked ? (
            <div className="quiz-confirm" role="region" aria-label="Confirmar resposta">
              <p className="quiz-confirm-question">Esta certo disso?</p>
              <div className="quiz-confirm-actions">
                <button
                  type="button"
                  className="quiz-confirm-btn quiz-confirm-btn--yes"
                  onClick={confirmChoice}
                >
                  Sim
                </button>
                <button
                  type="button"
                  className="quiz-confirm-btn quiz-confirm-btn--no"
                  onClick={cancelConfirm}
                >
                  Não
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {wrongFlash ? (
        <div className="quiz-wrong-splash" role="alert" aria-live="assertive">
          <div className="quiz-wrong-splash-backdrop" aria-hidden />
          <article className="quiz-wrong-card">
            <span className="quiz-wrong-glow" aria-hidden />
            <span className="quiz-wrong-face" role="img" aria-label="Rosto triste">
              😢
            </span>
            <p className="quiz-wrong-phrase">Não foi dessa vez</p>
          </article>
        </div>
      ) : null}
    </div>
  )
}