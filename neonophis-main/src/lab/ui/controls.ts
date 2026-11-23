// Builders atômicos de controles para o Audio Lab.
//
// Cada função retorna um HTMLElement já cabeado a um callback. Cada controle
// é responsável por exibir e debounce não é necessário (o motor lê fresh
// a cada tick, então 100 mudanças/s são absorvidas).

export function makeSection(title: string): HTMLElement {
  const s = document.createElement('div');
  s.className = 'prop-section';
  s.innerHTML = `<div class="prop-section-title">${title}</div>`;
  return s;
}

export interface SliderOpts {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

export function makeSlider(opts: SliderOpts): HTMLElement {
  const fmt = opts.format ?? ((v: number) => v.toFixed(opts.step && opts.step < 1 ? 2 : 0));
  const row = document.createElement('div');
  row.className = 'prop-row prop-row-slider';
  row.innerHTML = `
    <span class="prop-label">${opts.label}</span>
    <input type="range" min="${opts.min}" max="${opts.max}" step="${opts.step ?? 0.01}" value="${opts.value}">
    <span class="prop-value">${fmt(opts.value)}</span>
  `;
  const input = row.querySelector<HTMLInputElement>('input')!;
  const valEl = row.querySelector<HTMLElement>('.prop-value')!;
  input.addEventListener('input', () => {
    const v = Number(input.value);
    valEl.textContent = fmt(v);
    opts.onChange(v);
  });
  return row;
}

export interface DropdownOpts {
  label: string;
  value: string;
  options: ReadonlyArray<string>;
  onChange: (v: string) => void;
}

export function makeDropdown(opts: DropdownOpts): HTMLElement {
  const row = document.createElement('div');
  row.className = 'prop-row prop-row-dropdown';
  const optionsHtml = opts.options
    .map((o) => `<option value="${o}"${o === opts.value ? ' selected' : ''}>${o}</option>`)
    .join('');
  row.innerHTML = `
    <span class="prop-label">${opts.label}</span>
    <select>${optionsHtml}</select>
  `;
  const sel = row.querySelector<HTMLSelectElement>('select')!;
  sel.addEventListener('change', () => opts.onChange(sel.value));
  return row;
}

export interface ButtonOpts {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'ghost';
}

export function makeButton(opts: ButtonOpts): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = `prop-button prop-button-${opts.variant ?? 'primary'}`;
  b.textContent = opts.label;
  b.addEventListener('click', opts.onClick);
  return b;
}

export interface NumberInputOpts {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** Texto auxiliar exibido à direita (ex: "Hz", "ms"). */
  suffix?: string;
  onChange: (v: number) => void;
}

export function makeNumberInput(opts: NumberInputOpts): HTMLElement {
  const row = document.createElement('div');
  row.className = 'prop-row prop-row-number';
  const minAttr  = opts.min  !== undefined ? `min="${opts.min}"`   : '';
  const maxAttr  = opts.max  !== undefined ? `max="${opts.max}"`   : '';
  const stepAttr = opts.step !== undefined ? `step="${opts.step}"` : '';
  row.innerHTML = `
    <span class="prop-label">${opts.label}</span>
    <input type="number" ${minAttr} ${maxAttr} ${stepAttr} value="${opts.value}">
    <span class="prop-suffix">${opts.suffix ?? ''}</span>
  `;
  const input = row.querySelector<HTMLInputElement>('input')!;
  input.addEventListener('change', () => {
    const v = Number(input.value);
    if (!Number.isFinite(v)) return;
    opts.onChange(v);
  });
  return row;
}

export interface TabsOpts {
  tabs: ReadonlyArray<{ id: string; label: string }>;
  selected: string;
  onSelect: (id: string) => void;
}

export function makeTabs(opts: TabsOpts): HTMLElement {
  const row = document.createElement('div');
  row.className = 'prop-tabs';
  for (const t of opts.tabs) {
    const btn = document.createElement('button');
    btn.className = 'prop-tab';
    btn.textContent = t.label;
    if (t.id === opts.selected) btn.classList.add('is-active');
    btn.addEventListener('click', () => opts.onSelect(t.id));
    row.appendChild(btn);
  }
  return row;
}
