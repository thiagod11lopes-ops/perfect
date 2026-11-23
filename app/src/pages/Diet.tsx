import { useState } from 'react'
import { PageCoinsChip } from '../components/CoinsDisplay'
import { getEffectiveDiet } from '../data/adminContent'
import { getSubstitutions, mealLabels, substitutionNote } from '../data/substitutions'
import type { MealKey } from '../data/types'
import { useAdminContent } from '../hooks/useAdminContent'
import { useAppClock } from '../hooks/useAppClock'
import { useApp } from '../store/AppContext'

export function Diet() {
  const { getDay, dispatch } = useApp()
  const { ctx } = useAppClock()
  useAdminContent()
  const [week, setWeek] = useState<1 | 2 | 3 | 4>(ctx.week)
  const [showSubs, setShowSubs] = useState(false)
  const diet = getEffectiveDiet(week)
  const subs = getSubstitutions(week)
  const day = getDay(ctx.dateKey)
  const isCurrent = week === ctx.week

  const toggle = (meal: MealKey) => {
    if (!isCurrent) return
    dispatch({ type: 'TOGGLE_MEAL', date: ctx.dateKey, meal })
  }

  return (
    <div className="stack fade-in">
      <header className="stack-sm">
        <div className="page-eyebrow-row">
          <p className="eyebrow">Plano alimentar</p>
          <PageCoinsChip />
        </div>
        <h1 className="display h1">Dieta</h1>
        <p className="muted">
          Semana {week} — {diet.phase} · meta {diet.kcal} kcal · 4 refeições
        </p>
        <div className="pill-tabs">
          {([1, 2, 3, 4] as const).map((w) => (
            <button key={w} type="button" className={week === w ? 'active' : ''} onClick={() => setWeek(w)}>
              Semana {w}
            </button>
          ))}
        </div>
      </header>

      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className={`btn btn-sm ${showSubs ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowSubs((v) => !v)}>
          {showSubs ? 'Ver cardápio' : 'Guia de substituições'}
        </button>
        {!isCurrent && <span className="stat-chip">Visualização — check-in só na semana atual</span>}
      </div>

      {!showSubs ? (
        <div className="stack">
          {diet.meals.map((meal) => {
            const done = !!day.meals[meal.key]
            return (
              <article key={meal.key} className="card meal-card">
                <div className="meal-head">
                  <div>
                    <p className="eyebrow" style={{ marginBottom: 0 }}>{meal.time}</p>
                    <h2 style={{ margin: '0.15rem 0 0', fontSize: '1.15rem' }}>{meal.title}</h2>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${done && isCurrent ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => toggle(meal.key)}
                    disabled={!isCurrent}
                  >
                    {done && isCurrent ? 'Feito' : 'Marcar'}
                  </button>
                </div>
                <div className="meal-body">
                  {meal.items.map((item) => (
                    <div className="food-line" key={`${meal.key}-${item.name}`}>
                      <strong>{item.name}</strong>
                      <span>{item.amount}</span>
                    </div>
                  ))}
                  {meal.prep ? <p className="muted" style={{ marginTop: '0.8rem', marginBottom: 0 }}>{meal.prep}</p> : null}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="stack">
          <div className="banner">{substitutionNote}</div>
          {(Object.keys(subs.meals) as MealKey[]).map((key) => (
            <section key={key} className="card stack-sm">
              <h3 style={{ margin: 0 }}>{mealLabels[key]}</h3>
              {subs.meals[key].map((row) => (
                <div key={row.original} className="card soft">
                  <strong>{row.original}</strong>
                  <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    Opção 1: {row.option1}<br />
                    Opção 2: {row.option2}
                  </p>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
