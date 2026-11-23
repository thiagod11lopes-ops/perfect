import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppBase } from '../hooks/useAppBase'
import { useApp } from '../store/AppContext'
import { publicUrl } from '../utils/publicUrl'
import { NeonophisDumbbellTrack } from './NeonophisDumbbellTrack'

const MSG = 'perfect-neonophis'

function layoutSize(
  host: HTMLElement,
  iframe: HTMLIFrameElement,
  isMobileSim: boolean,
): { viewW: number; viewH: number } | null {
  const layoutRoot =
    host.closest<HTMLElement>('.game-card-modal-panel--neonophis-embed') ??
    host.closest<HTMLElement>('.phone-app') ??
    host
  const phone = host.closest<HTMLElement>('.phone-app')
  const candidatesW = [
    layoutRoot.clientWidth,
    host.clientWidth,
    iframe.clientWidth,
    ...(isMobileSim && phone ? [phone.clientWidth] : []),
  ]
  const candidatesH = [
    layoutRoot.clientHeight,
    host.clientHeight,
    iframe.clientHeight,
    ...(isMobileSim && phone ? [phone.clientHeight] : []),
  ]
  const rawW = Math.max(...candidatesW.filter((n) => Number.isFinite(n) && n > 0), 0)
  const rawH = Math.max(...candidatesH.filter((n) => Number.isFinite(n) && n > 0), 0)
  if (rawW < 8 || rawH < 8) return null
  return { viewW: Math.floor(rawW), viewH: Math.floor(rawH) }
}

export type NeonophisCompletePayload = {
  success: boolean
  coins: number
  targetCoins: number
  applesEaten: number
}

type NeonophisEmbedProps = {
  targetCoins?: number
  durationSec?: number
  sessionKey?: string
  onReady?: () => void
  onComplete: (payload: NeonophisCompletePayload) => void
  onFailed?: (payload: NeonophisCompletePayload) => void
}

export function NeonophisEmbed({
  targetCoins = 10,
  durationSec = 60,
  sessionKey,
  onReady,
  onComplete,
  onFailed,
}: NeonophisEmbedProps) {
  const { state } = useApp()
  const { isMobileSim } = useAppBase()
  const gridW = Math.min(48, Math.max(6, Math.floor(state.devNeonophisGridW ?? 12) || 12))
  const gridH = Math.min(64, Math.max(6, Math.floor(state.devNeonophisGridH ?? 20) || 20))
  const cellPx = Math.min(48, Math.max(6, Math.floor(state.devNeonophisCellPx ?? 16) || 16))
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete
  const failedRef = useRef(onFailed)
  failedRef.current = onFailed
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const handledRef = useRef(false)
  const hostRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [buildId, setBuildId] = useState('')
  const [collected, setCollected] = useState(0)
  const mountStamp = useRef(String(Date.now()))

  useEffect(() => {
    let cancelled = false
    void fetch(publicUrl('/games/neonophis/embed-build-id.txt'), { cache: 'no-store' })
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
      embed: '1',
      targetCoins: String(targetCoins),
      durationSec: String(durationSec),
      lang: 'pt',
      gridW: String(gridW),
      gridH: String(gridH),
    })
    if (sessionKey) q.set('sk', sessionKey)
    const cacheBust = [buildId, mountStamp.current, sessionKey].filter(Boolean).join('-')
    q.set('v', cacheBust)
    q.set('_cb', mountStamp.current)
    if (isMobileSim) q.set('phone', '1')
    if (!isMobileSim && state.devMode) q.set('cellPx', String(cellPx))
    return `${publicUrl('/games/neonophis/index.html')}?${q.toString()}`
  }, [targetCoins, durationSec, sessionKey, buildId, gridW, gridH, cellPx, isMobileSim, state.devMode])

  useEffect(() => {
    const host = hostRef.current
    const iframe = iframeRef.current
    if (!host || !iframe) return

    const pushLayout = () => {
      const size = layoutSize(host, iframe, isMobileSim)
      if (!size) return
      iframe.contentWindow?.postMessage(
        { source: MSG, type: 'perfect-neonophis:layout', ...size },
        '*',
      )
    }

    const ro = new ResizeObserver(() => pushLayout())
    ro.observe(host)
    iframe.addEventListener('load', pushLayout)
    pushLayout()
    return () => {
      ro.disconnect()
      iframe.removeEventListener('load', pushLayout)
    }
  }, [src, isMobileSim])

  useEffect(() => {
    setCollected(0)
  }, [src])

  useEffect(() => {
    handledRef.current = false
    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (typeof data !== 'object' || data === null || data.source !== MSG) return
      if (data.type === 'perfect-neonophis:ready' || data.type === 'perfect-neonophis:request-layout') {
        if (data.type === 'perfect-neonophis:ready') onReadyRef.current?.()
        const host = hostRef.current
        const iframe = iframeRef.current
        if (host && iframe) {
          const size = layoutSize(host, iframe, isMobileSim)
          if (size) {
            iframe.contentWindow?.postMessage(
              { source: MSG, type: 'perfect-neonophis:layout', ...size },
              '*',
            )
          }
        }
        return
      }
      if (data.type === 'perfect-neonophis:progress') {
        const n = typeof data.applesEaten === 'number' ? data.applesEaten : 0
        const cap =
          typeof data.targetCoins === 'number' ? data.targetCoins : targetCoins
        setCollected(Math.max(0, Math.min(cap, Math.floor(n))))
        return
      }
      if (data.type === 'perfect-neonophis:complete') {
        if (handledRef.current) return
        handledRef.current = true
        const eaten = typeof data.applesEaten === 'number' ? data.applesEaten : targetCoins
        setCollected(Math.min(targetCoins, eaten))
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
        setCollected(Math.max(0, Math.min(targetCoins, eaten)))
        failedRef.current?.({
          success: false,
          coins: typeof data.coins === 'number' ? data.coins : 0,
          targetCoins: typeof data.targetCoins === 'number' ? data.targetCoins : targetCoins,
          applesEaten: typeof data.applesEaten === 'number' ? data.applesEaten : 0,
        })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [src, targetCoins, isMobileSim])

  return (
    <div className="neonophis-embed-stack neonophis-embed-stack--field-only">
      <div className="neonophis-embed-play-row">
        <div
          ref={hostRef}
          className={`neonophis-embed-host${isMobileSim ? ' neonophis-embed-host--phone' : ''}`}
        >
          <iframe
            ref={iframeRef}
            className="day-game-frame day-game-frame--neonophis"
            title="Missão de Habilidade — Neon Ophis"
            src={src}
            allow="autoplay"
          />
        </div>
        <NeonophisDumbbellTrack total={targetCoins} collected={collected} />
      </div>
    </div>
  )
}