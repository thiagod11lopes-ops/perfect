import {
  PerfectSnakeEmbed,
  type PerfectSnakeCompletePayload,
  type PerfectSnakeWinRewardPayload,
} from './PerfectSnakeEmbed'

export type NeonophisCompletePayload = PerfectSnakeCompletePayload

export type NeonophisPhase = 'intro' | 'embed'

type SpecialCardNeonophisProps = {
  phase: NeonophisPhase
  targetCoins?: number
  durationSec?: number
  sessionKey?: string
  onBusyChange?: (busy: boolean) => void
  onPhaseChange: (phase: NeonophisPhase) => void
  onWinReward?: (payload: PerfectSnakeWinRewardPayload) => void
  onComplete: (payload: NeonophisCompletePayload) => void
  onExit?: () => void
}

export function SpecialCardNeonophis({
  phase,
  targetCoins = 10,
  durationSec = 60,
  sessionKey,
  onBusyChange,
  onPhaseChange,
  onWinReward,
  onComplete,
  onExit,
}: SpecialCardNeonophisProps) {
  const startEmbed = () => {
    onPhaseChange('embed')
  }

  if (phase === 'embed') {
    return (
      <div className="skill-mission skill-mission--embed">
        <PerfectSnakeEmbed
          targetCoins={targetCoins}
          durationSec={durationSec}
          sessionKey={sessionKey}
          onReady={() => onBusyChange?.(true)}
          onWinReward={onWinReward}
          onComplete={(payload) => {
            onBusyChange?.(false)
            onComplete(payload)
          }}
          onExit={() => {
            onBusyChange?.(false)
            onExit?.()
          }}
        />
      </div>
    )
  }

  return (
    <div className="skill-mission skill-mission--intro">
      <p className="display h2 skill-mission-title">Missão de Habilidade</p>
      <p className="skill-mission-lead">
        Colete <strong>{targetCoins} halteres</strong> em{' '}
        <strong>{durationSec} segundos</strong>.
      </p>
      <p className="muted skill-mission-hint">
        Cada haltere vale 1 moeda. Ao vencer, as moedas caem na sua carteira principal.
      </p>
      <button
        type="button"
        className="btn btn-primary btn-block skill-mission-start"
        onClick={startEmbed}
      >
        Jogar agora
      </button>
    </div>
  )
}