// Bridge entre o Audio Lab e o motor de música real (src/audio/music.ts).
//
// Sempre que `editedConfig` ou `previewInputs` mudam (subscribe ao state),
// empurramos o config corrente para `setMusicConfig` e os inputs para
// `setMusicState`. O motor procedural lê esses valores no próximo tick —
// mudanças são audíveis em até ~150ms (um 8th a 100 BPM).
//
// startPreview() / stopPreview() controlam o loop. O motor reusa o
// AudioContext singleton de synth.ts (evita múltiplos contexts).

import { setMusicState, startMusic, stopMusic } from '../audio/music';
import { setMusicConfig } from '../audio/musicConfig';
import { getEditedConfig, getPreviewInputs, subscribe } from './state';

let isPlaying = false;

/** Empurra o estado corrente do lab para o motor de música. Idempotente. */
function pushToEngine(): void {
  setMusicConfig(getEditedConfig());
  const i = getPreviewInputs();
  setMusicState(i.score, i.combo, { fire: i.fire, ice: i.ice, magnet: i.magnet });
}

// Sincroniza qualquer mudança de estado para o motor — independente de estar
// tocando ou não. setMusicConfig é só uma troca de referência (cheap), e
// setMusicState atualiza variáveis de módulo (cheap também). Garante que
// quando o usuário aperta Play, o motor já está com o estado correto.
subscribe(pushToEngine);

export function startPreview(): void {
  if (isPlaying) return;
  pushToEngine();
  startMusic();
  isPlaying = true;
}

export function stopPreview(): void {
  if (!isPlaying) return;
  stopMusic();
  isPlaying = false;
}

export function isPreviewPlaying(): boolean {
  return isPlaying;
}
