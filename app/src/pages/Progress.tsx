import { PageCoinsChip } from '../components/CoinsDisplay'
import { photoPoses } from '../data/content'
import { useAppClock } from '../hooks/useAppClock'
import { useApp } from '../store/AppContext'
import { formatShortDate, parseISODate, sundayKeys } from '../utils/dates'

export function Progress() {
  const { state, dispatch, getDay } = useApp()
  const { ctx } = useAppClock()
  const keys = sundayKeys(state.startDate)
  const workoutDays = Object.values(state.daily).filter((d) => d.workoutDone).length
  const mealDays = Object.values(state.daily).filter(
    (d) => Object.values(d.meals).filter(Boolean).length >= 4,
  ).length

  return (
    <div className="stack fade-in">
      <header className="stack-sm">
        <div className="page-eyebrow-row">
          <p className="eyebrow">Registro da evolução</p>
          <PageCoinsChip />
        </div>
        <h1 className="display h1">Progresso</h1>
        <p className="muted">Fotos aos domingos. Balança só no início e no fim.</p>
      </header>

      <section className="grid-2">
        <div className="card stack-sm">
          <p className="eyebrow">Peso inicial</p>
          <h2 className="display h2" style={{ fontSize: '2.4rem' }}>{state.profile.weight || '—'} kg</h2>
          <p className="muted">Meta: −{state.profile.goalKg || '—'} kg</p>
        </div>
        <div className="card stack-sm">
          <p className="eyebrow">Peso final</p>
          <div className="field">
            <label>Após 28 dias</label>
            <input
              value={state.weightFinal}
              onChange={(e) => dispatch({ type: 'SET_WEIGHT_FINAL', value: e.target.value })}
              placeholder="Ex: 72.4"
              inputMode="decimal"
            />
          </div>
        </div>
      </section>

      <section className="card stack-sm">
        <p className="eyebrow">Aderência</p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <span className="stat-chip orange">{workoutDays} treinos</span>
          <span className="stat-chip">{mealDays} dias 100% dieta</span>
          <span className="stat-chip">Dia {ctx.day}/28</span>
        </div>
      </section>

      <section className="card stack">
        <p className="eyebrow">Registro fotográfico</p>
        <p className="muted">
          Quatro posições: {photoPoses.join(' · ')}. Rosto opcional. Envie apenas em canal privado.
        </p>
        {keys.map((key, idx) => (
          <div key={key} className="card soft stack-sm">
            <div className="row-between">
              <strong>{idx === 0 ? 'Registro inicial' : `Domingo · ${formatShortDate(parseISODate(key))}`}</strong>
              <span className="muted">{getDay(key).workoutDone ? 'ativo' : '—'}</span>
            </div>
            <div className="field">
              <label>Anotação privada</label>
              <textarea
                rows={2}
                value={state.photoNotes[key] ?? ''}
                onChange={(e) => dispatch({ type: 'SET_PHOTO_NOTE', key, note: e.target.value })}
                placeholder="Ex: fotos salvas no álbum privado / enviadas ao coach"
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
