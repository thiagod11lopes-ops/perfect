import { useCallback, useEffect, useMemo, useRef } from 'react'
import { publicUrl } from '../utils/publicUrl'
import type { SpecialRouletteOutcome, SpecialRouletteStake } from '../data/specialCardRoulette'

const SLOT_MSG = 'perfect-slot'

export type SlotSpinMessage = {
  spin: number
  maxSpins: number
  spinIndex?: number
  isWin?: boolean
  spinAmount?: number
}

type SlotMachineEmbedProps = {
  stake: SpecialRouletteStake
  potBalance: number
  outcome: SpecialRouletteOutcome
  sessionKey?: string
  onReady?: () => void
  onSpin?: (msg: SlotSpinMessage) => void
  onComplete: () => void
}

export function SlotMachineEmbed({
  stake,
  potBalance,
  outcome,
  sessionKey,
  onReady,
  onSpin,
  onComplete,
}: SlotMachineEmbedProps) {
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete
  const onSpinRef = useRef(onSpin)
  onSpinRef.current = onSpin
  const outcomeRef = useRef(outcome)
  outcomeRef.current = outcome
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const handledCompleteRef = useRef(false)
  const potRef = useRef(potBalance)
  potRef.current = potBalance

  const pushEmbedSession = useCallback(() => {
    const o = outcomeRef.current
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: SLOT_MSG,
        type: 'perfect-slot:session',
        kind: o.kind,
        spinAmounts: o.spinAmounts,
        spinHorizontalMatches: o.spinHorizontalMatches,
        spinPotDeltas: o.spinPotDeltas,
        pot: potRef.current,
        stake,
      },
      '*',
    )
  }, [stake])

  const src = useMemo(() => {
    const q = new URLSearchParams({
      embed: '1',
      skipLoader: '1',
      maxSpins: '3',
      stake: String(stake),
    })
    return `${publicUrl('/games/slot-machine/index.html')}?${q.toString()}`
  }, [stake, sessionKey])

  useEffect(() => {
    handledCompleteRef.current = false
    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (typeof data !== 'object' || data === null || data.source !== SLOT_MSG) return
      if (data.type === 'perfect-slot:ready') {
        pushEmbedSession()
        onReady?.()
        return
      }
      if (data.type === 'perfect-slot:spin' && typeof data.spin === 'number') {
        onSpinRef.current?.({
          spin: data.spin,
          maxSpins: Number(data.maxSpins) || 3,
          spinIndex: typeof data.spinIndex === 'number' ? data.spinIndex : undefined,
          isWin: data.isWin === true,
          spinAmount: typeof data.spinAmount === 'number' ? data.spinAmount : undefined,
        })
        return
      }
      if (data.type === 'perfect-slot:complete') {
        if (handledCompleteRef.current) return
        handledCompleteRef.current = true
        completeRef.current()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [src, onReady, pushEmbedSession])

  return (
    <div className="slot-machine-embed-host" data-roulette-coin-origin>
      <iframe
        ref={iframeRef}
        key={src}
        className="day-game-frame day-game-frame--slot-lever"
        title="Roleta da sorte"
        src={src}
        allow="autoplay"
      />
    </div>
  )
}