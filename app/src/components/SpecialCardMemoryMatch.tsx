import { useState } from 'react'
import { CoinIcon } from './CoinIcon'
import { MemoryMatchBoard } from './MemoryMatchBoard'
import {
  MEMORY_MATCH_LEVELS,
  memoryLevelDef,
  type MemoryMatchLevel,
} from '../data/memoryMatchLevels'

export type MemoryMatchPhase = 'intro' | 'play'

export type MemoryMatchWinPayload = {
  totalReward: number
  lastLevel: MemoryMatchLevel
}

type Props = {
  phase: MemoryMatchPhase
  onPhaseChange: (phase: MemoryMatchPhase) => void
  onBusyChange?: (busy: boolean) => void
  onWin: (payload: MemoryMatchWinPayload) => void
  onExit?: () => void
}

export function SpecialCardMemoryMatch({
  phase,
  onPhaseChange,
  onBusyChange,
  onWin,
  onExit,
}: Props) {
  const [level, setLevel] = useState<MemoryMatchLevel>(1)
  const [boardKey, setBoardKey] = useState(0)

  const startLevel = (lv: MemoryMatchLevel) => {
    setLevel(lv)
    setBoardKey((k) => k + 1)
    onPhaseChange('play')
    onBusyChange?.(true)
  }

  const handleBoardWin = (wonLevel: MemoryMatchLevel) => {
    const reward = memoryLevelDef(wonLevel).reward
    onBusyChange?.(false)
    onWin({ totalReward: reward, lastLevel: wonLevel })
  }

  if (phase === 'play') {
    return (
      <div className="skill-mission skill-mission--embed skill-mission--memory skill-mission--memory-play">
        <MemoryMatchBoard
          level={level}
          levelDef={memoryLevelDef(level)}
          boardKey={boardKey}
          onWin={(wonLevel) => handleBoardWin(wonLevel)}
          onRetry={() => setBoardKey((k) => k + 1)}
          onExit={() => {
            onBusyChange?.(false)
            onExit?.()
          }}
        />
      </div>
    )
  }

  return (
    <div className="skill-mission skill-mission--intro skill-mission--memory-intro">
      <p className="display h2 skill-mission-title">Memória do treino</p>
      <p className="skill-mission-lead">
        Encontre os pares de exercícios em <strong>1 minuto</strong>. Escolha o nível:
      </p>
      <div className="memory-level-pick">
        {MEMORY_MATCH_LEVELS.map((lv) => (
          <button
            key={lv.level}
            type="button"
            className="memory-level-pick-btn"
            onClick={() => startLevel(lv.level)}
          >
            <span className="memory-level-pick-num">Nível {lv.level}</span>
            <span className="memory-level-pick-meta">
              {lv.cards} cartas · +{lv.reward} <CoinIcon size={18} />
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-primary btn-block skill-mission-start"
        onClick={() => startLevel(1)}
      >
        Jogar agora
      </button>
    </div>
  )
}