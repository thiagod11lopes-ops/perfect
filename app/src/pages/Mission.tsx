import { useState } from 'react'
import { PageCoinsChip } from '../components/CoinsDisplay'
import { brand } from '../data/content'
import { getMission, missions } from '../data/missions'
import { useAppClock } from '../hooks/useAppClock'
import { useApp } from '../store/AppContext'

export function Mission() {
  const { getDay, dispatch } = useApp()
  const { ctx } = useAppClock()
  const [week, setWeek] = useState<1 | 2 | 3 | 4>(ctx.week)
  const mission = getMission(week)
  const day = getDay(ctx.dateKey)
  const checks = day.missionChecks.length
    ? day.missionChecks
    : Array(mission.records).fill(false)
  const doneCount = checks.filter(Boolean).length
  const allWeeksDone = missions.every((m) => {
    // approximate: count any day in that week with enough checks - for MVP show week-level from today's week progress only
    return m.week < ctx.week || (m.week === ctx.week && doneCount >= m.records)
  })

  return (
    <div className="stack fade-in">
      <header className="stack-sm">
        <div className="page-eyebrow-row">
          <p className="eyebrow">Missões de superação</p>
          <PageCoinsChip />
        </div>
        <h1 className="display h1">Missão</h1>
        <p className="muted">
          Panorama semanal · a comprovação com foto e moedinhas fica na aba Hoje
        </p>
        <div className="pill-tabs">
          {([1, 2, 3, 4] as const).map((w) => (
            <button key={w} type="button" className={week === w ? 'active' : ''} onClick={() => setWeek(w)}>
              Semana {w}
            </button>
          ))}
        </div>
      </header>

      <section className="hero-panel stack">
        <p className="eyebrow">Missão semanal 0{week} · {mission.theme}</p>
        <h2 className="display h2">{mission.title}</h2>
        <p className="muted">{mission.summary}</p>
        <div className="stat-chip orange">{doneCount}/{mission.records} registros</div>
      </section>

      <section className="card accent stack">
        <p className="eyebrow">O que você precisa fazer</p>
        {mission.tasks.map((task) => (
          <div key={task.label} className="card soft row-between">
            <strong>{task.label}</strong>
            <span className="muted">{task.detail}</span>
          </div>
        ))}
      </section>

      <section className="card stack">
        <p className="eyebrow">Checklist de validação</p>
        <p className="muted">{mission.validation}</p>
        {Array.from({ length: mission.records }).map((_, i) => (
          <button
            key={i}
            type="button"
            className={`check-row ${checks[i] ? 'done' : ''}`}
            onClick={() =>
              week === ctx.week &&
              dispatch({ type: 'TOGGLE_MISSION', date: ctx.dateKey, index: i, total: mission.records })
            }
            disabled={week !== ctx.week}
          >
            <span className="check-box">{checks[i] ? '✓' : ''}</span>
            <span>Registro {i + 1}</span>
            <span className="muted">{checks[i] ? 'ok' : 'pendente'}</span>
          </button>
        ))}
        {week !== ctx.week && (
          <p className="muted" style={{ margin: 0 }}>Checklist editável apenas na semana atual.</p>
        )}
      </section>

      <section className="banner">
        <strong>Prêmio final: 50% OFF</strong>
        <p style={{ margin: '0.35rem 0 0' }}>{brand.prize}</p>
        <p className="muted" style={{ margin: '0.45rem 0 0' }}>
          Marque {brand.handle} nos Stories. Missões não são obrigatórias para continuar no programa.
        </p>
        {allWeeksDone && ctx.week === 4 && (
          <p style={{ margin: '0.7rem 0 0', color: 'var(--success)', fontWeight: 800 }}>
            Você está no caminho do benefício — valide as 4 missões com o coach.
          </p>
        )}
      </section>
    </div>
  )
}
