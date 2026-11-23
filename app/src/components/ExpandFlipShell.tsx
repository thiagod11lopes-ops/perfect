import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

export type CardOrigin = {
  top: number
  left: number
  width: number
  height: number
}

export const EXPAND_MS = 420
export const FLIP_MS = 560

export function measureCardOrigin(el: HTMLElement): CardOrigin {
  const root = document.querySelector('.phone-app') as HTMLElement | null
  const er = el.getBoundingClientRect()
  // Fora do celular: modal é position:fixed → coords na viewport.
  if (!root) {
    return {
      top: er.top,
      left: er.left,
      width: er.width,
      height: er.height,
    }
  }
  const rr = root.getBoundingClientRect()
  return {
    top: er.top - rr.top,
    left: er.left - rr.left,
    width: er.width,
    height: er.height,
  }
}

type Motion = 'origin' | 'grow' | 'flip' | 'unflip' | 'shrink'

export function ExpandFlipShell({
  origin,
  label,
  busy = false,
  frontClassName = '',
  children,
  onExited,
}: {
  origin: CardOrigin
  label: string
  busy?: boolean
  frontClassName?: string
  children: (requestClose: () => void) => ReactNode
  onExited: () => void
}) {
  const [motion, setMotion] = useState<Motion>('origin')
  const [ready, setReady] = useState(false)
  const exiting = useRef(false)

  useEffect(() => {
    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      setReady(true)
      raf2 = window.requestAnimationFrame(() => setMotion('grow'))
    })
    const flipTimer = window.setTimeout(() => setMotion('flip'), EXPAND_MS + 30)
    // Fallback: se o primeiro timer for limpo por remount/StrictMode, garante o flip.
    const flipFallback = window.setTimeout(() => {
      setMotion((m) => (m === 'origin' || m === 'grow' ? 'flip' : m))
    }, EXPAND_MS + 120)
    return () => {
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)
      window.clearTimeout(flipTimer)
      window.clearTimeout(flipFallback)
    }
  }, [])

  const requestClose = () => {
    if (busy || exiting.current) return
    if (motion !== 'flip') return
    exiting.current = true
    setMotion('unflip')
    window.setTimeout(() => setMotion('shrink'), FLIP_MS)
    window.setTimeout(() => onExited(), FLIP_MS + EXPAND_MS + 40)
  }

  useEffect(() => {
    if (motion !== 'flip' || busy) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const atOrigin = motion === 'origin' || motion === 'shrink'
  const flipped = motion === 'flip'

  const stageStyle: CSSProperties = atOrigin
    ? {
        top: origin.top,
        left: origin.left,
        width: origin.width,
        height: origin.height,
      }
    : {
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }

  return (
    <div
      className={`deck-modal deck-modal-expand is-${motion}${ready ? ' is-ready' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button
        type="button"
        className="deck-modal-backdrop"
        aria-label="Fechar"
        onClick={requestClose}
      />
      <div
        className={`deck-modal-stage${atOrigin ? ' is-from-origin' : ' is-expanded'}${flipped ? ' is-flipped' : ''}`}
        style={stageStyle}
      >
        <div className="deck-modal-flip">
          <div className="deck-modal-face deck-modal-back">
            <div className="deck-back-pattern" />
            <span className="deck-back-logo deck-back-logo-lg" aria-hidden>
              <img src="/card-seal.webp" alt="" />
            </span>
          </div>
          <div className={`deck-modal-face deck-modal-front ${frontClassName}`.trim()}>
            {children(requestClose)}
          </div>
        </div>
      </div>
    </div>
  )
}
