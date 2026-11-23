import { useEffect, useRef } from 'react'

/** Caminho estável no app (não depende do hash do build do slot). */
const RUNNER_VIDEO = '/assets/athlete-run-loader.mp4'

type GameCardRunLoaderProps = {
  durationMs?: number
  onComplete?: () => void
}

/** Loading do slot original: pista, corredor e barra de progresso. */
export function GameCardRunLoader({ durationMs = 3600, onComplete }: GameCardRunLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.load()
      const play = () => {
        void video.play().catch(() => {})
      }
      if (video.readyState >= 2) play()
      else video.addEventListener('loadeddata', play, { once: true })
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const pctEl = pctRef.current
    if (!root || !pctEl) return

    root.style.setProperty('--game-card-loader-duration', `${durationMs}ms`)

    const start = performance.now()
    let frame = 0
    let lastPct = -1

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) ** 1.12
      const runner = Math.min(92, eased * 100)
      root.style.setProperty('--game-card-loader-runner', `${runner}%`)
      root.style.setProperty('--game-card-loader-progress', `${eased * 100}%`)

      const pct = Math.round(eased * 100)
      if (pct !== lastPct) {
        lastPct = pct
        pctEl.textContent = `${pct}%`
      }

      if (t < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        pctEl.textContent = '100%'
        onCompleteRef.current?.()
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [durationMs])

  return (
    <div
      ref={rootRef}
      className="game-card-loader"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="game-card-loader__stage">
        <div className="game-card-loader__runway">
          <div className="game-card-loader__runner">
            <video
              ref={videoRef}
              className="game-card-loader__video"
              src={RUNNER_VIDEO}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              aria-hidden
            />
          </div>
        </div>
        <div className="game-card-loader__barBlock">
          <span ref={pctRef} className="game-card-loader__pct">
            0%
          </span>
          <div className="game-card-loader__progressWrap">
            <div className="game-card-loader__progress" />
          </div>
        </div>
      </div>
    </div>
  )
}