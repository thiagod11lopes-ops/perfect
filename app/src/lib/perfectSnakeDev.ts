const MSG = 'perfect-neonophis'

/** Dispara vitória no iframe da Missão (vídeo + postComplete). Abra o jogo antes. */
export function postPerfectSnakeForceWin(): boolean {
  const iframe = document.querySelector<HTMLIFrameElement>('.perfect-snake-frame')
  if (!iframe?.contentWindow) return false
  iframe.contentWindow.postMessage({ source: MSG, type: 'perfect-neonophis:force-win' }, '*')
  return true
}