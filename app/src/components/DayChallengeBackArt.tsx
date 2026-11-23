import { useId } from 'react'

/** Estrela brilhante — versos de cartas com desafio do dia / estrela. */
export function DayChallengeBackArt({ large = false }: { large?: boolean }) {
  const raw = useId()
  const uid = raw.replace(/:/g, '')
  const glowId = `day-star-glow-${uid}`
  const blurId = `day-star-blur-${uid}`

  return (
    <span
      className={`deck-day-challenge-art${large ? ' is-lg' : ''}`}
      aria-hidden
    >
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={glowId} cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor="#fff8d4" />
            <stop offset="45%" stopColor="#ffd35a" />
            <stop offset="100%" stopColor="#e8a318" />
          </radialGradient>
          <filter id={blurId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="60" cy="58" r="46" fill="rgba(255, 214, 80, 0.22)" />
        <path
          filter={`url(#${blurId})`}
          fill={`url(#${glowId})`}
          d="M60 8 L69.5 40.5 L104 40.5 L76.2 60.2 L85.8 92.5 L60 73.5 L34.2 92.5 L43.8 60.2 L16 40.5 L50.5 40.5 Z"
        />
        <path
          fill={`url(#${glowId})`}
          opacity="0.95"
          d="M60 14 L67.8 40.8 L95.5 40.8 L72.8 57.2 L80.5 84 L60 69.5 L39.5 84 L47.2 57.2 L24.5 40.8 L52.2 40.8 Z"
        />
      </svg>
    </span>
  )
}