import { useState } from 'react'
import { WorkoutVisionEmbed, type WorkoutVisionCompletePayload } from './WorkoutVisionEmbed'

export type WorkoutVisionPhase = 'intro' | 'later' | 'embed'

type SpecialCardWorkoutVisionProps = {
  exerciseLabel: string
  lift: string
  sleepDeadlineLabel: string
  sessionKey?: string
  onBusyChange?: (busy: boolean) => void
  onPhaseChange?: (phase: WorkoutVisionPhase) => void
  onComplete: (payload: WorkoutVisionCompletePayload) => void
  onDefer: () => void
}

export function SpecialCardWorkoutVision({
  exerciseLabel,
  lift,
  sleepDeadlineLabel,
  sessionKey,
  onBusyChange,
  onPhaseChange,
  onComplete,
  onDefer,
}: SpecialCardWorkoutVisionProps) {
  const [phase, setPhase] = useState<WorkoutVisionPhase>('intro')

  const goPhase = (next: WorkoutVisionPhase) => {
    setPhase(next)
    onPhaseChange?.(next)
    onBusyChange?.(next === 'embed')
  }

  if (phase === 'later') {
    return (
      <div className="wv-day-challenge wv-day-challenge--later">
        <p className="wv-day-challenge-lead">
          Você tem até o horário de dormir ({sleepDeadlineLabel}) para realizar essa tarefa.
        </p>
        <p className="muted wv-day-challenge-note">
          A carta continua pendente no baralho. Volte quando estiver pronto.
        </p>
        <button
          type="button"
          className="btn btn-primary wv-day-challenge-back"
          onClick={onDefer}
        >
          Entendi
        </button>
      </div>
    )
  }

  if (phase === 'embed') {
    return (
      <div className="wv-day-challenge wv-day-challenge--embed">
        <p className="eyebrow wv-day-challenge-embed-eyebrow">Filmando · {exerciseLabel}</p>
        <WorkoutVisionEmbed
          lift={lift}
          sessionKey={sessionKey}
          onReady={() => onBusyChange?.(true)}
          onComplete={(payload) => {
            onBusyChange?.(false)
            onComplete(payload)
          }}
        />
      </div>
    )
  }

  return (
    <div className="wv-day-challenge wv-day-challenge--intro">
      <p className="display h2 wv-day-challenge-title">Faça o exercício</p>
      <p className="wv-day-challenge-exercise">{exerciseLabel}</p>
      <p className="muted wv-day-challenge-hint">
        Use a câmera para filmar uma série. O WorkoutVision conta as repetições e valida o desafio.
      </p>
      <div className="wv-day-challenge-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => goPhase('embed')}
        >
          Fazer agora
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => goPhase('later')}
        >
          Fazer mais tarde
        </button>
      </div>
    </div>
  )
}