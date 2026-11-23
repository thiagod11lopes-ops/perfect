/** Ritmo das animações da carta roleta (~1.4–1.7× mais lento para o jogador acompanhar). */
export const ROULETTE_ANIM_PACE = 1.55

/** Vitória Missão snake — vídeo + moedas no mesmo relógio. */
export const SNAKE_WIN_CELEBRATION_MS = 8000

/** Referência para escalar fases (fly/count) da timeline snake. */
export const SNAKE_WIN_PHASE_BASE_MS = 5000

/** VITÓRIA + card de moedas visíveis antes do fade (último ~1s sai junto ao vídeo). */
export const SNAKE_WIN_UI_VISIBLE_MS = 7000

export function rouletteAnimMs(baseMs: number): number {
  return Math.round(baseMs * ROULETTE_ANIM_PACE)
}