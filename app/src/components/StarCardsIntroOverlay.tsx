import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { CoinCelebrationFireworks } from './CoinCelebrationFireworks'

export const STAR_FLIGHT_MS = 2600

type StarCardsFlightProps = {
  active: boolean
  fieldRef: RefObject<HTMLElement | null>
  onComplete: () => void
  children: ReactNode
}

function getScrollRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.phone-app .mobile-main')
}

function getPhoneScreen(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.phone-screen')
}

/** Fogos em portal no `.phone-screen` — visíveis durante todo o voo. */
export function StarCardsFlightFireworks({ active }: { active: boolean }) {
  const [root, setRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) {
      setRoot(null)
      return
    }
    setRoot(document.querySelector<HTMLElement>('.phone-screen'))
  }, [active])

  if (!active || !root) return null

  return createPortal(
    <div
      className="deck-stars-coin-fireworks-layer"
      style={{ ['--roulette-pace' as string]: '1' }}
      aria-hidden
    >
      <CoinCelebrationFireworks />
    </div>,
    root,
  )
}

/** Anima cartas do topo do telefone até o slot real, com scroll acompanhando. */
export function StarCardsFlightLayer({
  active,
  fieldRef,
  onComplete,
}: Omit<StarCardsFlightProps, 'children'>) {
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const rafRef = useRef(0)

  useEffect(() => {
    if (!active) return

    let cancelled = false

    const run = () => {
      const field = fieldRef.current
      const scrollEl = getScrollRoot()
      const phoneScreen = getPhoneScreen()
      if (!field || !scrollEl || !phoneScreen) {
        onCompleteRef.current()
        return
      }

      const items = Array.from(
        field.querySelectorAll<HTMLElement>('.deck-star-flight-item'),
      )
      if (items.length === 0) {
        onCompleteRef.current()
        return
      }

      scrollEl.scrollTop = 0

      requestAnimationFrame(() => {
        if (cancelled) return

        const placeholders = items.map((el) => {
          const ph = document.createElement('div')
          ph.className = 'deck-star-flight-placeholder'
          ph.style.width = `${el.offsetWidth}px`
          ph.style.minHeight = `${el.offsetHeight}px`
          el.insertAdjacentElement('afterend', ph)
          return ph
        })

        const screenRect = phoneScreen.getBoundingClientRect()
        const startTop = screenRect.top + 36
        const scrollStart = 0
        const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
        const fieldTop = field.offsetTop
        const scrollEnd = Math.min(
          maxScroll,
          Math.max(0, fieldTop + field.offsetHeight - scrollEl.clientHeight + 28),
        )

        const originals = items.map((el) => ({
          position: el.style.position,
          top: el.style.top,
          left: el.style.left,
          width: el.style.width,
          zIndex: el.style.zIndex,
          transform: el.style.transform,
          margin: el.style.margin,
          filter: el.style.filter,
        }))

        const firstEnds = placeholders.map((ph) => ph.getBoundingClientRect())

        items.forEach((el, i) => {
          const end = firstEnds[i]
          el.classList.add('deck-star-flight-active')
          el.style.position = 'fixed'
          el.style.margin = '0'
          el.style.width = `${end.width}px`
          el.style.left = `${end.left}px`
          el.style.top = `${startTop}px`
          el.style.zIndex = '420'
          el.style.transform = 'scale(0.86) rotate(-7deg)'
        })

        field.classList.add('is-flight-running')

        const duration = STAR_FLIGHT_MS
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
        let startTime: number | null = null

        const frame = (now: number) => {
          if (cancelled) return
          if (startTime == null) startTime = now
          const t = Math.min(1, (now - startTime) / duration)
          const e = easeOutCubic(t)

          scrollEl.scrollTop = scrollStart + (scrollEnd - scrollStart) * e

          items.forEach((el, i) => {
            const end = placeholders[i]!.getBoundingClientRect()
            const y = startTop + (end.top - startTop) * e
            const scale = 0.86 + 0.14 * e
            const rot = -7 + 7 * e
            el.style.top = `${y}px`
            el.style.left = `${end.left}px`
            el.style.width = `${end.width}px`
            el.style.transform = `scale(${scale}) rotate(${rot}deg)`
            el.style.filter = `brightness(${1.25 + 0.4 * Math.sin(t * Math.PI)})`
          })

          if (t < 1) {
            rafRef.current = requestAnimationFrame(frame)
          } else {
            items.forEach((el, i) => {
              const o = originals[i]
              el.classList.remove('deck-star-flight-active')
              el.style.position = o.position
              el.style.top = o.top
              el.style.left = o.left
              el.style.width = o.width
              el.style.zIndex = o.zIndex
              el.style.transform = o.transform
              el.style.margin = o.margin
              el.style.filter = o.filter
            })
            placeholders.forEach((ph) => ph.remove())
            field.classList.remove('is-flight-running')
            scrollEl.scrollTop = scrollEnd
            onCompleteRef.current()
          }
        }

        rafRef.current = requestAnimationFrame(frame)
      })
    }

    const t0 = window.setTimeout(run, 48)

    return () => {
      cancelled = true
      window.clearTimeout(t0)
      cancelAnimationFrame(rafRef.current)
      const field = fieldRef.current
      field?.classList.remove('is-flight-running')
      field
        ?.querySelectorAll<HTMLElement>('.deck-star-flight-item')
        .forEach((el) => {
          el.classList.remove('deck-star-flight-active')
          el.style.cssText = ''
        })
    }
  }, [active, fieldRef])

  return null
}

/** Campo placeholder no fluxo — cartas voam do topo até aqui. */
export function StarCardsFlightField({
  active,
  fieldRef,
  onComplete,
  children,
}: StarCardsFlightProps) {
  if (!active) return null

  return (
    <section
      ref={fieldRef}
      className="deck-stars-field deck-stars-field--flight"
      aria-hidden
    >
      <StarCardsFlightFireworks active={active} />
      <StarCardsFlightLayer active={active} fieldRef={fieldRef} onComplete={onComplete} />
      <div className="deck-grid deck-grid--stars" role="presentation">
        {children}
      </div>
    </section>
  )
}