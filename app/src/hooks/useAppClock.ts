import { useEffect, useMemo, useState } from 'react'
import { challengeCardStats } from '../data/challengeProgress'
import {
  WEEK_UNLOCK_COINS,
  effectiveChallengeWeek,
  maxUnlockedWeek,
  weekUnlockProgress,
} from '../data/coinEconomy'
import { resolveChallengeDateKey } from '../data/dailyChallenges'
import { sleepForChallengeDateKey } from '../data/routine'
import { useApp } from '../store/AppContext'
import {
  challengeDayNumber,
  devSimulatedChallengeDateKey,
  formatClockTimeWithSeconds,
  normalizeClockTimeWithSeconds,
  parseISODate,
  phaseForWeek,
  resolveAppDate,
  resolveAppMinutes,
  todayContext,
} from '../utils/dates'

/** Relógio unificado (real ou modo desenvolvimento com tempo correndo). */
export function useAppClock() {
  const { state, dispatch } = useApp()
  const [tick, setTick] = useState(0)
  const clockPaused = Boolean(state.devClockPaused)

  useEffect(() => {
    if (state.devMode && clockPaused) return
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [state.devMode, clockPaused])

  const clockOpts = useMemo(
    () => ({
      startDate: state.startDate,
      devMode: state.devMode,
      devDay: state.devDay,
      devTime: state.devTime,
      devClockAnchoredAt: state.devClockAnchoredAt,
      devClockPaused: clockPaused,
    }),
    [
      state.startDate,
      state.devMode,
      state.devDay,
      state.devTime,
      state.devClockAnchoredAt,
      clockPaused,
      tick,
    ],
  )

  const now = useMemo(() => resolveAppDate(clockOpts), [clockOpts])
  const minutes = useMemo(() => resolveAppMinutes(clockOpts), [clockOpts])

  // Madrugada (sono overnight): mantém o baralho do dia que começou à noite
  const queueDateKey = useMemo(
    () =>
      state.devMode
        ? devSimulatedChallengeDateKey(state.startDate, state.devDay)
        : resolveChallengeDateKey(
            now,
            sleepForChallengeDateKey(state.routine, now),
            state.startDate,
          ),
    [now, state.routine, state.startDate, state.devMode, state.devDay],
  )
  const queueDate = useMemo(() => parseISODate(queueDateKey), [queueDateKey])

  const unlockedWeek = useMemo(() => maxUnlockedWeek(state.coins), [state.coins])
  const unlockProgress = useMemo(() => weekUnlockProgress(state.coins), [state.coins])
  const challenge = useMemo(() => challengeCardStats(state.dayQueues), [state.dayQueues])

  const ctx = useMemo(() => {
    const base = todayContext(state.startDate, queueDate)
    const week = effectiveChallengeWeek(base.week, unlockedWeek)
    const phase = phaseForWeek(week)
    return {
      ...base,
      calendarWeek: base.week,
      week,
      phase,
      unlockedWeek,
      weekLocked: base.week > unlockedWeek,
      dateKey: queueDateKey,
      unlockProgress,
      challenge,
    }
  }, [state.startDate, queueDate, queueDateKey, unlockedWeek, unlockProgress, challenge])

  const liveDay = state.devMode ? state.devDay : challengeDayNumber(state.startDate, queueDate)
  const liveTimeWithSeconds = state.devMode
    ? formatClockTimeWithSeconds(now)
    : normalizeClockTimeWithSeconds(state.devTime)

  const setDevDay = (day: number) =>
    dispatch({
      type: 'SET_DEV_CLOCK',
      day,
      time: day !== state.devDay ? '05:00:00' : liveTimeWithSeconds,
    })
  const setDevTime = (time: string) =>
    dispatch({
      type: 'SET_DEV_CLOCK',
      time: normalizeClockTimeWithSeconds(time),
      day: liveDay,
      pause: true,
    })
  const setDevClockPaused = (paused: boolean) =>
    dispatch({
      type: 'SET_DEV_CLOCK_PAUSED',
      paused,
      day: liveDay,
      time: liveTimeWithSeconds,
    })
  const toggleDevClock = () => setDevClockPaused(!clockPaused)

  return {
    now,
    minutes,
    ctx,
    weekday: queueDate.getDay(),
    unlockedWeek,
    unlockProgress,
    weekUnlockNeed: WEEK_UNLOCK_COINS,
    devMode: state.devMode,
    /** Dia efetivo do baralho (não avança na madrugada do sono). */
    devDay: liveDay,
    /** Hora efetiva HH:MM:SS (corre em tempo real) — para input com segundos. */
    devTime: liveTimeWithSeconds,
    /** Hora efetiva HH:MM:SS para exibição. */
    devTimeLive: liveTimeWithSeconds,
    clockPaused,
    setDevDay,
    setDevTime,
    setDevClockPaused,
    toggleDevClock,
  }
}
