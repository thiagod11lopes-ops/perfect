// Esqueleto da dashboard do Audio Lab.
//
// Layout em grade 3×3 (header, [left, center, right], bottom). Cada região
// recebe placeholders nesta etapa — os passos seguintes do roadmap montam
// as UIs reais (tracks, propriedades, JSON output, etc.).

export interface LabRegions {
  header: HTMLElement;
  /** Lista de tracks (left). */
  left: HTMLElement;
  /** Editor central (piano-roll / step-grid) — área principal do center. */
  editor: HTMLElement;
  /** Painel de Preview ao Vivo (meio do center). */
  center: HTMLElement;
  /** Host dos visualizadores (parte de baixo do center). */
  viz: HTMLElement;
  right: HTMLElement;
  bottom: HTMLElement;
}

export function buildLayout(root: HTMLElement): LabRegions {
  // Limpa o bootstrap inicial.
  root.innerHTML = '';
  root.className = '';

  const grid = document.createElement('div');
  grid.className = 'lab-grid';
  grid.innerHTML = `
    <header class="lab-header">
      <h1>NEON OPHIS · AUDIO LAB</h1>
      <span class="lab-subtitle">editor procedural de música</span>
      <span class="lab-spacer"></span>
      <span class="lab-mode-tag">DEV</span>
    </header>
    <aside class="lab-left">
      <div class="lab-placeholder">
        Tracks<br/>
        <small style="opacity:0.5">passos 5+</small>
      </div>
    </aside>
    <main class="lab-center">
      <section class="lab-editor-host"></section>
      <section class="lab-preview-host"></section>
      <section class="lab-viz-host"></section>
    </main>
    <aside class="lab-right">
      <div class="lab-placeholder">
        Propriedades<br/>
        <small style="opacity:0.5">passo 6</small>
      </div>
    </aside>
    <footer class="lab-bottom">
      <div class="lab-placeholder">
        JSON output / logs / debug<br/>
        <small style="opacity:0.5">passos 9–10</small>
      </div>
    </footer>
  `;
  root.appendChild(grid);

  return {
    header: grid.querySelector('.lab-header')!,
    left:   grid.querySelector('.lab-left')!,
    editor: grid.querySelector('.lab-editor-host')!,
    center: grid.querySelector('.lab-preview-host')!,
    viz:    grid.querySelector('.lab-viz-host')!,
    right:  grid.querySelector('.lab-right')!,
    bottom: grid.querySelector('.lab-bottom')!,
  };
}
