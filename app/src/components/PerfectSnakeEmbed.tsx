import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppBase } from '../hooks/useAppBase'
import { publicUrl } from '../utils/publicUrl'

const MSG = 'perfect-neonophis'

export type PerfectSnakeCompletePayload = {
  success: boolean
  coins: number
  targetCoins: number
  applesEaten: number
}

export type PerfectSnakeWinRewardPayload = {
  coins: number
  targetCoins: number
}

type PerfectSnakeEmbedProps = {
  targetCoins?: number
  durationSec?: number
  sessionKey?: string
  onReady?: () => void
  onWinReward?: (payload: PerfectSnakeWinRewardPayload) => void
  onComplete: (payload: PerfectSnakeCompletePayload) => void
  onFailed?: (payload: PerfectSnakeCompletePayload) => void
  onExit?: () => void
}

export function PerfectSnakeEmbed({
  targetCoins = 10,
  durationSec = 60,
  sessionKey,
  onReady,
  onWinReward,
  onComplete,
  onFailed,
  onExit,
}: PerfectSnakeEmbedProps) {
  const { isMobileSim } = useAppBase()
  const [buildId, setBuildId] = useState('')
  const mountStamp = useRef(String(Date.now()))
  const handledRef = useRef(false)
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete
  const failedRef = useRef(onFailed)
  failedRef.current = onFailed
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const onWinRewardRef = useRef(onWinReward)
  onWinRewardRef.current = onWinReward

  useEffect(() => {
    let cancelled = false
    void fetch(publicUrl('/games/perfect-snake/embed-build-id.txt'), { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : ''))
      .then((text) => {
        if (!cancelled) setBuildId(text.trim())
      })
      .catch(() => {
        if (!cancelled) setBuildId('')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const src = useMemo(() => {
    const q = new URLSearchParams({
      targetCoins: String(targetCoins),
      durationSec: String(durationSec),
    })
    if (sessionKey) q.set('sk', sessionKey)
    const cacheBust = [buildId, mountStamp.current, sessionKey].filter(Boolean).join('-')
    q.set('v', cacheBust)
    if (isMobileSim) q.set('phone', '1')
    return `${publicUrl('/games/perfect-snake/index.html')}?${q.toString()}`
  }, [targetCoins, durationSec, sessionKey, buildId, isMobileSim])

  useEffect(() => {
    handledRef.current = false
    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (typeof data !== 'object' || data === null || data.source !== MSG) return
      if (data.type === 'perfect-neonophis:ready') {
        onReadyRef.current?.()
        return
      }
      if (data.type === 'perfect-neonophis:win-reward') {
        const coins = typeof data.coins === 'number' ? data.coins : targetCoins
        const tc =
          typeof data.targetCoins === 'number' ? data.targetCoins : targetCoins
        onWinRewardRef.current?.({ coins, targetCoins: tc })
        return
      }
      if (data.type === 'perfect-neonophis:complete') {
        if (handledRef.current) return
        handledRef.current = true
        const eaten = typeof data.applesEaten === 'number' ? data.applesEaten : targetCoins
        completeRef.current({
          success: true,
          coins: typeof data.coins === 'number' ? data.coins : targetCoins,
          targetCoins: typeof data.targetCoins === 'number' ? data.targetCoins : targetCoins,
          applesEaten: eaten,
        })
        return
      }
      if (data.type === 'perfect-neonophis:failed') {
        if (handledRef.current) return
        const eaten = typeof data.applesEaten === 'number' ? data.applesEaten : 0
        failedRef.current?.({
          success: false,
          coins: typeof data.coins === 'number' ? data.coins : 0,
          targetCoins: typeof data.targetCoins === 'number' ? data.targetCoins : targetCoins,
          applesEaten: eaten,
        })
        return
      }
      if (data.type === 'perfect-neonophis:exit') {
        if (handledRef.current) return
        handledRef.current = true
        onExitRef.current?.()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [src, targetCoins])

  const steer = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const iframe = document.querySelector<HTMLIFrameElement>('.perfect-snake-frame')
    iframe?.contentWindow?.postMessage({ source: MSG, type: 'perfect-neonophis:steer', direction }, '*')
  }

  return (
    <div className="perfect-snake-embed perfect-snake-embed--field-only">
      <div className={`perfect-snake-host neonophis-embed-host${isMobileSim ? ' neonophis-embed-host--phone' : ''}`}>
        <iframe
          className="perfect-snake-frame day-game-frame day-game-frame--neonophis"
          title="Missão de Habilidade"
          src={src}
          allow="autoplay"
        />
      </div>
      {!isMobileSim && (
        <nav className="neonophis-dpad perfect-snake-dpad-desktop" aria-label="Direções">
          <button type="button" className="neonophis-dpad-btn neonophis-dpad-btn--up" onClick={() => steer('UP')}>
            <span className="neonophis-dpad-glyph">▲</span>
          </button>
          <button type="button" className="neonophis-dpad-btn neonophis-dpad-btn--left" onClick={() => steer('LEFT')}>
            <span className="neonophis-dpad-glyph">◀</span>
          </button>
          <span className="neonophis-dpad-center" />
          <button type="button" className="neonophis-dpad-btn neonophis-dpad-btn--right" onClick={() => steer('RIGHT')}>
            <span className="neonophis-dpad-glyph">▶</span>
          </button>
          <button type="button" className="neonophis-dpad-btn neonophis-dpad-btn--down" onClick={() => steer('DOWN')}>
            <span className="neonophis-dpad-glyph">▼</span>
          </button>
        </nav>
      )}
    </div>
  )
}