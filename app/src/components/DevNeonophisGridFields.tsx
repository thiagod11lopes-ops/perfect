import { useApp } from '../store/AppContext'

function clampGridW(n: number): number {
  return Math.min(48, Math.max(6, Math.floor(n) || 12))
}

function clampGridH(n: number): number {
  return Math.min(64, Math.max(6, Math.floor(n) || 20))
}

function clampCellPx(n: number): number {
  return Math.min(48, Math.max(6, Math.floor(n) || 16))
}

/** Campos Grade H/V — usado no painel DevTimeControl e na toolbar desktop. */
export function DevNeonophisGridFields({
  variant = 'card',
  bare = false,
}: {
  variant?: 'card' | 'toolbar'
  /** Só campos — sem section/título (ex.: dentro de fold DEV). */
  bare?: boolean
}) {
  const { state, dispatch } = useApp()
  const gridW = clampGridW(state.devNeonophisGridW ?? 12)
  const gridH = clampGridH(state.devNeonophisGridH ?? 20)
  const cellPx = clampCellPx(state.devNeonophisCellPx ?? 16)

  const setGridW = (raw: string) => {
    dispatch({
      type: 'SET_DEV_NEONOPHIS_GRID',
      gridW: clampGridW(Number(raw)),
    })
  }

  const setGridH = (raw: string) => {
    dispatch({
      type: 'SET_DEV_NEONOPHIS_GRID',
      gridH: clampGridH(Number(raw)),
    })
  }

  const setCellPx = (raw: string) => {
    dispatch({
      type: 'SET_DEV_NEONOPHIS_GRID',
      cellPx: clampCellPx(Number(raw)),
    })
  }

  if (!state.devMode) return null

  if (variant === 'toolbar') {
    return (
      <>
        <label className="dev-clock-field dev-clock-field-neonophis" htmlFor="dev-toolbar-neonophis-w">
          <span>Grade H</span>
          <input
            id="dev-toolbar-neonophis-w"
            type="number"
            min={6}
            max={48}
            value={gridW}
            onChange={(e) => setGridW(e.target.value)}
          />
          <span className="dev-clock-suffix">col</span>
        </label>
        <label className="dev-clock-field dev-clock-field-neonophis" htmlFor="dev-toolbar-neonophis-h">
          <span>Grade V</span>
          <input
            id="dev-toolbar-neonophis-h"
            type="number"
            min={6}
            max={64}
            value={gridH}
            onChange={(e) => setGridH(e.target.value)}
          />
          <span className="dev-clock-suffix">lin</span>
        </label>
        <label className="dev-clock-field dev-clock-field-neonophis" htmlFor="dev-toolbar-neonophis-cell">
          <span>Célula</span>
          <input
            id="dev-toolbar-neonophis-cell"
            type="number"
            min={6}
            max={48}
            value={cellPx}
            onChange={(e) => setCellPx(e.target.value)}
          />
          <span className="dev-clock-suffix">px</span>
        </label>
      </>
    )
  }

  const fields = (
    <>
      <p className="dev-time-card-neonophis-copy">
        Colunas (H), linhas (V) e célula (px; no celular a largura preenche a tela). Recarrega o
        iframe ao mudar.
      </p>
      <div className="dev-time-card-neonophis-row">
        <label className="dev-time-card-neonophis-field" htmlFor="dev-neonophis-grid-w">
          <span className="dev-time-card-label">Grade H</span>
          <div className="dev-time-card-day-row">
            <input
              id="dev-neonophis-grid-w"
              type="number"
              min={6}
              max={48}
              value={gridW}
              onChange={(e) => setGridW(e.target.value)}
            />
            <span className="dev-time-card-suffix">col</span>
          </div>
        </label>
        <label className="dev-time-card-neonophis-field" htmlFor="dev-neonophis-grid-h">
          <span className="dev-time-card-label">Grade V</span>
          <div className="dev-time-card-day-row">
            <input
              id="dev-neonophis-grid-h"
              type="number"
              min={6}
              max={64}
              value={gridH}
              onChange={(e) => setGridH(e.target.value)}
            />
            <span className="dev-time-card-suffix">lin</span>
          </div>
        </label>
        <label className="dev-time-card-neonophis-field" htmlFor="dev-neonophis-cell-px">
          <span className="dev-time-card-label">Célula</span>
          <div className="dev-time-card-day-row">
            <input
              id="dev-neonophis-cell-px"
              type="number"
              min={6}
              max={48}
              value={cellPx}
              onChange={(e) => setCellPx(e.target.value)}
            />
            <span className="dev-time-card-suffix">px</span>
          </div>
        </label>
      </div>
    </>
  )

  if (bare) return fields

  return (
    <section className="dev-time-card-neonophis" aria-labelledby="dev-neonophis-grid-title">
      <h3 className="dev-time-card-neonophis-title" id="dev-neonophis-grid-title">
        Neonophis · grade
      </h3>
      {fields}
    </section>
  )
}