export const WORD_SEARCH_DEV_REVEAL = 'word-search-dev-reveal'

/** Destaca células das palavras no caça-palavras (2s). Só com o puzzle aberto. */
export function postWordSearchReveal(): boolean {
  const board = document.querySelector('.phone-app .wordsearch-board, .wordsearch-board')
  if (!board?.isConnected) return false
  window.dispatchEvent(new CustomEvent(WORD_SEARCH_DEV_REVEAL))
  return true
}