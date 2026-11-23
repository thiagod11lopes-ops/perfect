// Piano-roll editável — usado pelos editores de Bass e Magnet melody.
//
// Layout: linhas = semitons (decrescentes, agudos no topo), colunas = steps
// do padrão. Cada COLUNA tem exatamente UMA nota ativa (o motor lê
// `pattern[i]` como um único semitom). Click numa célula define a nota
// daquela coluna; click na nota corrente remove (ou pode mudar para outra).
//
// Range de pitches: configurável via `pitchMin`/`pitchMax` (semitons
// relativos à raiz). Para baixo: -24..+24. Para fanfarra: -12..+24.

export interface PianoRollHandle {
  el: HTMLElement;
  setPattern(pattern: ReadonlyArray<number>): void;
}

export interface PianoRollOptions {
  pitchMin: number;        // ex: -24
  pitchMax: number;        // ex: +24
  /** Callback quando o usuário clica em (index, semitones). */
  onSetNote: (index: number, semitones: number) => void;
}

export function createPianoRoll(
  initialPattern: ReadonlyArray<number>,
  opts: PianoRollOptions,
): PianoRollHandle {
  const el = document.createElement('div');
  el.className = 'piano-roll';

  let currentPattern: ReadonlyArray<number> = initialPattern;

  function render(): void {
    el.innerHTML = '';
    const cols = currentPattern.length;
    // Renderiza do mais agudo para o mais grave (convenção DAW).
    for (let pitch = opts.pitchMax; pitch >= opts.pitchMin; pitch--) {
      const row = document.createElement('div');
      row.className = 'piano-row';
      // Destaca raiz e oitavas para orientação visual.
      const isRoot = pitch === 0;
      const isOctave = pitch !== 0 && pitch % 12 === 0;
      const isFifth = Math.abs(pitch) === 7 || Math.abs(pitch) === 19;
      if (isRoot)        row.classList.add('is-root');
      else if (isOctave) row.classList.add('is-octave');
      else if (isFifth)  row.classList.add('is-fifth');

      // Label da nota (ex: "+12", "0", "-7").
      const label = document.createElement('div');
      label.className = 'piano-label';
      label.textContent = pitch > 0 ? `+${pitch}` : String(pitch);
      row.appendChild(label);

      for (let col = 0; col < cols; col++) {
        const cell = document.createElement('div');
        cell.className = 'piano-cell';
        cell.dataset.col = String(col);
        cell.dataset.pitch = String(pitch);
        // Marca cada 4ª coluna com linha-divisória mais forte.
        if (col % 4 === 0 && col > 0) cell.classList.add('is-beat-mark');
        if (currentPattern[col] === pitch) cell.classList.add('is-active');
        row.appendChild(cell);
      }
      el.appendChild(row);
    }
  }

  el.addEventListener('click', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.piano-cell');
    if (!cell || cell.dataset.col == null || cell.dataset.pitch == null) return;
    const col = Number(cell.dataset.col);
    const pitch = Number(cell.dataset.pitch);
    opts.onSetNote(col, pitch);
  });

  render();

  return {
    el,
    setPattern(pattern): void {
      currentPattern = pattern;
      render();
    },
  };
}
