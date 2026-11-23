import { useCallback, useEffect, useMemo, useRef } from 'react'

const WV_MSG = 'perfect-workout-vision'

export type WorkoutVisionCompletePayload = {
  lift: string
  reps: number
}

type WorkoutVisionEmbedProps = {
  lift: string
  sessionKey?: string
  onReady?: () => void
  onComplete: (payload: WorkoutVisionCompletePayload) => void
}

export function WorkoutVisionEmbed({
  lift,
  sessionKey,
  onReady,
  onComplete,
}: WorkoutVisionEmbedProps) {
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const handledCompleteRef = useRef(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const pushSession = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: WV_MSG,
        type: 'perfect-wv:session',
        lift,
      },
      '*',
    )
  }, [lift])

  const src = useMemo(() => {
    const q = new URLSearchParams({
      embed: '1',
      lift,
      lang: 'en',
    })
    return `/games/workout-vision/index.html?${q.toString()}`
  }, [lift, sessionKey])

  useEffect(() => {
    handledCompleteRef.current = false
    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (typeof data !== 'object' || data === null || data.source !== WV_MSG) return
      if (data.type === 'perfect-wv:ready') {
        pushSession()
        onReadyRef.current?.()
        return
      }
      if (data.type === 'perfect-wv:complete') {
        if (handledCompleteRef.current) return
        handledCompleteRef.current = true
        const reps = typeof data.reps === 'number' ? Math.max(0, Math.floor(data.reps)) : 0
        const doneLift = typeof data.lift === 'string' ? data.lift : lift
        completeRef.current({ lift: doneLift, reps })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [src, lift, pushSession])

  return (
    <div className="workout-vision-embed-host">
      <iframe
        ref={iframeRef}
        key={src}
        className="day-game-frame day-game-frame--workout-vision"
        title="WorkoutVision"
        src={src}
        allow="camera; microphone; autoplay"
      />
    </div>
  )
}