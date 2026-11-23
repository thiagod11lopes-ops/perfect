import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { CoinRewardCelebration } from '../components/CoinRewardCelebration'
import { PageCoinsChip, useCoinsDisplay } from '../components/CoinsDisplay'
import { ExerciseDemoModal } from '../components/ExerciseDemoModal'
import { CoinIcon } from '../components/CoinIcon'
import {
  parseRestSeconds,
  parseSetsCount,
  TimerIcon,
  WorkoutTimer,
} from '../components/WorkoutTimer'
import { BLOCK_COMPLETE_COINS, type WeekNum } from '../data/coinEconomy'
import { resolveExerciseDemo, type ExerciseDemo } from '../data/exerciseDemos'
import type { LoadUnit, WorkoutLetter } from '../data/types'
import { getEffectiveWorkout } from '../data/adminContent'
import {
  noteCoinCrossing,
  setWeekUnlockFlushPaused,
} from '../data/weekUnlockCelebrate'
import { useAdminContent } from '../hooks/useAdminContent'
import { useAppBase } from '../hooks/useAppBase'
import { useAppClock } from '../hooks/useAppClock'
import { useApp } from '../store/AppContext'
import { formatCoins } from '../utils/format'

type TimerEntry = 'after-set' | 'fresh' | 'transition'

type BlockReward = {
  blockLabel: string
  exerciseName: string
  fromBalance: number
  toBalance: number
  nextSession: { blockIndex: number; entry: TimerEntry } | null
}

/** Mantém a frase em uma linha, reduzindo a escala até caber no espaço. */
function FitOneLineMeta({ children }: { children: string }) {
  const slotRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const slot = slotRef.current
    const text = textRef.current
    if (!slot || !text) return

    const fit = () => {
      text.style.transform = 'scale(1)'
      const available = slot.clientWidth
      const needed = text.scrollWidth
      if (available <= 0) return
      if (needed <= available) return
      text.style.transform = `scale(${Math.max(0.42, available / needed)})`
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(slot)
    return () => ro.disconnect()
  }, [children])

  return (
    <div ref={slotRef} className="workout-title-meta-slot">
      <p ref={textRef} className="muted workout-title-meta">
        {children}
      </p>
    </div>
  )
}

export function Workout() {
  const { state, getDay, dispatch } = useApp()
  const { path } = useAppBase()
  const navigate = useNavigate()
  const { ctx } = useAppClock()
  const { setDisplayCoins, setCoinCelebrating } = useCoinsDisplay()
  useAdminContent()
  const unlockedWeek = ctx.unlockedWeek
  const unlockedWeeks = useMemo(
    () => ([1, 2, 3, 4] as const).filter((w) => w <= unlockedWeek) as WeekNum[],
    [unlockedWeek],
  )
  const [week, setWeek] = useState<WeekNum>(() =>
    Math.min(ctx.week, unlockedWeek) as WeekNum,
  )
  const [letter, setLetter] = useState<WorkoutLetter>(ctx.letter ?? 'A')
  const [timerSession, setTimerSession] = useState<{
    blockIndex: number
    entry: TimerEntry
  } | null>(null)
  const [blockReward, setBlockReward] = useState<BlockReward | null>(null)
  const [markDoneWarn, setMarkDoneWarn] = useState(false)
  const [demo, setDemo] = useState<ExerciseDemo | null>(null)
  const [completedBlocks, setCompletedBlocks] = useState<number[]>([])

  useEffect(() => {
    if (week > unlockedWeek) setWeek(unlockedWeek)
  }, [week, unlockedWeek])

  useEffect(() => {
    setCoinCelebrating(!!blockReward)
  }, [blockReward, setCoinCelebrating])

  const workout = getEffectiveWorkout(week, letter)

  useEffect(() => {
    setCompletedBlocks([])
  }, [week, letter])

  const openTimerForBlock = (blockIndex: number, entry: TimerEntry) => {
    setTimerSession({ blockIndex, entry })
  }

  const findNextIncompleteBlock = useCallback(
    (fromIndex: number, done: number[]) => {
      for (let i = Math.max(0, fromIndex); i < workout.blocks.length; i++) {
        if (!done.includes(i)) return i
      }
      return null
    },
    [workout.blocks.length],
  )

  const startWorkoutFlow = useCallback(() => {
    const next = findNextIncompleteBlock(0, completedBlocks)
    if (next == null) {
      navigate(path('/'), { state: { openWorkoutCard: true } })
      return
    }
    openTimerForBlock(next, 'fresh')
  }, [completedBlocks, findNextIncompleteBlock, navigate, path])

  const handleBlockComplete = useCallback(() => {
    if (!timerSession) return
    const doneIndex = timerSession.blockIndex
    const block = workout.blocks[doneIndex]
    if (!block) return
    const doneList = completedBlocks.includes(doneIndex)
      ? completedBlocks
      : [...completedBlocks, doneIndex]
    const next = findNextIncompleteBlock(doneIndex + 1, doneList)
    const fromBalance = state.coins
    const toBalance = fromBalance + BLOCK_COMPLETE_COINS
    noteCoinCrossing(fromBalance, toBalance)
    dispatch({ type: 'ADD_COINS', amount: BLOCK_COMPLETE_COINS })
    setCompletedBlocks(doneList)
    setTimerSession(null)

    // Sem blocos pendentes: vai às cartas para foto / conclusão do treino.
    if (next == null) {
      navigate(path('/'), { state: { openWorkoutCard: true } })
      return
    }

    setWeekUnlockFlushPaused(true)
    setBlockReward({
      blockLabel: `Bloco ${String(block.id).padStart(2, '0')}`,
      exerciseName: block.exercise,
      fromBalance,
      toBalance,
      nextSession: { blockIndex: next, entry: 'transition' },
    })
  }, [
    completedBlocks,
    dispatch,
    findNextIncompleteBlock,
    navigate,
    path,
    state.coins,
    timerSession,
    workout.blocks,
  ])

  const finishBlockReward = useCallback(() => {
    if (!blockReward) return
    const next = blockReward.nextSession
    setBlockReward(null)
    setWeekUnlockFlushPaused(false)
    if (next) setTimerSession(next)
  }, [blockReward])

  const activeTimerBlock =
    timerSession && workout.blocks[timerSession.blockIndex]
      ? workout.blocks[timerSession.blockIndex]
      : null
  const activeTimerDemo = activeTimerBlock
    ? resolveExerciseDemo(activeTimerBlock.exercise)
    : null
  const activeTimerLoadKey = activeTimerBlock
    ? `${week}-${letter}-${activeTimerBlock.id}`
    : ''
  const activeTimerLoad = activeTimerLoadKey
    ? state.workoutLoads[activeTimerLoadKey]
    : undefined
  const activeTimerLoadValue =
    activeTimerLoad?.value ?? activeTimerBlock?.load ?? ''
  const activeTimerLoadUnit =
    activeTimerLoad?.unit ?? activeTimerBlock?.loadUnit ?? 'kg'
  const day = getDay(ctx.dateKey)
  const isTodayWorkout = week === ctx.week && letter === ctx.letter && !ctx.isRest
  const workoutLocked = !isTodayWorkout

  useEffect(() => {
    if (workoutLocked) setTimerSession(null)
  }, [workoutLocked])

  const blockBonusTotal = workout.blocks.length * BLOCK_COMPLETE_COINS

  const goMarkDone = () => {
    if (!isTodayWorkout || day.workoutDone) return
    setMarkDoneWarn(true)
  }

  const confirmMarkDone = () => {
    setMarkDoneWarn(false)
    navigate(path('/'), { state: { openWorkoutCard: true } })
  }

  return (
    <div className="stack fade-in">
      <header className="stack-sm workout-page-header">
        <div className="page-eyebrow-row">
          <p className="eyebrow">Guia de treinamento</p>
          <PageCoinsChip />
        </div>
        <div className="workout-title-row">
          <h1 className="display h1">Treino</h1>
          <FitOneLineMeta>
            Full Body concorrente · 5 blocos de 10 min · ~54 minutos
          </FitOneLineMeta>
        </div>
      </header>

      <section className="card accent workout-select-card">
        <div className="workout-tabs-row">
          <div className="pill-tabs">
            {(['A', 'B', 'C'] as const).map((l) => (
              <button key={l} type="button" className={letter === l ? 'active' : ''} onClick={() => setLetter(l)}>
                Treino {l}
              </button>
            ))}
          </div>
          <div className="pill-tabs workout-week-tabs">
            {unlockedWeeks.map((w) => (
              <button key={w} type="button" className={week === w ? 'active' : ''} onClick={() => setWeek(w)}>
                Semana {w}
              </button>
            ))}
          </div>
        </div>
        <div className="workout-select-body">
          <div className="workout-select-copy">
            <p className="eyebrow">Semana {week} · {workout.phase}</p>
            <div className="workout-select-main">
              <h2 className="display h2">Treino {letter}</h2>
              <p className="muted workout-select-days">{workout.days}</p>
            </div>
          </div>
          <p className="muted workout-select-hint">
            Em cada bloco: 6 min força+cardio · 1 min descanso · 3 min cardio · 1 min transição.
            Sem esteira? Use bike, elíptico, escada ou marcha.
          </p>
        </div>
      </section>

      {ctx.isRest && week === ctx.week && (
        <div className="banner">Hoje é dia de descanso no calendário oficial. Use o tempo para recuperar e organizar a semana.</div>
      )}

      {workoutLocked && !ctx.isRest ? (
        <div className="banner">
          Treino {letter} bloqueado · hoje é o Treino {ctx.letter ?? '—'}. Você pode consultar os blocos, mas o cronômetro só libera no treino do dia.
        </div>
      ) : null}

      <div className={`stack workout-blocks${workoutLocked ? ' is-workout-locked' : ''}`}>
        {isTodayWorkout ? (
          <div className="card workout-block-actions">
            <button
              type="button"
              className="workout-start-btn workout-start-btn-block"
              onClick={startWorkoutFlow}
              aria-label="Iniciar treino"
            >
              <span className="workout-start-play" aria-hidden>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                  <path d="M8 5.14v13.72L19.12 12 8 5.14Z" />
                </svg>
              </span>
              <span>Iniciar Treino</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm workout-done-btn ${day.workoutDone ? 'btn-primary' : 'btn-ghost'}`}
              disabled={day.workoutDone}
              onClick={goMarkDone}
            >
              {day.workoutDone ? 'Concluído' : 'Marcar como feito'}
            </button>
          </div>
        ) : null}
        {workout.blocks.map((block, index) => {
          const blockDemo = resolveExerciseDemo(block.exercise)
          const hasAnimation = Boolean(blockDemo.animationSrc)
          const isDone = completedBlocks.includes(index)
          const loadKey = `${week}-${letter}-${block.id}`
          const savedLoad = state.workoutLoads[loadKey]
          const loadValue = savedLoad?.value ?? block.load ?? ''
          const loadUnit: LoadUnit = savedLoad?.unit ?? block.loadUnit ?? 'kg'
          return (
            <article
              key={block.id}
              className={`card block-card${workoutLocked ? ' is-locked' : ''}${isDone ? ' is-done' : ''}`}
            >
              <div className="block-num" aria-hidden>
                {String(block.id).padStart(2, '0')}
              </div>
              <div className="block-body">
                <div className="block-head">
                  <div className="block-head-copy">
                    <div className="block-title-copy">
                      <p className="block-kicker">Bloco {String(block.id).padStart(2, '0')}</p>
                      <h3>{block.exercise}</h3>
                    </div>
                    <div className="block-meta">
                      <span className="block-chip block-chip-sets">{block.sets}</span>
                    </div>
                  </div>
                  {hasAnimation ? (
                    <button
                      type="button"
                      className="block-anim-thumb"
                      aria-label={`Ver animação de ${block.exercise}`}
                      title="Ver animação"
                      onClick={() => setDemo(blockDemo)}
                    >
                      <video
                        src={blockDemo.animationSrc}
                        autoPlay
                        loop
                        muted
                        playsInline
                        aria-hidden
                      />
                    </button>
                  ) : null}
                </div>

                <div className="block-details">
                  <div className="block-detail block-detail-load">
                    <span className="block-detail-label" id={`load-label-${loadKey}`}>
                      Carga
                    </span>
                    <div
                      className="block-load-controls"
                      role="group"
                      aria-labelledby={`load-label-${loadKey}`}
                    >
                      <input
                        id={`load-${loadKey}`}
                        className="block-load-input"
                        value={loadValue}
                        inputMode="decimal"
                        placeholder="0"
                        aria-label={`Carga de ${block.exercise}`}
                        onChange={(e) =>
                          dispatch({
                            type: 'SET_WORKOUT_LOAD',
                            key: loadKey,
                            value: e.target.value,
                            unit: loadUnit,
                          })
                        }
                      />
                      <div className="block-load-units" role="group" aria-label="Unidade da carga">
                        {([
                          ['kg', 'KG'],
                          ['placas', 'Placas'],
                        ] as const).map(([unit, label]) => (
                          <button
                            key={unit}
                            type="button"
                            className={loadUnit === unit ? 'active' : ''}
                            onClick={() =>
                              dispatch({
                                type: 'SET_WORKOUT_LOAD',
                                key: loadKey,
                                value: loadValue,
                                unit,
                              })
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="block-detail-stack">
                    <div className="block-detail-stack-copy">
                      <div className="block-detail block-detail-inline">
                        <span className="block-detail-label">Cardio ativo</span>
                        <span className="block-detail-value">{block.activeCardio}</span>
                      </div>
                      <div className="block-detail block-detail-inline">
                        <span className="block-detail-label">Depois</span>
                        <span className="block-detail-value">{block.after}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`block-rest-timer-btn${workoutLocked || isDone ? ' is-locked' : ''}`}
                      aria-label={
                        isDone
                          ? `Bloco concluído · ${block.exercise}`
                          : workoutLocked
                            ? `Cronômetro bloqueado · treino do dia é ${ctx.letter ?? '—'}`
                            : `Iniciar cronômetro de descanso · ${block.exercise}`
                      }
                      title={
                        isDone
                          ? 'Bloco concluído'
                          : workoutLocked
                            ? `Bloqueado · hoje é Treino ${ctx.letter ?? '—'}`
                            : 'Cronômetro de descanso'
                      }
                      disabled={workoutLocked || isDone}
                      onClick={() => {
                        if (workoutLocked || isDone) return
                        openTimerForBlock(index, 'after-set')
                      }}
                    >
                      <TimerIcon />
                    </button>
                  </div>
                </div>
              </div>
              {isDone ? (
                <>
                  <div className="block-done-overlay" aria-hidden />
                  <div className="deck-banner deck-banner-diagonal deck-banner-done block-done-banner">
                    <span>Concluído</span>
                  </div>
                </>
              ) : null}
            </article>
          )
        })}
      </div>

      {timerSession && activeTimerBlock && activeTimerDemo ? (
        <WorkoutTimer
          key={`${timerSession.blockIndex}-${timerSession.entry}-${activeTimerBlock.exercise}`}
          restSeconds={parseRestSeconds(activeTimerBlock.after)}
          totalSets={parseSetsCount(activeTimerBlock.sets)}
          exerciseName={activeTimerBlock.exercise}
          loadValue={activeTimerLoadValue}
          loadUnit={activeTimerLoadUnit}
          activeCardio={activeTimerBlock.activeCardio}
          afterText={activeTimerBlock.after}
          stillSrc={
            activeTimerDemo.animationSrc
              ? activeTimerDemo.animationSrc.replace(/-animacao\.mp4$/i, '-boneco.jpg')
              : undefined
          }
          animationSrc={activeTimerDemo.animationSrc}
          entry={timerSession.entry}
          allowDevSkipRest={import.meta.env.DEV || state.devMode}
          onClose={() => setTimerSession(null)}
          onAllSetsComplete={handleBlockComplete}
        />
      ) : null}

      {blockReward ? (
        <CoinRewardCelebration
          amount={BLOCK_COMPLETE_COINS}
          fromBalance={blockReward.fromBalance}
          toBalance={blockReward.toBalance}
          eyebrow="Sucesso"
          missionTitle="Bloco concluído com sucesso"
          missionKind={`${blockReward.blockLabel} · ${blockReward.exerciseName}`}
          onBalanceChange={setDisplayCoins}
          onDone={finishBlockReward}
        />
      ) : null}

      {demo ? <ExerciseDemoModal demo={demo} onClose={() => setDemo(null)} /> : null}

      {markDoneWarn
        ? createPortal(
            <div
              className="workout-mark-warn"
              role="dialog"
              aria-modal="true"
              aria-labelledby="workout-mark-warn-title"
            >
              <button
                type="button"
                className="workout-mark-warn-backdrop"
                aria-label="Fechar aviso"
                onClick={() => setMarkDoneWarn(false)}
              />
              <div className="card workout-mark-warn-card">
                <p className="eyebrow">Aviso</p>
                <h2 id="workout-mark-warn-title" className="display h2">
                  Marcar treino como feito?
                </h2>
                <p className="workout-mark-warn-text">
                  Se você não seguir o fluxo de treinamento do sistema (blocos com cronômetro),
                  perde as moedas extras de cada bloco concluído.
                </p>
                <p className="workout-mark-warn-coins">
                  <CoinIcon size={18} />
                  <span>
                    Bônus em risco: <strong>+{formatCoins(blockBonusTotal)}</strong> moedas
                    ({workout.blocks.length} blocos × {BLOCK_COMPLETE_COINS})
                  </span>
                </p>
                <div className="workout-mark-warn-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setMarkDoneWarn(false)}
                  >
                    Voltar ao fluxo
                  </button>
                  <button type="button" className="btn btn-primary" onClick={confirmMarkDone}>
                    Continuar mesmo assim
                  </button>
                </div>
              </div>
            </div>,
            document.querySelector('.phone-app') ?? document.body,
          )
        : null}
    </div>
  )
}
