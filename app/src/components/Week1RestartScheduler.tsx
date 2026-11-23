import { useEffect } from 'react'
import { resolveChallengeDateKey } from '../data/dailyChallenges'
import { sleepForChallengeDateKey } from '../data/routine'
import { resetWeekUnlockCelebrationState } from '../data/weekUnlockCelebrate'
import { useApp } from '../store/AppContext'
import { devSimulatedChallengeDateKey, parseISODate, resolveAppDate } from '../utils/dates'

/** Aplica reinício da semana 1 no dia seguinte à escolha (não no meio do dia 8). */
export function Week1RestartScheduler() {
  const { state, dispatch } = useApp()

  useEffect(() => {
    const anchor = state.pendingWeek1RestartAfterDateKey
    if (!anchor) return

    const now = resolveAppDate({
      startDate: state.startDate,
      devMode: state.devMode,
      devDay: state.devDay,
      devTime: state.devTime,
      devClockAnchoredAt: state.devClockAnchoredAt,
      devClockPaused: state.devClockPaused,
    })
    const queueDateKey = state.devMode
      ? devSimulatedChallengeDateKey(state.startDate, state.devDay)
      : resolveChallengeDateKey(
          now,
          sleepForChallengeDateKey(state.routine, now),
          state.startDate,
        )
    if (parseISODate(queueDateKey).getTime() <= parseISODate(anchor).getTime()) return

    resetWeekUnlockCelebrationState(0)
    dispatch({ type: 'APPLY_WEEK1_RESTART', startDate: queueDateKey })
  }, [
    state.pendingWeek1RestartAfterDateKey,
    state.startDate,
    state.routine,
    state.devMode,
    state.devDay,
    state.devTime,
    state.devClockAnchoredAt,
    state.devClockPaused,
    dispatch,
  ])

  return null
}