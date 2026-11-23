import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Phase =
  | 'rest'
  | 'prompt'
  | 'play'
  | 'cardio-prompt'
  | 'cardio-play'
  | 'continuous-prompt'
  | 'continuous-play'

/** O que vem depois do descanso. */
type AfterRest = 'prompt' | 'cardio-prompt' | 'continuous-prompt' | 'complete'

function format(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Extrai segundos de descanso a partir do texto “Depois” (ex.: “1 min descanso + …”). */
export function parseRestSeconds(after: string, fallback = 60): number {
  const m = /(\d+)\s*min(?:uto)?s?\s*descanso/i.exec(after)
  if (m) return Math.max(1, Number(m[1]) * 60)
  const sec = /(\d+)\s*s(?:eg(?:undos?)?)?\s*descanso/i.exec(after)
  if (sec) return Math.max(1, Number(sec[1]))
  return fallback
}

/** Extrai o número de séries de textos como “3 × 10 • força”. */
export function parseSetsCount(sets: string, fallback = 3): number {
  const m = /(\d+)\s*[x×]/i.exec(sets)
  if (m) return Math.max(1, Number(m[1]))
  return fallback
}

/** Extrai nome + rounds × segundos de “Polichinelos | 2 × 45 s”. */
export function parseActiveCardio(activeCardio: string): {
  name: string
  rounds: number
  seconds: number
} {
  const raw = activeCardio.trim()
  const timed =
    /^(.+?)\s*\|\s*(\d+)\s*[x×]\s*(\d+)\s*s(?:eg(?:undos?)?)?\s*$/i.exec(raw) ||
    /^(.+?)\s+(\d+)\s*[x×]\s*(\d+)\s*s(?:eg(?:undos?)?)?\s*$/i.exec(raw)
  if (timed) {
    return {
      name: timed[1].trim(),
      rounds: Math.max(1, Number(timed[2])),
      seconds: Math.max(1, Number(timed[3])),
    }
  }
  const onlyTime = /(\d+)\s*[x×]\s*(\d+)\s*s(?:eg(?:undos?)?)?/i.exec(raw)
  if (onlyTime) {
    return {
      name: raw.replace(onlyTime[0], '').replace(/\|/g, '').trim() || 'Cardio ativo',
      rounds: Math.max(1, Number(onlyTime[1])),
      seconds: Math.max(1, Number(onlyTime[2])),
    }
  }
  return { name: raw || 'Cardio ativo', rounds: 1, seconds: 45 }
}

/** Extrai cardio contínuo de “1 min descanso + 3 min esteira”. */
export function parseContinuousCardio(after: string): { name: string; seconds: number } {
  const m =
    /(\d+)\s*min(?:uto)?s?\s+(esteira|bicicleta|el[ií]ptico|bike|marcha(?:\s+\w+)*)/i.exec(
      after,
    )
  if (m) {
    const raw = m[2]
    const name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
    return { name, seconds: Math.max(1, Number(m[1]) * 60) }
  }
  return { name: 'Cardio contínuo', seconds: 180 }
}

export function TimerIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 2.75h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 2.75v2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="13.25" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 9.5v4l2.6 1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="rest-timer-play-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72L19.12 12 8 5.14Z" />
    </svg>
  )
}

function lockScroll() {
  const body = document.body
  const phone = document.querySelector('.phone-app') as HTMLElement | null
  const mains = [
    ...document.querySelectorAll<HTMLElement>('.phone-app .mobile-main, .phone-app .main, .app-shell'),
  ]
  const prev = {
    bodyOverflow: body.style.overflow,
    bodyTouch: body.style.touchAction,
    phoneOverflow: phone?.style.overflow ?? '',
    mains: mains.map((el) => ({
      el,
      overflow: el.style.overflow,
      overflowY: el.style.overflowY,
      touchAction: el.style.touchAction,
    })),
  }
  body.style.overflow = 'hidden'
  body.style.touchAction = 'none'
  if (phone) phone.style.overflow = 'hidden'
  mains.forEach((el) => {
    el.style.overflow = 'hidden'
    el.style.overflowY = 'hidden'
    el.style.touchAction = 'none'
  })
  return () => {
    body.style.overflow = prev.bodyOverflow
    body.style.touchAction = prev.bodyTouch
    if (phone) phone.style.overflow = prev.phoneOverflow
    prev.mains.forEach(({ el, overflow, overflowY, touchAction }) => {
      el.style.overflow = overflow
      el.style.overflowY = overflowY
      el.style.touchAction = touchAction
    })
  }
}

function ordinalSetLabel(n: number) {
  return `${n}ª`
}

function formatLoadLabel(value?: string, unit?: 'kg' | 'placas') {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  return unit === 'placas' ? `${raw} placas` : `${raw} kg`
}

export function WorkoutTimer({
  restSeconds,
  totalSets,
  exerciseName,
  activeCardio,
  afterText,
  stillSrc,
  animationSrc,
  loadValue,
  loadUnit = 'kg',
  entry = 'after-set',
  allowDevSkipRest = false,
  onClose,
  onAllSetsComplete,
}: {
  restSeconds: number
  totalSets: number
  exerciseName: string
  activeCardio: string
  afterText: string
  stillSrc?: string
  animationSrc?: string
  loadValue?: string
  loadUnit?: 'kg' | 'placas'
  /** fresh = 1ª série · after-set = descanso entre séries · transition = descanso entre blocos */
  entry?: 'after-set' | 'fresh' | 'transition'
  /** Seta DEV para zerar o descanso na hora. */
  allowDevSkipRest?: boolean
  onClose: () => void
  onAllSetsComplete?: () => void
}) {
  const cardio = useMemo(() => parseActiveCardio(activeCardio), [activeCardio])
  const continuous = useMemo(() => parseContinuousCardio(afterText), [afterText])

  const startsOnRest = entry !== 'fresh'
  const initialSet = entry === 'after-set' ? 2 : 1

  const [phase, setPhase] = useState<Phase>(startsOnRest ? 'rest' : 'prompt')
  const [nextSet, setNextSet] = useState(initialSet)
  const [cardioRound, setCardioRound] = useState(1)
  const [left, setLeft] = useState(Math.max(1, restSeconds))
  const [running, setRunning] = useState(startsOnRest)
  const [restPreview, setRestPreview] = useState(
    startsOnRest
      ? entry === 'transition'
        ? `Próximo bloco: ${exerciseName} · 1 de ${totalSets}`
        : `Próxima série: ${exerciseName} · 2 de ${totalSets}`
      : '',
  )
  /** No descanso, anima o próximo exercício de força quando for o caso. */
  const [restShowsExercise, setRestShowsExercise] = useState(startsOnRest)

  const restSecondsRef = useRef(Math.max(1, restSeconds))
  restSecondsRef.current = Math.max(1, restSeconds)
  const afterRestRef = useRef<AfterRest>('prompt')
  const cardioRoundRef = useRef(1)
  const zeroHandledRef = useRef(false)
  const onAllSetsCompleteRef = useRef(onAllSetsComplete)
  onAllSetsCompleteRef.current = onAllSetsComplete
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const finishBlock = () => {
    if (onAllSetsCompleteRef.current) onAllSetsCompleteRef.current()
    else onCloseRef.current()
  }

  const previewFor = (after: AfterRest, followingSet: number | null, round: number) => {
    if (after === 'prompt' && followingSet != null) {
      return `Próxima série: ${exerciseName} · ${followingSet} de ${totalSets}`
    }
    if (after === 'cardio-prompt') {
      return `Próxima série: ${cardio.name} ${cardio.seconds}s · ${round} de ${cardio.rounds}`
    }
    if (after === 'continuous-prompt') {
      return `Próxima série: ${continuous.name} ${Math.round(continuous.seconds / 60)} min`
    }
    return ''
  }

  /** Cronômetro = somente descanso. */
  const beginRest = (followingSet: number | null, after: AfterRest) => {
    if (followingSet != null) setNextSet(followingSet)
    afterRestRef.current = after
    setRestShowsExercise(after === 'prompt')
    setRestPreview(previewFor(after, followingSet, cardioRoundRef.current))
    zeroHandledRef.current = false
    setLeft(restSecondsRef.current)
    setRunning(true)
    setPhase('rest')
  }

  const showCardioPrompt = (round: number) => {
    cardioRoundRef.current = round
    setCardioRound(round)
    setRunning(false)
    setPhase('cardio-prompt')
  }

  const showContinuousPrompt = () => {
    setRunning(false)
    setPhase('continuous-prompt')
  }

  useEffect(() => {
    const unlock = lockScroll()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const blockTouchScroll = (e: TouchEvent) => {
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('touchmove', blockTouchScroll, { passive: false })
    return () => {
      unlock()
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('touchmove', blockTouchScroll)
    }
  }, [onClose])

  // Countdown só no descanso
  useEffect(() => {
    if (phase !== 'rest' || !running) return
    const id = window.setInterval(() => {
      setLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase, running])

  // Transições quando o cronômetro de descanso zera
  useEffect(() => {
    if (left > 0) {
      zeroHandledRef.current = false
      return
    }
    if (phase !== 'rest') return
    if (zeroHandledRef.current) return
    zeroHandledRef.current = true
    setRunning(false)

    const after = afterRestRef.current
    if (after === 'prompt') {
      if (nextSet > totalSets) {
        onCloseRef.current()
        return
      }
      setPhase('prompt')
      return
    }
    if (after === 'cardio-prompt') {
      showCardioPrompt(cardioRoundRef.current)
      return
    }
    if (after === 'continuous-prompt') {
      showContinuousPrompt()
      return
    }
    finishBlock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase])

  const onOkPrompt = () => setPhase('play')

  const onPlayDone = () => {
    if (nextSet >= totalSets) {
      // última série → descanso → polichinelos 1/N
      cardioRoundRef.current = 1
      setCardioRound(1)
      beginRest(null, 'cardio-prompt')
      return
    }
    beginRest(nextSet + 1, 'prompt')
  }

  const onCardioOk = () => setPhase('cardio-play')

  const onCardioPlayDone = () => {
    const round = cardioRoundRef.current
    if (round < cardio.rounds) {
      // descanso → próximo round de cardio ativo
      cardioRoundRef.current = round + 1
      setCardioRound(round + 1)
      beginRest(null, 'cardio-prompt')
      return
    }
    // último round → descanso → esteira (OK + Play, sem cronômetro)
    beginRest(null, 'continuous-prompt')
  }

  const onContinuousOk = () => setPhase('continuous-play')

  const onContinuousPlayDone = () => {
    finishBlock()
  }

  const still = stillSrc || (animationSrc ? animationSrc.replace(/-animacao\.mp4$/i, '-boneco.jpg') : undefined)
  const loadLabel = formatLoadLabel(loadValue, loadUnit)

  const skipRest = () => {
    if (phase !== 'rest') return
    zeroHandledRef.current = false
    setRunning(false)
    setLeft(0)
  }

  const node = (
    <div
      className="rest-timer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Cronômetro do bloco"
      onTouchMove={(e) => e.preventDefault()}
    >
      <button type="button" className="rest-timer-close" onClick={onClose} aria-label="Fechar">
        ×
      </button>

      {allowDevSkipRest && phase === 'rest' ? (
        <button
          type="button"
          className="rest-timer-dev-skip"
          onClick={skipRest}
          aria-label="DEV · pular descanso"
          title="DEV · pular descanso"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
            <path d="M5.5 5.5v13l8.5-6.5L5.5 5.5Zm9.5 0v13h2.5V5.5H15Z" />
          </svg>
        </button>
      ) : null}

      {phase === 'rest' ? (
        <button
          type="button"
          className="rest-timer-display"
          onClick={() => setRunning((r) => !r)}
          aria-label={running ? 'Pausar' : 'Continuar'}
        >
          <span className="rest-timer-kicker">Descanso</span>
          <span className="rest-timer-time">{format(left)}</span>
          {restShowsExercise && animationSrc ? (
            <span className="rest-timer-next-media">
              <video
                className="rest-timer-next-anim"
                src={animationSrc}
                autoPlay
                loop
                muted
                playsInline
                aria-label={`Próximo exercício: ${exerciseName}`}
              />
            </span>
          ) : restShowsExercise && still ? (
            <span className="rest-timer-next-media">
              <img
                className="rest-timer-next-anim"
                src={still}
                alt={`Próximo exercício: ${exerciseName}`}
              />
            </span>
          ) : null}
          {restPreview ? <span className="rest-timer-preview">{restPreview}</span> : null}
          <span className="rest-timer-hint">{running ? 'toque para pausar' : 'toque para continuar'}</span>
        </button>
      ) : null}

      {phase === 'prompt' ? (
        <div className="rest-timer-prompt">
          {animationSrc ? (
            <video
              className="rest-timer-still"
              src={animationSrc}
              autoPlay
              loop
              muted
              playsInline
              aria-label={exerciseName}
            />
          ) : still ? (
            <img className="rest-timer-still" src={still} alt={exerciseName} />
          ) : (
            <div className="rest-timer-still rest-timer-still-fallback" aria-hidden />
          )}
          <p className="rest-timer-set-msg">Inicie a {ordinalSetLabel(nextSet)} Série</p>
          <p className="rest-timer-exercise">
            <span>{exerciseName}</span>
            {loadLabel ? <span className="rest-timer-load">{loadLabel}</span> : null}
          </p>
          <p className="rest-timer-sets-meta">
            Série {nextSet} de {totalSets}
          </p>
          <button type="button" className="btn btn-primary rest-timer-ok" onClick={onOkPrompt}>
            Iniciar Exercício
          </button>
        </div>
      ) : null}

      {phase === 'play' ? (
        <div className="rest-timer-play-stage">
          {animationSrc ? (
            <video
              className="rest-timer-play-video"
              src={animationSrc}
              autoPlay
              loop
              muted
              playsInline
              aria-label={exerciseName}
            />
          ) : still ? (
            <img className="rest-timer-play-video" src={still} alt={exerciseName} />
          ) : (
            <div className="rest-timer-play-video rest-timer-still-fallback" aria-hidden />
          )}
          <p className="rest-timer-play-exercise">
            <span>{exerciseName}</span>
            {loadLabel ? <span className="rest-timer-load">{loadLabel}</span> : null}
          </p>
          <button
            type="button"
            className="rest-timer-play"
            onClick={onPlayDone}
            aria-label="Concluir série e iniciar descanso"
          >
            <span className="rest-timer-play-triangle">
              <PlayIcon />
            </span>
            <span className="rest-timer-play-label">Aperte play para iniciar o tempo de descanso</span>
          </button>
        </div>
      ) : null}

      {phase === 'cardio-prompt' ? (
        <div className="rest-timer-prompt rest-timer-cardio">
          <p className="rest-timer-kicker">Cardio ativo</p>
          <p className="rest-timer-set-msg">
            {cardioRound} de {cardio.rounds}
          </p>
          <p className="rest-timer-cardio-task">
            {cardio.name} {cardio.seconds}s
          </p>
          <p className="rest-timer-sets-meta">
            {cardioRound} de {cardio.rounds} · {cardio.rounds}×{cardio.seconds}s · faça e toque OK
          </p>
          <button type="button" className="btn btn-primary rest-timer-ok" onClick={onCardioOk}>
            OK
          </button>
        </div>
      ) : null}

      {phase === 'cardio-play' ? (
        <div className="rest-timer-play-stage">
          {animationSrc ? (
            <video
              className="rest-timer-play-video"
              src={animationSrc}
              autoPlay
              loop
              muted
              playsInline
              aria-label={exerciseName}
            />
          ) : still ? (
            <img className="rest-timer-play-video" src={still} alt={exerciseName} />
          ) : (
            <div className="rest-timer-play-video rest-timer-still-fallback" aria-hidden />
          )}
          <p className="rest-timer-play-exercise">
            <span>{exerciseName}</span>
            {loadLabel ? <span className="rest-timer-load">{loadLabel}</span> : null}
          </p>
          <button
            type="button"
            className="rest-timer-play"
            onClick={onCardioPlayDone}
            aria-label="Concluir cardio ativo e iniciar descanso"
          >
            <span className="rest-timer-play-triangle">
              <PlayIcon />
            </span>
            <span className="rest-timer-play-label">
              Aperte play para iniciar o tempo de descanso
            </span>
          </button>
        </div>
      ) : null}

      {phase === 'continuous-prompt' ? (
        <div className="rest-timer-prompt rest-timer-cardio">
          <p className="rest-timer-kicker">Cardio contínuo</p>
          <p className="rest-timer-set-msg">{continuous.name}</p>
          <p className="rest-timer-cardio-task">
            {Math.round(continuous.seconds / 60)} min · {continuous.name}
          </p>
          <p className="rest-timer-sets-meta">Faça e toque OK</p>
          <button type="button" className="btn btn-primary rest-timer-ok" onClick={onContinuousOk}>
            OK
          </button>
        </div>
      ) : null}

      {phase === 'continuous-play' ? (
        <button
          type="button"
          className="rest-timer-play"
          onClick={onContinuousPlayDone}
          aria-label="Concluir cardio contínuo"
        >
          <span className="rest-timer-play-triangle">
            <PlayIcon />
          </span>
          <span className="rest-timer-play-label">
            Aperte play ao terminar · {continuous.name}
          </span>
        </button>
      ) : null}
    </div>
  )

  return createPortal(node, document.querySelector('.phone-app') ?? document.body)
}
