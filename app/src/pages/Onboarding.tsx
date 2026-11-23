import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { brand, goldenRules } from '../data/content'
import { publicUrl } from '../utils/publicUrl'
import {
  cloneDailyRoutine,
  completedWeekdayCount,
  emptyWeeklyRoutine,
  exampleRoutine,
  exampleWeeklyRoutine,
  intervalFields,
  isRoutineComplete,
  isWeeklyRoutineComplete,
  pointFields,
  WEEKDAY_META,
  WEEKDAY_ORDER,
  type RoutineIntervalSlot,
  type RoutinePointSlot,
  type WeekdayIndex,
  type WeeklyRoutine,
} from '../data/routine'
import type { Profile } from '../data/types'
import { useAppBase } from '../hooks/useAppBase'
import { useApp } from '../store/AppContext'
import { toISODate } from '../utils/dates'
import { scrollPhoneContentToTop } from '../utils/scrollPhoneToTop'

const blank: Profile = {
  name: '',
  birthDate: '',
  age: '',
  sex: '',
  weight: '',
  height: '',
  goalKg: '',
  health: '',
  meds: '',
  allergies: '',
}

const exampleProfile: Profile = {
  name: 'Cristiano Santos',
  birthDate: '1985-05-14',
  age: '40',
  sex: 'M',
  weight: '78',
  height: '175',
  goalKg: '6',
  health: 'Nenhum',
  meds: 'Não',
  allergies: 'Nenhuma',
}

const stepLabels = ['Visão geral', 'Inscrição', 'Regras', 'Rotina']

export function Onboarding() {
  const { dispatch } = useApp()
  const navigate = useNavigate()
  const { path, isMobileSim } = useAppBase()
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<Profile>(blank)
  const [weekly, setWeekly] = useState<WeeklyRoutine>(() => emptyWeeklyRoutine())
  const [activeDay, setActiveDay] = useState<WeekdayIndex>(1)
  const [copyFlash, setCopyFlash] = useState('')
  const [accepted, setAccepted] = useState(false)

  useLayoutEffect(() => {
    if (step !== 2 && step !== 3) return
    scrollPhoneContentToTop()
    requestAnimationFrame(scrollPhoneContentToTop)
  }, [step])

  const [phoneAppEl, setPhoneAppEl] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const phone = document.querySelector<HTMLElement>('.phone-app')
    if (!phone) return
    const pinOn = isMobileSim && step === 3
    phone.classList.toggle('has-routine-day-pin', pinOn)
    setPhoneAppEl(pinOn ? phone : null)
    return () => {
      phone.classList.remove('has-routine-day-pin')
    }
  }, [isMobileSim, step])

  const dayRoutine = weekly[activeDay]
  const doneDays = completedWeekdayCount(weekly)
  const update = (key: keyof Profile, value: string) => {
    setProfile((p) => ({ ...p, [key]: value }))
    if (key === 'weight') {
      dispatch({ type: 'PATCH_PROFILE', patch: { weight: value } })
    }
  }

  const updatePoint = (key: RoutinePointSlot, value: string) => {
    setWeekly((w) => ({
      ...w,
      [activeDay]: { ...w[activeDay], [key]: value },
    }))
  }

  const updateInterval = (key: RoutineIntervalSlot, edge: 'start' | 'end', value: string) => {
    setWeekly((w) => ({
      ...w,
      [activeDay]: {
        ...w[activeDay],
        [key]: { ...w[activeDay][key], [edge]: value },
      },
    }))
  }

  const flashCopy = (message: string) => {
    setCopyFlash(message)
    window.setTimeout(() => setCopyFlash(''), 2200)
  }

  const copyRoutineFromPreviousDay = () => {
    const idx = WEEKDAY_ORDER.indexOf(activeDay)
    if (idx <= 0) return
    const previousDay = WEEKDAY_ORDER[idx - 1]!
    setWeekly((w) => ({
      ...w,
      [activeDay]: cloneDailyRoutine(w[previousDay]),
    }))
    flashCopy(`Rotina copiada de ${WEEKDAY_META[previousDay].short}`)
  }

  const start = () => {
    if (!profile.name.trim() || !profile.weight.trim()) return
    if (!isWeeklyRoutineComplete(weekly)) return
    dispatch({
      type: 'COMPLETE_ONBOARDING',
      profile,
      routine: weekly,
      startDate: toISODate(new Date()),
    })
    navigate(path('/'))
  }

  const mealFields = pointFields.filter((f) => f.section === 'refeicoes')
  const activityIntervals = intervalFields.filter((f) => f.section === 'atividade')
  const agendaIntervals = intervalFields.filter((f) => f.section === 'agenda')
  const activeMeta = WEEKDAY_META[activeDay]

  return (
    <div className="app-shell">
      <main className="main fade-in" style={isMobileSim ? undefined : { maxWidth: 720 }}>
        <div className="hero-panel stack">
          <img className="logo-mark" src={publicUrl('/logo.png?v=do-zero-cinza-solido')} alt={brand.name} />
          <p className="eyebrow">Bem-vindo ao desafio</p>
          <h1 className="display h1">Do zero ao topo em 28 dias</h1>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <span className="stat-chip orange">28 dias</span>
            <span className="stat-chip">4 fases</span>
            <span className="stat-chip">Dieta + Treino + Missões</span>
          </div>
        </div>

        <div className="stack" style={{ marginTop: '1.1rem' }}>
          <div className="pill-tabs" role="tablist" aria-label="Etapas da inscrição">
            {stepLabels.map((label, i) => (
              <button
                key={label}
                type="button"
                className={step === i ? 'active' : ''}
                disabled={i > step}
                onClick={() => i <= step && setStep(i)}
              >
                {label}
              </button>
            ))}
          </div>

          {step === 0 && (
            <div className="card stack">
              <h2 className="display h2">Sua jornada</h2>
              <p className="muted">
                Leia a visão geral, faça a inscrição, aceite as regras e informe sua rotina. As cartas
                do dia liberam nos horários que você definir.
              </p>
              <div className="card soft stack-sm">
                <p className="eyebrow">Como funciona</p>
                <p style={{ margin: 0 }}>1. Inscrição + rotina por dia da semana</p>
                <p style={{ margin: 0 }}>2. Cartas liberam nos seus horários</p>
                <p style={{ margin: 0 }}>3. Foto + verificação e moedinhas</p>
              </div>
              <button className="btn btn-primary btn-block" type="button" onClick={() => setStep(1)}>
                Começar inscrição
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="card stack form-card">
              <div className="form-header">
                <div>
                  <h2 className="display h2">Formulário de inscrição</h2>
                  <p className="muted form-hint">Dados de saúde ficam privados neste dispositivo.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm form-example-btn"
                  onClick={() => setProfile(exampleProfile)}
                >
                  Preencher exemplo
                </button>
              </div>

              <div className="form-section">
                <p className="form-section-title">Identificação</p>
                <div className="field">
                  <label>Nome completo</label>
                  <input value={profile.name} onChange={(e) => update('name', e.target.value)} placeholder="Seu nome" />
                </div>
                <div className="form-row">
                  <div className="field">
                    <label>Nascimento</label>
                    <input type="date" value={profile.birthDate} onChange={(e) => update('birthDate', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Idade</label>
                    <input value={profile.age} onChange={(e) => update('age', e.target.value)} inputMode="numeric" placeholder="40" />
                  </div>
                </div>
                <div className="field">
                  <label>Sexo</label>
                  <select value={profile.sex} onChange={(e) => update('sex', e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="F">Feminino</option>
                    <option value="M">Masculino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <p className="form-section-title">Medidas</p>
                <div className="form-row">
                  <div className="field">
                    <label>Peso (kg)</label>
                    <input value={profile.weight} onChange={(e) => update('weight', e.target.value)} inputMode="decimal" placeholder="78" />
                  </div>
                  <div className="field">
                    <label>Altura (cm)</label>
                    <input value={profile.height} onChange={(e) => update('height', e.target.value)} inputMode="numeric" placeholder="175" />
                  </div>
                </div>
                <div className="field">
                  <label>Meta de perda (kg)</label>
                  <input value={profile.goalKg} onChange={(e) => update('goalKg', e.target.value)} inputMode="decimal" placeholder="6" />
                </div>
              </div>

              <div className="form-section">
                <p className="form-section-title">Saúde</p>
                <div className="field">
                  <label>Problema de saúde?</label>
                  <textarea rows={2} value={profile.health} onChange={(e) => update('health', e.target.value)} placeholder="Nenhum" />
                </div>
                <div className="field">
                  <label>Medicamentos?</label>
                  <textarea rows={2} value={profile.meds} onChange={(e) => update('meds', e.target.value)} placeholder="Não" />
                </div>
                <div className="field">
                  <label>Alergia alimentar?</label>
                  <textarea rows={2} value={profile.allergies} onChange={(e) => update('allergies', e.target.value)} placeholder="Nenhuma" />
                </div>
              </div>

              <div className="row" style={{ gap: '0.55rem', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" type="button" onClick={() => setStep(0)}>
                  Voltar
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    setStep(2)
                    scrollPhoneContentToTop()
                  }}
                  disabled={!profile.name || !profile.weight}
                  style={{ flex: 1 }}
                >
                  Continuar para as regras
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card stack">
              <h2 className="display h2">10 regras de ouro</h2>
              <p className="muted">Aceite as regras e avance para montar sua rotina diária.</p>
              <div className="stack-sm">
                {goldenRules.map((rule, i) => (
                  <div key={rule.title} className="card soft">
                    <p className="eyebrow">{String(i + 1).padStart(2, '0')}</p>
                    <strong>{rule.title}</strong>
                    <p className="muted" style={{ marginBottom: 0 }}>{rule.text}</p>
                  </div>
                ))}
              </div>
              <label className="row" style={{ alignItems: 'flex-start' }}>
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                <span className="muted">
                  Li e aceito as orientações do desafio. Entendo que o cardápio é coletivo e não substitui
                  atendimento individual.
                </span>
              </label>
              <div className="row" style={{ gap: '0.55rem', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" type="button" onClick={() => setStep(1)}>
                  Voltar
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={!accepted}
                  onClick={() => {
                    setStep(3)
                    scrollPhoneContentToTop()
                  }}
                  style={{ flex: 1 }}
                >
                  Continuar para a rotina
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card stack form-card">
              <div className="form-header">
                <div>
                  <h2 className="display h2">Sua rotina diária</h2>
                  <p className="muted form-hint">
                    Preencha de segunda a domingo. Monte um dia e copie para os outros — sem repetir
                    tudo.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm form-example-btn"
                  onClick={() => {
                    setWeekly(exampleWeeklyRoutine())
                    setActiveDay(1)
                    flashCopy('Exemplo aplicado em todos os dias')
                  }}
                >
                  Preencher exemplo
                </button>
              </div>

              <div className="routine-week-progress" aria-live="polite">
                <strong>{doneDays}/7 dias prontos</strong>
                <span className="muted">
                  {doneDays === 7 ? 'Rotina completa' : 'Faltam horários em alguns dias'}
                </span>
              </div>

              <div className="routine-day-tabs" role="tablist" aria-label="Dias da semana">
                {WEEKDAY_ORDER.map((day) => {
                  const complete = isRoutineComplete(weekly[day])
                  const meta = WEEKDAY_META[day]
                  return (
                    <button
                      key={day}
                      type="button"
                      role="tab"
                      aria-selected={activeDay === day}
                      className={`routine-day-tab${activeDay === day ? ' is-active' : ''}${complete ? ' is-complete' : ''}`}
                      onClick={() => setActiveDay(day)}
                    >
                      <span>{meta.short}</span>
                      {complete ? <span className="routine-day-check" aria-hidden>✓</span> : null}
                    </button>
                  )
                })}
              </div>

              {!isMobileSim ? (
                <div className="routine-day-sticky" key={activeDay} aria-live="polite">
                  <p className="routine-day-sticky-eyebrow">Editando rotina</p>
                  <p className="routine-day-sticky-title">{activeMeta.long}</p>
                </div>
              ) : null}

              <button
                type="button"
                className="routine-copy-prev-btn"
                onClick={copyRoutineFromPreviousDay}
                disabled={WEEKDAY_ORDER.indexOf(activeDay) === 0}
              >
                Copiar rotina do dia anterior
              </button>
              {copyFlash ? (
                <p className="routine-copy-flash" role="status">
                  {copyFlash}
                </p>
              ) : null}

              <div className="routine-day-panel" role="tabpanel" aria-label={activeMeta.long}>
                <div className="routine-day-heading">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setWeekly((w) => ({
                        ...w,
                        [activeDay]: cloneDailyRoutine(exampleRoutine),
                      }))
                    }
                  >
                    Exemplo neste dia
                  </button>
                </div>

                <div className="form-section">
                  <p className="form-section-title">Refeições</p>
                  <div className="form-row routine-grid">
                    {mealFields.map((f) => (
                      <div className="field" key={f.key}>
                        <label htmlFor={`routine-${activeDay}-${f.key}`}>{f.label}</label>
                        <input
                          id={`routine-${activeDay}-${f.key}`}
                          type="time"
                          value={dayRoutine[f.key]}
                          onChange={(e) => updatePoint(f.key, e.target.value)}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-section">
                  <p className="form-section-title">Treino e sono</p>
                  {activityIntervals.map((f) => (
                    <div className="routine-interval" key={f.key}>
                      <p className="routine-interval-label">{f.label}</p>
                      <div className="form-row">
                        <div className="field">
                          <label htmlFor={`routine-${activeDay}-${f.key}-start`}>Início</label>
                          <input
                            id={`routine-${activeDay}-${f.key}-start`}
                            type="time"
                            value={dayRoutine[f.key].start}
                            onChange={(e) => updateInterval(f.key, 'start', e.target.value)}
                            required
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`routine-${activeDay}-${f.key}-end`}>Fim</label>
                          <input
                            id={`routine-${activeDay}-${f.key}-end`}
                            type="time"
                            value={dayRoutine[f.key].end}
                            onChange={(e) => updateInterval(f.key, 'end', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-section">
                  <p className="form-section-title">Trabalho, descanso e lazer</p>
                  {agendaIntervals.map((f) => (
                    <div className="routine-interval" key={f.key}>
                      <p className="routine-interval-label">{f.label}</p>
                      <div className="form-row">
                        <div className="field">
                          <label htmlFor={`routine-${activeDay}-${f.key}-start`}>Início</label>
                          <input
                            id={`routine-${activeDay}-${f.key}-start`}
                            type="time"
                            value={dayRoutine[f.key].start}
                            onChange={(e) => updateInterval(f.key, 'start', e.target.value)}
                            required
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`routine-${activeDay}-${f.key}-end`}>Fim</label>
                          <input
                            id={`routine-${activeDay}-${f.key}-end`}
                            type="time"
                            value={dayRoutine[f.key].end}
                            onChange={(e) => updateInterval(f.key, 'end', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="row" style={{ gap: '0.55rem', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" type="button" onClick={() => setStep(2)}>
                  Voltar
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={!isWeeklyRoutineComplete(weekly)}
                  onClick={start}
                  style={{ flex: 1 }}
                >
                  Concluir e entrar
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      {phoneAppEl
        ? createPortal(
            <div className="routine-day-pin" key={activeDay} aria-live="polite">
              <p className="routine-day-pin-eyebrow">Editando rotina</p>
              <p className="routine-day-pin-title">{activeMeta.long}</p>
            </div>,
            phoneAppEl,
          )
        : null}
    </div>
  )
}
