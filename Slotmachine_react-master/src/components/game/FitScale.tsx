import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

type FitScaleProps = {
  children: ReactNode
  className?: string
  /** Folga para não colar nas bordas (0–1). */
  paddingRatio?: number
  /** Empurra o conteúdo para baixo (ex.: embed Perfect no modal). */
  insetTop?: string
}

/** Reduz o conteúdo proporcionalmente para caber inteiro no pai. */
const FitScale: React.FC<FitScaleProps> = ({
  children,
  className,
  paddingRatio = 0.92,
  insetTop,
}) => {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const measure = () => {
      // Mede tamanho natural (sem max-width) vs área útil do container
      const ow = outer.clientWidth
      const oh = outer.clientHeight
      const prevTransform = inner.style.transform
      inner.style.transform = 'none'
      const iw = inner.offsetWidth
      const ih = inner.offsetHeight
      inner.style.transform = prevTransform

      if (!ow || !oh || !iw || !ih) return
      const next = Math.min(1, (ow * paddingRatio) / iw, (oh * paddingRatio) / ih)
      setScale(Number.isFinite(next) && next > 0 ? next : 1)
    }

    measure()
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure)
    })
    ro.observe(outer)
    ro.observe(inner)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [paddingRatio])

  return (
    <div
      ref={outerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'grid',
        placeItems: insetTop ? 'start center' : 'center',
        paddingTop: insetTop ?? undefined,
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: 'max-content',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export { FitScale }
