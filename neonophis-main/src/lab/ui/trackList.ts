// Lista de tracks (painel esquerdo).
//
// Renderiza TRACK_GROUPS de tracks.ts e gerencia seleção. Clicar numa track
// editável atualiza `selectedTrack` no store; o editor central reage via
// subscribe e troca de modo (step-grid / piano-roll / placeholder).
//
// Tracks com `editor: 'placeholder'` são renderizadas opacas e não-clicáveis
// — sinalizam o que ainda vem nos próximos passos.

import { TRACK_GROUPS } from '../tracks';
import { getSelectedTrack, setSelectedTrack, subscribe } from '../state';

export function mountTrackList(host: HTMLElement): void {
  host.classList.add('track-list-host');
  host.innerHTML = '';

  for (const group of TRACK_GROUPS) {
    const groupEl = document.createElement('div');
    groupEl.className = 'track-group';
    groupEl.innerHTML = `<div class="track-group-title">${group.title}</div>`;

    for (const t of group.tracks) {
      const item = document.createElement('div');
      item.className = 'track-item';
      item.dataset.trackId = t.id;
      if (t.editor === 'placeholder') item.classList.add('is-placeholder');
      item.innerHTML = `
        <span class="track-item-label">${t.label}</span>
        ${t.tag ? `<span class="track-item-tag">${t.tag}</span>` : ''}
      `;

      if (t.editor !== 'placeholder') {
        item.addEventListener('click', () => setSelectedTrack(t.id));
      }
      groupEl.appendChild(item);
    }

    host.appendChild(groupEl);
  }

  function refresh(): void {
    const sel = getSelectedTrack();
    host.querySelectorAll<HTMLElement>('.track-item').forEach((el) => {
      el.classList.toggle('is-selected', el.dataset.trackId === sel);
    });
  }

  subscribe(refresh);
  refresh();
}
