// Painel de Preview ao Vivo do Audio Lab.
//
// Exibe sliders de score / combo, toggles dos power-ups e botão Play/Stop.
// Cada mudança vai direto para o store (state.ts) — preview.ts cuida de
// empurrar para o motor de música.
//
// Mostra também leituras DERIVADAS em tempo real: tier corrente, BPM efetivo
// e intensidade. Calculados via funções puras de musicConfig.ts (mesma
// lógica que o motor usa internamente — sem duplicação).

import {
  computeBpm,
  computeComboTier,
  computeIntensity,
} from '../../audio/musicConfig';
import {
  getEditedConfig,
  getPreviewInputs,
  subscribe,
  updatePreviewInputs,
} from '../state';
import {
  isPreviewPlaying,
  startPreview,
  stopPreview,
} from '../preview';

export function mountPreviewPanel(host: HTMLElement): void {
  host.classList.add('preview-panel');
  host.innerHTML = `
    <div class="preview-header">
      <h2>PREVIEW AO VIVO</h2>
      <button class="preview-toggle-btn" data-role="toggle">▶ Play</button>
    </div>

    <div class="preview-row">
      <label>Score</label>
      <input type="range" min="0" max="500" step="1" value="0" data-role="score">
      <span class="preview-value" data-role="score-val">0</span>
    </div>

    <div class="preview-row">
      <label>Combo</label>
      <input type="range" min="0" max="20" step="1" value="0" data-role="combo">
      <span class="preview-value" data-role="combo-val">0</span>
    </div>

    <div class="preview-toggles">
      <label class="preview-power-toggle" data-role="fire-wrap">
        <input type="checkbox" data-role="fire">
        <span>🔥 Fire</span>
      </label>
      <label class="preview-power-toggle" data-role="ice-wrap">
        <input type="checkbox" data-role="ice">
        <span>❄️ Ice</span>
      </label>
      <label class="preview-power-toggle" data-role="magnet-wrap">
        <input type="checkbox" data-role="magnet">
        <span>🧲 Magnet</span>
      </label>
    </div>

    <div class="preview-status">
      <div class="preview-status-grid">
        <div class="preview-status-cell">
          <span>tier</span>
          <strong data-role="tier-display">0</strong>
        </div>
        <div class="preview-status-cell">
          <span>bpm efetivo</span>
          <strong data-role="bpm-display">100</strong>
        </div>
        <div class="preview-status-cell">
          <span>intensidade</span>
          <strong data-role="int-display">0.00</strong>
        </div>
      </div>
    </div>
  `;

  // Helper tipado de query — falha rápido se o seletor não bate.
  const $ = <T extends HTMLElement>(role: string): T => {
    const el = host.querySelector<T>(`[data-role="${role}"]`);
    if (!el) throw new Error(`[preview-panel] data-role="${role}" não encontrado`);
    return el;
  };

  const toggleBtn = $<HTMLButtonElement>('toggle');
  const scoreSlider = $<HTMLInputElement>('score');
  const comboSlider = $<HTMLInputElement>('combo');
  const scoreVal = $<HTMLSpanElement>('score-val');
  const comboVal = $<HTMLSpanElement>('combo-val');
  const fireInput = $<HTMLInputElement>('fire');
  const iceInput = $<HTMLInputElement>('ice');
  const magnetInput = $<HTMLInputElement>('magnet');
  const fireWrap = $<HTMLLabelElement>('fire-wrap');
  const iceWrap = $<HTMLLabelElement>('ice-wrap');
  const magnetWrap = $<HTMLLabelElement>('magnet-wrap');
  const tierDisplay = $<HTMLElement>('tier-display');
  const bpmDisplay = $<HTMLElement>('bpm-display');
  const intDisplay = $<HTMLElement>('int-display');

  // ─── Wiring de inputs → store ──────────────────────────────────────────
  scoreSlider.addEventListener('input', () => {
    updatePreviewInputs({ score: Number(scoreSlider.value) });
  });
  comboSlider.addEventListener('input', () => {
    updatePreviewInputs({ combo: Number(comboSlider.value) });
  });
  fireInput.addEventListener('change', () => {
    updatePreviewInputs({ fire: fireInput.checked });
  });
  iceInput.addEventListener('change', () => {
    updatePreviewInputs({ ice: iceInput.checked });
  });
  magnetInput.addEventListener('change', () => {
    updatePreviewInputs({ magnet: magnetInput.checked });
  });

  toggleBtn.addEventListener('click', () => {
    if (isPreviewPlaying()) {
      stopPreview();
    } else {
      startPreview();
    }
    refreshFromStore();
  });

  // ─── Re-render: store → UI ─────────────────────────────────────────────
  // Toda mudança no store dispara essa função. Ela apenas reflete o estado —
  // não causa novas mutações (evita loops).

  function refreshFromStore(): void {
    const inputs = getPreviewInputs();
    const cfg = getEditedConfig();

    // Sliders / toggles — só atualiza se difere do DOM (evita interromper drag).
    if (scoreSlider.value !== String(inputs.score)) scoreSlider.value = String(inputs.score);
    if (comboSlider.value !== String(inputs.combo)) comboSlider.value = String(inputs.combo);
    scoreVal.textContent = String(inputs.score);
    comboVal.textContent = String(inputs.combo);
    if (fireInput.checked !== inputs.fire)   fireInput.checked = inputs.fire;
    if (iceInput.checked !== inputs.ice)     iceInput.checked = inputs.ice;
    if (magnetInput.checked !== inputs.magnet) magnetInput.checked = inputs.magnet;
    fireWrap.classList.toggle('is-active', inputs.fire);
    iceWrap.classList.toggle('is-active', inputs.ice);
    magnetWrap.classList.toggle('is-active', inputs.magnet);

    // Leituras derivadas.
    const tier = computeComboTier(cfg, inputs.combo, inputs.fire, inputs.ice);
    const bpm = computeBpm(cfg, inputs.score, inputs.combo, inputs.fire, inputs.ice);
    const intensity = computeIntensity(cfg, inputs.score, inputs.combo, inputs.fire, inputs.ice);
    tierDisplay.textContent = String(tier);
    bpmDisplay.textContent = String(bpm);
    intDisplay.textContent = intensity.toFixed(2);

    // Estado do botão Play/Stop.
    const playing = isPreviewPlaying();
    toggleBtn.textContent = playing ? '⏸ Stop' : '▶ Play';
    toggleBtn.classList.toggle('is-playing', playing);
  }

  subscribe(refreshFromStore);
  refreshFromStore();
}
