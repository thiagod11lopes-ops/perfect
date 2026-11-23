import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildDayChallenges } from '../data/dailyChallenges'
import { mergeRoutineWithStarCards } from '../data/dayGames'
import { weekFromChallengeId, type WeekNum } from '../data/coinEconomy'
import type { DailyChallenge } from '../data/dailyChallenges'
import { getRoutineForWeekday } from '../data/routine'
import { useAppClock } from '../hooks/useAppClock'
import { useApp } from '../store/AppContext'
import { useCoinsDisplay } from './CoinsDisplay'
import { postPerfectSnakeForceWin } from '../lib/perfectSnakeDev'
import { postWordSearchReveal } from '../lib/wordSearchDev'
import { DevNeonophisGridFields } from './DevNeonophisGridFields'
import { resetWeekUnlockCelebrationState } from '../data/weekUnlockCelebrate'
import { normalizeClockTimeWithSeconds, resolveAppMinutes } from '../utils/dates'

function DevTimeFold({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const uid = useId()
  const panelId = `${uid}-panel`
  const triggerId = `${uid}-trigger`

  return (
    <section className={`dev-time-fold${open ? ' is-open' : ''}`}>
      <button
        type="button"
        id={triggerId}
        className="dev-time-fold-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="dev-time-fold-title">{title}</span>
        <span className="dev-time-fold-chevron" aria-hidden />
      </button>
      <div
        id={panelId}
        className="dev-time-fold-panel"
        role="region"
        aria-labelledby={triggerId}
        hidden={!open}
      >
        {children}
      </div>
    </section>
  )
}

/** Painel externo ao simulador /celular para dia, hora e moedas do modo DEV. */
export function DevTimeControlCard() {
  const { state, dispatch } = useApp()
  const { pinDisplayCoinsUntilSynced, alignDisplayWithAppWallet } = useCoinsDisplay()
  const {
    ctx,
    devMode,
    devDay,
    devTimeLive,
    clockPaused,
    weekday,
    setDevDay,
    setDevTime,
    toggleDevClock,
  } = useAppClock()
  const [coinsDraft, setCoinsDraft] = useState(String(state.coins))
  const [coinsEditing, setCoinsEditing] = useState(false)
  const [coinsPulse, setCoinsPulse] = useState(false)
  const [routineDoneDraft, setRoutineDoneDraft] = useState('0')
  const [routineOutcomeHint, setRoutineOutcomeHint] = useState('')
  const [snakeDevHint, setSnakeDevHint] = useState('')
  const [wordSearchDevHint, setWordSearchDevHint] = useState('')
  const prevWalletRef = useRef(state.coins)
  /** Âncora gravada — input type="time" não lida bem com tick do relógio ao vivo. */
  const devTimeAnchor = normalizeClockTimeWithSeconds(state.devTime)

  useEffect(() => {
    if (!devMode) return
    if (prevWalletRef.current === state.coins) return
    prevWalletRef.current = state.coins
    if (!coinsEditing) {
      setCoinsDraft(String(state.coins))
    }
    setCoinsPulse(true)
    const t = window.setTimeout(() => setCoinsPulse(false), 750)
    return () => window.clearTimeout(t)
  }, [devMode, state.coins, coinsEditing])

  const applyDevCoins = () => {
    const value = Math.max(0, Math.floor(Number(coinsDraft) || 0))
    dispatch({ type: 'SET_DEV_COINS', coins: value })
    pinDisplayCoinsUntilSynced(value)
    alignDisplayWithAppWallet(value)
    setCoinsDraft(String(value))
    setCoinsEditing(false)
  }

  const deckWeek = useMemo<WeekNum>(() => {
    const existing = state.dayQueues[ctx.dateKey]?.cards
    if (existing?.length) {
      for (const card of existing) {
        const w = weekFromChallengeId(card.challengeId)
        if (w) return w
      }
    }
    return ctx.week
  }, [state.dayQueues, ctx.dateKey, ctx.week])

  const dayRoutine = useMemo(
    () => getRoutineForWeekday(state.routine, weekday),
    [state.routine, weekday],
  )
  const dayChallenges = useMemo(() => {
    const base = buildDayChallenges(
      deckWeek,
      weekday,
      ctx.isRest,
      ctx.letter,
      dayRoutine,
      state.profile.weight,
    )
    return mergeRoutineWithStarCards(base, deckWeek, weekday)
  }, [deckWeek, weekday, ctx.isRest, ctx.letter, dayRoutine, state.profile.weight])
  const routineCardCount = useMemo(
    () => dayChallenges.filter((c: DailyChallenge) => c.kind !== 'jogo').length,
    [dayChallenges],
  )

  const restartDevChallenge = () => {
    resetWeekUnlockCelebrationState(0)
    dispatch({ type: 'DEV_RESTART_CHALLENGE' })
    setCoinsEditing(false)
    setCoinsDraft('0')
    setRoutineDoneDraft('0')
    setRoutineOutcomeHint('')
    alignDisplayWithAppWallet(0)
  }

  const applyRoutineOutcomes = () => {
    const count = Math.max(
      0,
      Math.min(routineCardCount, Math.floor(Number(routineDoneDraft) || 0)),
    )
    const minutes = resolveAppMinutes({
      startDate: state.startDate,
      devMode: state.devMode,
      devDay: state.devDay,
      devTime: state.devTime,
      devClockAnchoredAt: state.devClockAnchoredAt,
      devClockPaused: state.devClockPaused,
    })
    dispatch({
      type: 'DEV_SIMULATE_ROUTINE_OUTCOMES',
      dateKey: ctx.dateKey,
      completedCount: count,
      challenges: dayChallenges,
      minutes,
    })
    setCoinsEditing(false)
    setRoutineOutcomeHint(
      `Sorteio: ${count} de ${routineCardCount} cartas de rotina (faixa verde); as demais ficam perdidas (vermelho). Moedas = soma das verdes deste dia + verdes dos dias já selados (não usa o campo Moedas).`,
    )
  }

  if (!devMode) return null

  return (
    <aside className="dev-time-card" aria-label="Controle de tempo">
      <p className="dev-time-card-eyebrow">Simulação</p>
      <h2 className="dev-time-card-title">Controle de tempo</h2>
      <p className="dev-time-card-copy">
        Ajuste dia, hora, grade Neonophis e saldo de moedas sem ocupar a tela do celular.
      </p>

      <DevTimeFold title="Neonophis · grade">
        <DevNeonophisGridFields variant="card" bare />
      </DevTimeFold>

      <DevTimeFold title="Missão de Habilidade">
        <p className="dev-time-card-neonophis-copy">
          Com o snake aberto (Jogar agora), simula o 10º haltere: vídeo de vitória e moedas.
        </p>
        <button
          type="button"
          className="dev-time-card-apply dev-time-card-snake-win"
          onClick={() => {
            const ok = postPerfectSnakeForceWin()
            setSnakeDevHint(
              ok
                ? 'Vitória enviada ao iframe.'
                : 'Abra Missão de Habilidade e toque em Jogar agora.',
            )
          }}
        >
          Forçar vitória (10 halteres)
        </button>
        {snakeDevHint ? (
          <p className="dev-time-card-neonophis-copy" role="status">
            {snakeDevHint}
          </p>
        ) : null}
      </DevTimeFold>

      <DevTimeFold title="Caça-palavras">
        <p className="dev-time-card-neonophis-copy">
          Com o puzzle aberto, ilumina onde cada palavra foi colocada (sem marcar como
          encontrada).
        </p>
        <button
          type="button"
          className="dev-time-card-apply dev-time-card-snake-win"
          onClick={() => {
            const ok = postWordSearchReveal()
            setWordSearchDevHint(
              ok
                ? 'Palavras destacadas por 2s.'
                : 'Abra o caça-palavras e escolha um nível.',
            )
          }}
        >
          Revelar palavras (caça-palavras)
        </button>
        {wordSearchDevHint ? (
          <p className="dev-time-card-neonophis-copy" role="status">
            {wordSearchDevHint}
          </p>
        ) : null}
      </DevTimeFold>

      <DevTimeFold title="Dia, hora e moedas">
        <div className="dev-time-card-fields">
          <label className="dev-time-card-field" htmlFor="dev-time-card-day">
            <span className="dev-time-card-label">Dia</span>
            <div className="dev-time-card-day-row">
              <input
                id="dev-time-card-day"
                type="number"
                min={1}
                max={28}
                value={devDay}
                onChange={(e) => setDevDay(Number(e.target.value) || 1)}
              />
              <span className="dev-time-card-suffix">/28</span>
            </div>
          </label>

          <label className="dev-time-card-field dev-time-card-field-hour" htmlFor="dev-time-card-hour">
            <span className="dev-time-card-label">Hora</span>
            <div className="dev-time-card-hour-row">
              <input
                id="dev-time-card-hour"
                type="time"
                step={1}
                value={devTimeAnchor}
                onChange={(e) => setDevTime(e.target.value || '08:00:00')}
              />
              <button
                type="button"
                className={`dev-time-card-play${clockPaused ? ' is-paused' : ''}`}
                onClick={toggleDevClock}
                aria-label={clockPaused ? 'Continuar relógio' : 'Pausar relógio'}
                title={clockPaused ? 'Play' : 'Pause'}
              >
                {clockPaused ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5.5v13l11-6.5L8 5.5z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          <label
            className="dev-time-card-field dev-time-card-field-coins"
            htmlFor="dev-time-card-coins"
          >
            <span className="dev-time-card-label">Moedas</span>
            <div className="dev-time-card-coins-row">
              <input
                id="dev-time-card-coins"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={coinsDraft}
                onChange={(e) => setCoinsDraft(e.target.value)}
                onFocus={() => setCoinsEditing(true)}
                onBlur={() => setCoinsEditing(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    applyDevCoins()
                  }
                }}
              />
              <button
                type="button"
                className="dev-time-card-apply"
                onClick={applyDevCoins}
                aria-label="Aplicar moedas"
                title="Aplicar"
              >
                OK
              </button>
            </div>
          </label>

          <label
            className="dev-time-card-field dev-time-card-field-coins"
            htmlFor="dev-time-card-routine-done"
          >
            <span className="dev-time-card-label">
              Cartas rotina concluídas ({routineCardCount} hoje)
            </span>
            <div className="dev-time-card-coins-row">
              <input
                id="dev-time-card-routine-done"
                type="number"
                min={0}
                max={Math.max(0, routineCardCount)}
                step={1}
                inputMode="numeric"
                value={routineDoneDraft}
                onChange={(e) => setRoutineDoneDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    applyRoutineOutcomes()
                  }
                }}
              />
              <button
                type="button"
                className="dev-time-card-apply"
                onClick={applyRoutineOutcomes}
                aria-label="Aplicar sorteio de cartas"
                title="Sortear concluídas e atualizar saldo"
              >
                OK
              </button>
            </div>
          </label>
          {routineOutcomeHint ? (
            <p className="dev-time-card-neonophis-copy" role="status">
              {routineOutcomeHint}
            </p>
          ) : null}

          <button
            type="button"
            className="dev-time-card-restart"
            onClick={restartDevChallenge}
          >
            Reiniciar
          </button>
          <p className="dev-time-card-restart-hint">
            Zera moedas, dia 1/28 às 05:00 (pausado) e baralho novo — perfil e rotina mantidos.
          </p>
        </div>
      </DevTimeFold>

      <DevTimeFold title="Resumo ao vivo">
        <div
          className={`dev-time-card-live dev-time-card-live--fold${coinsPulse ? ' is-wallet-pulse' : ''}`}
          aria-live="polite"
        >
          <span className="dev-time-card-live-label">
            Agora{clockPaused ? ' · pausado' : ''}
          </span>
          <strong>
            Dia {devDay}/28 · {devTimeLive} · {state.coins} moedas
          </strong>
        </div>
      </DevTimeFold>
    </aside>
  )
}