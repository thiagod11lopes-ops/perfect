// Painel inferior — JSON output + ações de persistência.
//
// Mostra o MusicConfig editado serializado (read-only, atualiza ao vivo) e
// dois botões:
//   - "Salvar como default (disco)" → POST pro endpoint do dev-server, que
//     grava src/audio/musicConfig.override.json. O jogo carrega esse arquivo
//     no próximo boot (ver musicConfig.ts).
//   - "Resetar p/ factory" → volta ao DEFAULT_MUSIC_CONFIG hardcoded.
//
// O re-stringify a cada mudança é barato (config ~5KB) mas a gente coalesce
// via requestAnimationFrame pra não serializar 60×/s durante drag de slider.

import { getEditedConfig, resetEditedToFactory, subscribe } from '../state';

const SAVE_ENDPOINT = '/__lab/save-music-config';

export function mountOutputPanel(host: HTMLElement): void {
  host.classList.add('output-host');
  host.innerHTML = `
    <div class="output-bar">
      <span class="output-title">JSON · MUSICCONFIG</span>
      <span class="output-spacer"></span>
      <span class="output-status" data-role="status"></span>
      <button class="output-btn output-btn-ghost" data-role="reset">↺ Resetar p/ factory</button>
      <button class="output-btn output-btn-primary" data-role="save">💾 Salvar como default</button>
    </div>
    <pre class="output-json" data-role="json"></pre>
  `;

  const jsonEl = host.querySelector<HTMLElement>('[data-role="json"]')!;
  const statusEl = host.querySelector<HTMLElement>('[data-role="status"]')!;
  const saveBtn = host.querySelector<HTMLButtonElement>('[data-role="save"]')!;
  const resetBtn = host.querySelector<HTMLButtonElement>('[data-role="reset"]')!;

  // ─── Render do JSON (coalescido por rAF) ───────────────────────────────
  let pending = false;
  function scheduleRender(): void {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      jsonEl.textContent = JSON.stringify(getEditedConfig(), null, 2);
    });
  }
  subscribe(scheduleRender);
  jsonEl.textContent = JSON.stringify(getEditedConfig(), null, 2);

  // ─── Status helper ─────────────────────────────────────────────────────
  let statusTimer: number | null = null;
  function setStatus(msg: string, kind: 'ok' | 'err' | 'info'): void {
    statusEl.textContent = msg;
    statusEl.className = `output-status is-${kind}`;
    if (statusTimer !== null) clearTimeout(statusTimer);
    if (kind !== 'info') {
      statusTimer = window.setTimeout(() => { statusEl.textContent = ''; }, 4000);
    }
  }

  // ─── Salvar no disco ───────────────────────────────────────────────────
  saveBtn.addEventListener('click', () => {
    void (async (): Promise<void> => {
      saveBtn.disabled = true;
      setStatus('salvando…', 'info');
      try {
        const res = await fetch(SAVE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getEditedConfig()),
        });
        const data = (await res.json()) as { ok: boolean; bytes?: number; error?: string };
        if (data.ok) {
          setStatus(`salvo (${data.bytes ?? 0} bytes) — recarregue o jogo p/ ouvir`, 'ok');
        } else {
          setStatus(`erro: ${data.error ?? 'desconhecido'}`, 'err');
        }
      } catch (err) {
        setStatus(`falha de rede: ${String(err)}`, 'err');
      } finally {
        saveBtn.disabled = false;
      }
    })();
  });

  // ─── Resetar p/ factory ────────────────────────────────────────────────
  resetBtn.addEventListener('click', () => {
    const ok = window.confirm(
      'Resetar para o config de fábrica? As edições não salvas no disco serão perdidas.',
    );
    if (!ok) return;
    resetEditedToFactory();
    setStatus('config resetado p/ factory (não salvo ainda)', 'info');
  });
}
