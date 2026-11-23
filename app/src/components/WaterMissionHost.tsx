import { useCallback, useEffect, useState } from 'react'
import { WaterMissionCelebration } from './WaterMissionCelebration'
import {
  hasPendingWaterMission,
  isWaterMissionFlushPaused,
  markWaterMissionCelebrationDone,
  shiftWaterMissionCelebration,
  subscribeWaterMission,
} from '../data/waterMissionCelebrate'

/** Exibe a celebração da meta 3,5 L após a animação de moedas da carta. */
export function WaterMissionHost() {
  const [cue, setCue] = useState<{
    bonusCoins: number
    goalMl: number
  } | null>(null)
  const [pulse, setPulse] = useState(0)

  useEffect(() => subscribeWaterMission(() => setPulse((n) => n + 1)), [])

  const showNext = useCallback(() => {
    if (isWaterMissionFlushPaused()) return
    const next = shiftWaterMissionCelebration()
    setCue(next ? { bonusCoins: next.bonusCoins, goalMl: next.goalMl } : null)
  }, [])

  useEffect(() => {
    if (cue) return
    if (isWaterMissionFlushPaused()) return
    if (!hasPendingWaterMission()) return
    showNext()
  }, [cue, showNext, pulse])

  if (!cue) return null

  return (
    <WaterMissionCelebration
      key={`water-mission-${cue.goalMl}-${cue.bonusCoins}`}
      bonusCoins={cue.bonusCoins}
      goalMl={cue.goalMl}
      onDone={() => {
        setCue(null)
        markWaterMissionCelebrationDone()
      }}
    />
  )
}
