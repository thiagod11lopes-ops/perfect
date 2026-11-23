import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import runVideo from '@/assets/videos/athlete-run-loader.mp4'
import styles from './styles.module.scss'

interface LoaderProps {
  loadingTime: number // in milliseconds
  onLoadEnd: () => void
}

const Loader: React.FC<LoaderProps> = ({ loadingTime, onLoadEnd }) => {
  const [t] = useTranslation()
  const [progress, setProgress] = useState(0)
  const [exiting, setExiting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef = useRef(0)
  const startRef = useRef(0)
  const endedRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.playbackRate = 1.15
      const play = video.play()
      if (play && typeof play.catch === 'function') {
        play.catch(() => {
          /* autoplay pode falhar sem gesto; barra segue mesmo assim */
        })
      }
    }

    startRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startRef.current
      const raw = Math.min(1, elapsed / loadingTime)
      const eased = 1 - Math.pow(1 - raw, 1.25)
      const value = Math.min(100, eased * 100)
      setProgress(value)

      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      if (endedRef.current) return
      endedRef.current = true
      setProgress(100)
      setExiting(true)
      window.setTimeout(() => onLoadEnd(), 560)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [loadingTime, onLoadEnd])

  const pct = Math.round(progress)

  return (
    <div
      className={`${styles.loader}${exiting ? ` ${styles['loader--exit']}` : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={progress < 100}
      aria-label={t('global.loading')}
    >
      <div className={styles.loader__vignette} aria-hidden />
      <div className={styles.loader__grain} aria-hidden />

      <div className={styles.loader__stage}>
        {/* Boneco inteiro, alinhado à ponta da barra */}
        <div className={styles.loader__runway}>
          <div
            className={styles.loader__runner}
            style={{ left: `calc((100% - 5.5rem) * ${progress / 100})` }}
          >
            <video
              ref={videoRef}
              className={styles.loader__video}
              src={runVideo}
              muted
              playsInline
              autoPlay
              loop
              preload="auto"
              aria-hidden
            />
          </div>
        </div>

        {/* Barra cresce L→R junto com o boneco */}
        <div className={styles.loader__barBlock}>
          <div
            className={styles.loader__progressWrap}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={t('global.loading')}
          >
            <div className={styles.loader__progress} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.loader__pct}>{pct}%</span>
        </div>
      </div>
    </div>
  )
}

export { Loader }
