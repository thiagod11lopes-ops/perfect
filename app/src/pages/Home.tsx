import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DailyChallenges } from '../components/DailyChallenges'
import { Week1FailModal } from '../components/Week1FailModal'
import { PageCoinsChip, useCoinsDisplay } from '../components/CoinsDisplay'
import { StarCardsUnlockButton } from '../components/StarCardsUnlockButton'
import {
  buildDayChallenges,
  isStarCardsLockWindow,
  morningCheckInStartMinutesFromChallenges,
  starCardsUnlockAvailable,
} from '../data/dailyChallenges'
import { getRoutineForWeekday, resolveRoutineMinutes } from '../data/routine'
import { useAppClock } from '../hooks/useAppClock'
import { useApp } from '../store/AppContext'
import { weekdayLabel } from '../utils/dates'
import { formatCoins } from '../utils/format'
import { scrollPhoneContentToTop } from '../utils/scrollPhoneToTop'
import {
  activeWeekGateFail,
  challengeGateDayIndex,
} from '../data/week1Fail'
import { resetWeekUnlockCelebrationState } from '../data/weekUnlockCelebrate'
import { STORAGE_KEY } from '../store/AppContext'

export function Home() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const base = pathname.startsWith('/celular') ? '/celular' : ''

  useLayoutEffect(() => {
    scrollPhoneContentToTop()
    requestAnimationFrame(scrollPhoneContentToTop)
  }, [])
  const { ctx, now, devMode, weekday } = useAppClock()
  const [starRevealedSession, setStarRevealedSession] = useState(false)
  const [starRevealAnimating, setStarRevealAnimating] = useState(false)

  const dayRoutine = useMemo(
    () => getRoutineForWeekday(state.routine, weekday),
    [state.routine, weekday],
  )
  const routineChallenges = useMemo(
    () =>
      buildDayChallenges(
        ctx.week,
        weekday,
        ctx.isRest,
        ctx.letter,
        dayRoutine,
        state.profile.weight,
      ),
    [ctx.week, weekday, ctx.isRest, ctx.letter, dayRoutine, state.profile.weight],
  )
  const morningCheckInMin = morningCheckInStartMinutesFromChallenges(routineChallenges)
  const sleepStartMin = resolveRoutineMinutes(dayRoutine, 'sleep', 'start')
  const starCardsInLockWindow = isStarCardsLockWindow(
    now,
    sleepStartMin,
    morningCheckInMin,
  )
  const starCardsUnlockReady = starCardsUnlockAvailable(
    ctx.dateKey,
    now,
    sleepStartMin,
    morningCheckInMin,
  )

  useEffect(() => {
    setStarRevealedSession(false)
  }, [ctx.dateKey])

  useEffect(() => {
    if (starCardsInLockWindow) setStarRevealedSession(false)
  }, [starCardsInLockWindow])

  /** UI só após clique nesta sessão — persistido não abre cartas ao cruzar 08:00. */
  const starCardsRevealed = starRevealedSession && !starCardsInLockWindow
  const {
    setDisplayCoins,
    pinDisplayCoinsUntilSynced,
    setCoinCelebrating,
    alignDisplayWithAppWallet,
  } = useCoinsDisplay()
  const firstName = state.profile.name.split(' ')[0] || 'Atleta'
  const weekLabel =
    ctx.weekLocked && ctx.calendarWeek !== ctx.week
      ? `Semana ${ctx.week} (calendário ${ctx.calendarWeek})`
      : `Semana ${ctx.week}`
  const { challenge } = ctx
  const challengeTone =
    challenge.resolved === 0
      ? ''
      : challenge.percent >= 80
        ? ' complete'
        : challenge.percent < 50
          ? ' urgent'
          : ''

  const gateDayIndex = challengeGateDayIndex(
    state.startDate,
    now,
    state.devMode,
    state.devDay,
  )
  const weekGateFail = activeWeekGateFail(gateDayIndex, state.coins)
  const showWeek1FailModal = weekGateFail != null && !state.pendingWeek1RestartAfterDateKey

  return (
    <div className="stack fade-in home-simple">
      <Week1FailModal
        open={showWeek1FailModal}
        eyebrow={weekGateFail?.eyebrow ?? ''}
        message={weekGateFail?.message ?? ''}
        onRestartWeek1={() => {
          resetWeekUnlockCelebrationState(0)
          dispatch({ type: 'SCHEDULE_WEEK1_RESTART', anchorDateKey: ctx.dateKey })
          alignDisplayWithAppWallet(0)
        }}
        onQuit={() => {
          dispatch({ type: 'QUIT_PROGRAM' })
          localStorage.removeItem(STORAGE_KEY)
          navigate(`${base}/onboarding`, { replace: true })
        }}
      />
      <header className="home-hero-card">
        <div className="home-hero-main">
          <p className="eyebrow">
            Dia {ctx.day}/28 · {weekdayLabel(now)} · {weekLabel}
            {devMode ? ' · DEV' : ''}
          </p>
          <h1 className="display h1" style={{ margin: 0 }}>
            Olá, {firstName}
          </h1>
        </div>
        <PageCoinsChip className="home-hero-coins" />
      </header>

      <section className="coin-economy-panel" aria-label="Progresso do desafio">
        <div className="coin-economy-split">
          <div className="coin-economy-row">
            <div className="coin-economy-copy">
              <span className="eyebrow">Crescimento</span>
              <strong>
                {challenge.percent}%
                {' · '}
                {challenge.lost}{' '}
                {challenge.lost === 1 ? 'carta perdida' : 'cartas perdidas'}
              </strong>
            </div>
            <div
              className="progress-track coin-economy-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={challenge.percent}
              aria-label="Crescimento do desafio"
            >
              <div
                className={`progress-fill${challengeTone}`}
                style={{ width: `${challenge.percent}%` }}
              />
            </div>
          </div>

          {ctx.unlockProgress.nextWeek ? (
            <div className="coin-economy-row">
              <div className="coin-economy-copy">
                <span className="eyebrow">Liberar semana {ctx.unlockProgress.nextWeek}</span>
                <strong>
                  {ctx.unlockProgress.remaining === 1
                    ? 'Falta 1 moeda'
                    : `Faltam ${formatCoins(ctx.unlockProgress.remaining)} moedas`}
                </strong>
              </div>
              <div className="progress-track coin-economy-track" aria-hidden>
                <div
                  className="progress-fill"
                  style={{ width: `${ctx.unlockProgress.percent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="coin-economy-row">
              <div className="coin-economy-copy">
                <span className="eyebrow">Semanas</span>
                <strong>Semana 4 liberada</strong>
              </div>
            </div>
          )}
        </div>

        {ctx.weekLocked ? (
          <p className="coin-economy-hint">
            Faltam {formatCoins(ctx.unlockProgress.remaining)} moedas para liberar a semana{' '}
            {ctx.unlockProgress.nextWeek} (marco {formatCoins(ctx.unlockProgress.need)}). Enquanto
            isso, o baralho continua na semana {ctx.week}.
          </p>
        ) : null}
      </section>

      {starCardsUnlockReady && !starRevealedSession && !starRevealAnimating ? (
        <StarCardsUnlockButton
          onClick={() => {
            dispatch({ type: 'REVEAL_STAR_CARDS', dateKey: ctx.dateKey })
            setStarRevealAnimating(true)
          }}
        />
      ) : null}

      <DailyChallenges
        setDisplayCoins={setDisplayCoins}
        pinDisplayCoinsUntilSynced={pinDisplayCoinsUntilSynced}
        setCoinCelebrating={setCoinCelebrating}
        starCardsRevealed={starCardsRevealed}
        starRevealAnimating={starRevealAnimating}
        onStarRevealAnimEnd={() => {
          setStarRevealedSession(true)
          setStarRevealAnimating(false)
        }}
      />
    </div>
  )
}
