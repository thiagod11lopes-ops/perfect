// Step-grid editável — usado pelos editores de Snare e Kick.
//
// Renderiza N células (uma por 8th do compasso). Click toggle, drag pinta
// (mantém o estado da primeira célula tocada — adiciona ou remove em todas
// as próximas tocadas no mesmo gesto).
//
// Componente puro: recebe (positions, barLen, onToggle) e devolve um
// elemento que se atualiza via método `setPositions`. Sem state interno
// duplicado — fonte de verdade fica no editedConfig.

export interface StepGridHandle {
  el: HTMLElement;
  setPositions(positions: ReadonlyArray<number>, barLen: number): void;
}

export function createStepGrid(
  initialPositions: ReadonlyArray<number>,
  initialBarLen: number,
  onToggle: (position: number) => void,
): StepGridHandle {
  const el = document.createElement('div');
  el.className = 'step-grid';

  let currentPositions: ReadonlyArray<number> = initialPositions;
  let currentBarLen = initialBarLen;

  // Estado de drag-paint: ao pressionar mouse numa célula, decidimos se vamos
  // ATIVAR ou DESATIVAR todas as células tocadas neste gesto.
  let painting: 'add' | 'remove' | null = null;
  const paintedThisDrag = new Set<number>();

  function render(): void {
    el.innerHTML = '';
    const set = new Set(currentPositions);
    for (let i = 0; i < currentBarLen; i++) {
      const cell = document.createElement('div');
      cell.className = 'step-cell';
      cell.dataset.pos = String(i);
      // Marcador visual a cada beat (4 8ths).
      if (i % 4 === 0) cell.classList.add('is-beat-mark');
      if (set.has(i)) cell.classList.add('is-active');
      cell.textContent = String(i);
      el.appendChild(cell);
    }
  }

  el.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement;
    const cell = target.closest<HTMLElement>('.step-cell');
    if (!cell || cell.dataset.pos == null) return;
    const pos = Number(cell.dataset.pos);
    const isActive = cell.classList.contains('is-active');
    painting = isActive ? 'remove' : 'add';
    paintedThisDrag.clear();
    paintedThisDrag.add(pos);
    onToggle(pos);
    e.preventDefault();
  });

  el.addEventListener('mouseover', (e) => {
    if (!painting) return;
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.step-cell');
    if (!cell || cell.dataset.pos == null) return;
    const pos = Number(cell.dataset.pos);
    if (paintedThisDrag.has(pos)) return;
    const isActive = cell.classList.contains('is-active');
    // Só dispara se a célula está no estado oposto ao modo de pintura
    // (drag de "add" só ativa células inativas, e vice-versa).
    if ((painting === 'add' && !isActive) || (painting === 'remove' && isActive)) {
      paintedThisDrag.add(pos);
      onToggle(pos);
    }
  });

  // Ouvir mouseup no document — evita ficar "pintando" se soltar fora do grid.
  const stopPainting = (): void => { painting = null; paintedThisDrag.clear(); };
  document.addEventListener('mouseup', stopPainting);
  // (cleanup ficaria via método destroy se o componente fosse desmontado;
  // neste momento o lab não desmonta editores — eles são substituídos por
  // innerHTML do host, então o listener vira "no-op" inofensivo).

  render();

  return {
    el,
    setPositions(positions, barLen): void {
      currentPositions = positions;
      currentBarLen = barLen;
      render();
    },
  };
}
