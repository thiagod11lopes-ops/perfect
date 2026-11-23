import { useCallback, useEffect, useRef, useState } from 'react'
import { WeekUnlockCelebration } from './WeekUnlockCelebration'
import { useAppClock } from '../hooks/useAppClock'
import { useApp } from '../store/AppContext'
import { isWaterMissionBusy, subscribeWaterMission } from '../data/waterMissionCelebrate'
import {
  hasPendingWeekUnlockForDay,
  isWeekUnlockFlushPaused,
  markWeekUnlockCelebrated,
  noteCoinsForWeekUnlock,
  shiftWeekUnlockCelebrationForDay,
  subscribeWeekUnlock,
} from '../data/weekUnlockCelebrate'

/**
 * Escuta moedas em qualquer tela (incl. Mais / DEV) e exibe a celebração
 * de desbloqueio de semana ao cruzar 2500 / 5000 / 7500 — sempre depois das moedas.
 */
export function WeekUnlockHost() {
  const { state } = useApp()
  const { ctx } = useAppClock()
  const challengeDay = ctx.day
  const [weekUnlock, setWeekUnlock] = useState<{
    unlockedWeek: 2 | 3 | 4
    milestone: number
  } | null>(null)
  const [pulse, setPulse] = useState(0)
  const weekUnlockRef = useRef(weekUnlock)
  weekUnlockRef.current = weekUnlock

  useEffect(() => {
    const offWeek = subscribeWeekUnlock(() => setPulse((n) => n + 1))
    const offWater = subscribeWaterMission(() => setPulse((n) => n + 1))
    return () => {
      offWeek()
      offWater()
    }
  }, [])

  useEffect(() => {
    noteCoinsForWeekUnlock(state.coins)
  }, [state.coins])

  const showNext = useCallback(() => {
    if (isWeekUnlockFlushPaused()) return
    if (isWaterMissionBusy()) return
    const next = shiftWeekUnlockCelebrationForDay(challengeDay)
    setWeekUnlock(next)
  }, [challengeDay])

  const onUnlockDone = useCallback(() => {
    const current = weekUnlockRef.current
    if (current) markWeekUnlockCelebrated(current.unlockedWeek)
    setWeekUnlock(null)
    window.setTimeout(() => {
      if (isWeekUnlockFlushPaused()) return
      if (isWaterMissionBusy()) return
      if (!hasPendingWeekUnlockForDay(challengeDay)) return
      const next = shiftWeekUnlockCelebrationForDay(challengeDay)
      setWeekUnlock(next)
    }, 80)
  }, [challengeDay])

  useEffect(() => {
    if (weekUnlock) return
    if (isWeekUnlockFlushPaused()) return
    if (isWaterMissionBusy()) return
    if (!hasPendingWeekUnlockForDay(challengeDay)) return
    showNext()
  }, [state.coins, weekUnlock, showNext, pulse, challengeDay])

  if (!weekUnlock) return null

  return (
    <WeekUnlockCelebration
      key={`week-unlock-${weekUnlock.unlockedWeek}-${weekUnlock.milestone}`}
      unlockedWeek={weekUnlock.unlockedWeek}
      milestone={weekUnlock.milestone}
      onDone={onUnlockDone}
    />
  )
}
