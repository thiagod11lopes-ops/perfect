import { useCallback, useEffect, useRef, useState } from 'react'
import { LeverGraphic } from './LeverGraphic'
import styles from './styles.module.scss'

type SlotLeverProps = {
  disabled?: boolean
  /** Pulsa brilho na alavanca quando parada e habilitada (embed Perfect). */
  idleHintEnabled?: boolean
  idleHintFirstDelayMs?: number
  idleHintPulseMs?: number
  idleHintBetweenPulsesMs?: number
  onPull: () => void
}

const PULL_MS = 420
const IDLE_FIRST_WAIT_MS = 5000
const IDLE_PULSE_MS = 1650
const IDLE_BETWEEN_PULSES_MS = 3000

/** Alavanca à direita da roleta: desce, sobe e dispara o giro. */
const SlotLever: React.FC<SlotLeverProps> = ({
  disabled = false,
  idleHintEnabled = false,
  idleHintFirstDelayMs = IDLE_FIRST_WAIT_MS,
  idleHintPulseMs = IDLE_PULSE_MS,
  idleHintBetweenPulsesMs = IDLE_BETWEEN_PULSES_MS,
  onPull,
}) => {
  const [pulling, setPulling] = useState(false)
  const [idleHint, setIdleHint] = useState(false)
  const timersRef = useRef<number[]>([])
  const cycleGenRef = useRef(0)

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }, [])

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timersRef.current.push(id)
  }, [])

  useEffect(() => {
    cycleGenRef.current += 1
    const generation = cycleGenRef.current
    const isActive = () => generation === cycleGenRef.current

    clearAllTimers()
    setIdleHint(false)

    if (disabled || !idleHintEnabled || pulling) {
      return () => clearAllTimers()
    }

    const queuePulse = (first: boolean) => {
      if (!isActive()) return
      const wait = first ? idleHintFirstDelayMs : idleHintBetweenPulsesMs
      schedule(() => {
        if (!isActive()) return
        setIdleHint(true)
        schedule(() => {
          if (!isActive()) return
          setIdleHint(false)
          queuePulse(false)
        }, idleHintPulseMs)
      }, wait)
    }

    queuePulse(true)

    return () => {
      cycleGenRef.current += 1
      clearAllTimers()
      setIdleHint(false)
    }
  }, [
    clearAllTimers,
    disabled,
    idleHintBetweenPulsesMs,
    idleHintEnabled,
    idleHintFirstDelayMs,
    idleHintPulseMs,
    pulling,
    schedule,
  ])

  const handlePull = useCallback(() => {
    if (disabled || pulling) return
    cycleGenRef.current += 1
    clearAllTimers()
    setIdleHint(false)
    setPulling(true)
    onPull()
    window.setTimeout(() => setPulling(false), PULL_MS)
  }, [clearAllTimers, disabled, pulling, onPull])

  return (
    <button
      type="button"
      className={`${styles.lever}${pulling ? ` ${styles['lever--pulling']}` : ''}${
        idleHint ? ` ${styles['lever--idle-hint']}` : ''
      }${disabled ? ` ${styles['lever--disabled']}` : ''}`}
      aria-label="Puxar alavanca"
      title="Puxar alavanca"
      disabled={disabled || pulling}
      onClick={handlePull}
    >
      <LeverGraphic className={styles.lever__img} />
    </button>
  )
}

export { SlotLever }