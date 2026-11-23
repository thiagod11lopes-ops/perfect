import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  exerciseDemoEmbedUrl,
  type ExerciseDemo,
} from '../data/exerciseDemos'
import { getAdminVideoBlob } from '../data/adminVideoDb'

type DemoTab = 'video' | 'animacao'

type Props = {
  demo: ExerciseDemo
  onClose: () => void
}

export function ExerciseDemoModal({ demo, onClose }: Props) {
  const hasAnimation = Boolean(demo.animationSrc)
  const [tab, setTab] = useState<DemoTab>(hasAnimation ? 'animacao' : 'video')
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loadingBlob, setLoadingBlob] = useState(Boolean(demo.blobKey))
  const embedUrl = exerciseDemoEmbedUrl(demo)
  const isLocalFile = Boolean(demo.src && !demo.youtubeId)
  const isBlob = Boolean(demo.blobKey)
  const hasVideo = Boolean(embedUrl || isBlob)

  useEffect(() => {
    setTab(hasAnimation ? 'animacao' : 'video')
  }, [demo.title, hasAnimation])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  useEffect(() => {
    let alive = true
    let objectUrl: string | null = null
    if (!demo.blobKey) {
      setBlobUrl(null)
      setLoadingBlob(false)
      return
    }
    setLoadingBlob(true)
    getAdminVideoBlob(demo.blobKey)
      .then((blob) => {
        if (!alive) return
        if (!blob) {
          setBlobUrl(null)
          setLoadingBlob(false)
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
        setLoadingBlob(false)
      })
      .catch(() => {
        if (!alive) return
        setBlobUrl(null)
        setLoadingBlob(false)
      })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [demo.blobKey])

  const node = (
    <div className="exercise-demo-overlay" role="dialog" aria-modal="true" aria-label={demo.title}>
      <button type="button" className="exercise-demo-backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="exercise-demo-sheet">
        <header className="exercise-demo-head">
          <div>
            <p className="eyebrow">Demonstração</p>
            <h2 className="display h2 exercise-demo-title">{demo.title}</h2>
          </div>
          <button type="button" className="deck-modal-close" onClick={onClose} aria-label="Fechar vídeo">
            ✕
          </button>
        </header>

        <div className="pill-tabs exercise-demo-tabs" role="tablist" aria-label="Tipo de demonstração">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'video'}
            className={tab === 'video' ? 'active' : ''}
            onClick={() => setTab('video')}
          >
            Vídeo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'animacao'}
            className={tab === 'animacao' ? 'active' : ''}
            onClick={() => setTab('animacao')}
          >
            Animação
          </button>
        </div>

        <div className="exercise-demo-frame">
          {tab === 'animacao' ? (
            hasAnimation ? (
              <video
                className="exercise-demo-video"
                src={demo.animationSrc}
                controls
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <p className="muted" style={{ margin: 0, padding: '1rem' }}>
                Animação do boneco ainda não disponível para este exercício.
              </p>
            )
          ) : loadingBlob ? (
            <p className="muted" style={{ margin: 0, padding: '1rem' }}>
              Carregando vídeo…
            </p>
          ) : isBlob && blobUrl ? (
            <video className="exercise-demo-video" src={blobUrl} controls autoPlay playsInline />
          ) : embedUrl ? (
            isLocalFile ? (
              <video className="exercise-demo-video" src={embedUrl} controls autoPlay playsInline />
            ) : (
              <iframe
                title={`Vídeo: ${demo.title}`}
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )
          ) : !hasVideo ? (
            <p className="muted" style={{ margin: 0, padding: '1rem' }}>
              Vídeo ainda não disponível para este exercício.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.querySelector('.phone-app') ?? document.body)
}

export function VideoIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.5" y="5.5" width="14" height="13" rx="2.5" />
      <path d="M16.5 10.2 21 7.5v9l-4.5-2.7" />
      <path d="M8.2 9.6v4.8L12.2 12z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** @deprecated use VideoIcon */
export const EyeIcon = VideoIcon
