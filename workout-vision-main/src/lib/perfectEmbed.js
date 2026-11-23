/** Integração iframe com o app Perfect (carta Desafio do dia). */
export const PERFECT_WV_MSG = 'perfect-workout-vision';

export function readPerfectEmbedConfig() {
  const params = new URLSearchParams(window.location.search);
  return {
    embed: params.get('embed') === '1',
    lift: (params.get('lift') || 'bicep_curl').trim(),
    lang: (params.get('lang') || 'en').trim(),
  };
}

export function postPerfectEmbedMessage(detail) {
  if (window.parent === window) return;
  window.parent.postMessage({ source: PERFECT_WV_MSG, ...detail }, '*');
}

export function isPerfectEmbedMessage(data) {
  return (
    typeof data === 'object' &&
    data !== null &&
    data.source === PERFECT_WV_MSG &&
    typeof data.type === 'string'
  );
}