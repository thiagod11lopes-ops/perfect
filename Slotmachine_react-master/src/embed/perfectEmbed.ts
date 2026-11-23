export type PerfectEmbedConfig = {
  embed: boolean
  skipLoader: boolean
  maxSpins: number
  stake: number
}

/** Tempo do brilho na linha vencedora antes do parent celebrar moedas. */
/** Ritmo do embed no Perfect (giros, sparkle, voos). */
export const PERFECT_EMBED_ANIM_PACE = 1.55

export const PERFECT_WIN_SPARKLE_MS = Math.round(1150 * PERFECT_EMBED_ANIM_PACE)

/** Pausa após giro sem combinação antes do próximo spin / mensagem. */
export const PERFECT_EMBED_LOSS_SETTLE_MS = Math.round(420 * PERFECT_EMBED_ANIM_PACE)

export type PerfectEmbedSession = {
  kind: 'win' | 'loss'
  spinAmounts: [number, number, number]
  spinHorizontalMatches: [
    0 | 1 | 2 | 3 | 4 | 5,
    0 | 1 | 2 | 3 | 4 | 5,
    0 | 1 | 2 | 3 | 4 | 5,
  ]
}

const PERFECT_MSG = 'perfect-slot'

export function readPerfectEmbedConfig(): PerfectEmbedConfig {
  const params = new URLSearchParams(window.location.search)
  return {
    embed: params.get('embed') === '1',
    skipLoader: params.get('skipLoader') === '1',
    maxSpins: Math.max(1, Math.min(10, Number(params.get('maxSpins')) || 3)),
    stake: Math.max(1, Number(params.get('stake')) || 30),
  }
}

export function postPerfectEmbedMessage(
  detail: Record<string, unknown> & { type: string },
): void {
  if (window.parent === window) return
  window.parent.postMessage({ source: PERFECT_MSG, ...detail }, '*')
}

export function isPerfectEmbedMessage(data: unknown): data is { source: string; type: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { source?: string }).source === PERFECT_MSG &&
    typeof (data as { type?: string }).type === 'string'
  )
}