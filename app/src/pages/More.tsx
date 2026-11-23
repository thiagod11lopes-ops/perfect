import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageCoinsChip } from '../components/CoinsDisplay'
import { brand, goldenRules, hydrationDrinks } from '../data/content'
import { getShopping } from '../data/shopping'
import { resetWeekUnlockCelebrationState } from '../data/weekUnlockCelebrate'
import { useAppBase } from '../hooks/useAppBase'
import { useAppClock } from '../hooks/useAppClock'
import { useApp } from '../store/AppContext'
import { formatCoins } from '../utils/format'
import { publicUrl } from '../utils/publicUrl'

type Tab = 'menu' | 'rules' | 'shop' | 'water' | 'dev'

export function More() {
  const { state, dispatch } = useApp()
  const { path } = useAppBase()
  const navigate = useNavigate()
  const { ctx, devMode, devDay, devTime, devTimeLive, setDevDay, setDevTime } = useAppClock()
  const [tab, setTab] = useState<Tab>('menu')
  const [week, setWeek] = useState<1 | 2 | 3 | 4>(ctx.week)
  const [simDay, setSimDay] = useState(1)
  const [simTime, setSimTime] = useState('08:00:00')
  const [simCoins, setSimCoins] = useState(0)
  const [devCoinsDraft, setDevCoinsDraft] = useState(String(state.coins))
  const shop = getShopping(week)
  const checked = state.shopping[String(week)] ?? {}

  const startDev = (day = simDay, time = simTime, coins = simCoins) => {
    const safeDay = Math.min(28, Math.max(1, Number(day) || 1))
    const safeTime = time || '08:00:00'
    const safeCoins = Math.max(0, Math.floor(Number(coins) || 0))
    // Baseline 0 para celebrar desbloqueios ao iniciar já acima de 2500/5000/7500.
    resetWeekUnlockCelebrationState(0)
    dispatch({ type: 'LOAD_DEV_MODE', day: safeDay, time: safeTime, coins: safeCoins })
    navigate(path('/'))
  }

  useEffect(() => {
    if (devMode) setDevCoinsDraft(String(state.coins))
  }, [devMode, state.coins])

  const applyDevCoins = () => {
    const value = Math.max(0, Math.floor(Number(devCoinsDraft) || 0))
    dispatch({ type: 'SET_DEV_COINS', coins: value })
    setDevCoinsDraft(String(value))
  }

  if (tab === 'rules') {
    return (
      <div className="stack fade-in">
        <button type="button" className="btn btn-ghost btn-sm" style={{ width: 'fit-content' }} onClick={() => setTab('menu')}>
          ← Voltar
        </button>
        <h1 className="display h1">10 regras de ouro</h1>
        <div className="stack">
          {goldenRules.map((rule, i) => (
            <article key={rule.title} className="card soft">
              <p className="eyebrow">{String(i + 1).padStart(2, '0')}</p>
              <h3 style={{ margin: '0 0 0.35rem' }}>{rule.title}</h3>
              <p className="muted" style={{ margin: 0 }}>{rule.text}</p>
            </article>
          ))}
        </div>
      </div>
    )
  }

  if (tab === 'water') {
    return (
      <div className="stack fade-in">
        <button type="button" className="btn btn-ghost btn-sm" style={{ width: 'fit-content' }} onClick={() => setTab('menu')}>
          ← Voltar
        </button>
        <h1 className="display h1">Hidratação</h1>
        <div className="card stack-sm">
          <p className="eyebrow">Fórmula</p>
          <p style={{ margin: 0 }}>peso (kg) × 30 ml + 500 ml nos dias de treino</p>
        </div>
        <div className="card stack">
          <p className="eyebrow">Bebidas liberadas</p>
          {hydrationDrinks.map((d) => (
            <div key={d.name} className="row-between card soft">
              <strong>{d.name}</strong>
              <span className="muted">{d.tip}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (tab === 'shop') {
    const done = shop.items.filter((i) => checked[i.id]).length
    return (
      <div className="stack fade-in">
        <button type="button" className="btn btn-ghost btn-sm" style={{ width: 'fit-content' }} onClick={() => setTab('menu')}>
          ← Voltar
        </button>
        <h1 className="display h1">Lista de compras</h1>
        <div className="pill-tabs">
          {([1, 2, 3, 4] as const).map((w) => (
            <button key={w} type="button" className={week === w ? 'active' : ''} onClick={() => setWeek(w)}>
              Semana {w}
            </button>
          ))}
        </div>
        <div className="card accent stack-sm">
          <p className="eyebrow">Semana {week} · {shop.phase}</p>
          <p style={{ margin: 0 }}>Meta {shop.kcal} kcal/dia</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <span className="stat-chip">Usados {shop.costUsed}</span>
            <span className="stat-chip orange">Comprar {shop.costBuy}</span>
            <span className="stat-chip">{done}/{shop.items.length}</span>
          </div>
        </div>
        <div className="stack-sm">
          {shop.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`check-row ${checked[item.id] ? 'done' : ''}`}
              onClick={() => dispatch({ type: 'TOGGLE_SHOP', week, id: item.id })}
            >
              <span className="check-box">{checked[item.id] ? '✓' : ''}</span>
              <span>
                <strong>{item.name}</strong>
                <br />
                <span className="muted">{item.weeklyTotal}</span>
              </span>
              <span className="muted">{item.buy}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (tab === 'dev') {
    return (
      <div className="stack fade-in">
        <button type="button" className="btn btn-ghost btn-sm" style={{ width: 'fit-content' }} onClick={() => setTab('menu')}>
          ← Voltar
        </button>
        <h1 className="display h1">Desenvolvimento</h1>
        <p className="muted">
          Simula uma participante nos 28 dias, com inscrição e rotina já preenchidas. Na aba Hoje, altere
          dia e hora ao lado das moedas para testar as janelas das cartas.
        </p>

        <div className="card stack-sm">
          <p className="eyebrow">Persona</p>
          <p style={{ margin: 0 }}><strong>Ana Desenvolvedora</strong> · 31 anos · 72 kg</p>
          <p className="muted" style={{ margin: 0 }}>
            Rotina do formulário · treino e sono aparecem nas cartas do baralho
          </p>
        </div>

        {devMode ? (
          <div className="card accent stack">
            <p className="eyebrow">Modo ativo</p>
            <p style={{ margin: 0 }}>
              Dia {devDay}/28 · {devTimeLive} · {formatCoins(state.coins)} moedas · semana {ctx.week}
              {ctx.weekLocked ? ` (cal. ${ctx.calendarWeek})` : ''}
              {' · '}
              {ctx.unlockProgress.nextWeek
                ? `faltam ${formatCoins(ctx.unlockProgress.remaining)} → sem. ${ctx.unlockProgress.nextWeek}`
                : 'semanas liberadas'}
              {' · crescimento '}
              {ctx.challenge.percent}% · {ctx.challenge.lost} perdidas
            </p>
            <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
              Rotina por dia da semana · treino e sono saem do dia atual nas cartas
            </p>
            <div className="form-row">
              <div className="field">
                <label htmlFor="dev-day-more">Dia do desafio</label>
                <div className="dev-day-input">
                  <input
                    id="dev-day-more"
                    type="number"
                    min={1}
                    max={28}
                    value={devDay}
                    onChange={(e) => setDevDay(Number(e.target.value) || 1)}
                  />
                  <span className="dev-day-suffix">/ 28</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="dev-time-more">Hora</label>
                <input
                  id="dev-time-more"
                  type="time"
                  step={1}
                  value={devTime}
                  onChange={(e) => setDevTime(e.target.value || '08:00:00')}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="dev-coins-more">Moedas já ganhas</label>
              <div className="dev-coins-row">
                <input
                  id="dev-coins-more"
                  type="number"
                  min={0}
                  step={1}
                  value={devCoinsDraft}
                  onChange={(e) => setDevCoinsDraft(e.target.value)}
                  onFocus={() => setDevCoinsDraft(String(state.coins))}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={applyDevCoins}>
                  Aplicar
                </button>
              </div>
            </div>
            <div className="row" style={{ gap: '0.55rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={() => navigate(path('/'))}>
                Ir para Hoje
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  dispatch({ type: 'EXIT_DEV_MODE' })
                }}
              >
                Sair do modo DEV
              </button>
            </div>
          </div>
        ) : (
          <div className="card stack">
            <p className="eyebrow">Iniciar simulação</p>
            <p className="muted" style={{ margin: 0 }}>
              Escolha o dia (1–28) e a hora. Substitui os dados deste dispositivo pela persona de teste.
            </p>
            <div className="form-row">
              <div className="field">
                <label htmlFor="sim-day-start">Dia do desafio</label>
                <div className="dev-day-input">
                  <input
                    id="sim-day-start"
                    type="number"
                    min={1}
                    max={28}
                    value={simDay}
                    onChange={(e) => setSimDay(Math.min(28, Math.max(1, Number(e.target.value) || 1)))}
                  />
                  <span className="dev-day-suffix">/ 28</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="sim-time-start">Hora</label>
                <input
                  id="sim-time-start"
                  type="time"
                  step={1}
                  value={simTime}
                  onChange={(e) => setSimTime(e.target.value || '08:00:00')}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="sim-coins-start">Moedas já ganhas</label>
              <input
                id="sim-coins-start"
                type="number"
                min={0}
                step={1}
                value={simCoins}
                onChange={(e) => setSimCoins(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => startDev(simDay, simTime, simCoins)}
            >
              Iniciar no dia {simDay}/28 · {simTime} · {formatCoins(simCoins)} moedas
            </button>
            <p className="muted" style={{ margin: 0, fontSize: '0.78rem' }}>
              Atalhos
            </p>
            <div className="row" style={{ gap: '0.45rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSimDay(1)
                  setSimTime('08:00:00')
                }}
              >
                1/28 · 08:00
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSimDay(8)
                  setSimTime('12:30')
                }}
              >
                8/28 · 12:30
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSimDay(15)
                  setSimTime('18:00')
                }}
              >
                15/28 · 18:00
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSimDay(22)
                  setSimTime('07:00')
                }}
              >
                22/28 · 07:00
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="stack fade-in">
      <header className="stack-sm">
        <div className="page-eyebrow-row">
          <p className="eyebrow">Central do participante</p>
          <PageCoinsChip />
        </div>
        <h1 className="display h1">Mais</h1>
        <p className="muted">{brand.coach} · {brand.handle}</p>
      </header>

      <div className="stack-sm">
        <Link to={path('/funcionalidades')} className="check-row">
          <span className="check-box">▦</span>
          <span>
            <strong>Funcionalidades</strong>
            <br />
            <span className="muted">Mapa completo do sistema</span>
          </span>
          <span className="muted">abrir</span>
        </Link>
        <Link to={path('/progresso')} className="check-row">
          <span className="check-box">↗</span>
          <span><strong>Progresso e fotos</strong><br /><span className="muted">Peso e registros semanais</span></span>
          <span className="muted">abrir</span>
        </Link>
        <button
          type="button"
          className="check-row"
          onClick={() => {
            if (!confirm('Sair e excluir todos os dados salvos neste dispositivo?')) return
            dispatch({ type: 'RESET' })
            localStorage.removeItem('zero-ao-topo-mvp-v1')
            window.location.href = publicUrl(path('/onboarding'))
          }}
        >
          <span className="check-box">⎋</span>
          <span>
            <strong>Sair</strong>
            <br />
            <span className="muted">Exclui todos os dados deste dispositivo</span>
          </span>
          <span className="muted">sair</span>
        </button>
        <button type="button" className="check-row" onClick={() => setTab('shop')}>
          <span className="check-box">🛒</span>
          <span><strong>Lista de compras</strong><br /><span className="muted">4 semanas com checklist</span></span>
          <span className="muted">abrir</span>
        </button>
        <button type="button" className="check-row" onClick={() => setTab('rules')}>
          <span className="check-box">✦</span>
          <span><strong>10 regras de ouro</strong><br /><span className="muted">Orientações dos 28 dias</span></span>
          <span className="muted">abrir</span>
        </button>
        <button type="button" className="check-row" onClick={() => setTab('water')}>
          <span className="check-box">💧</span>
          <span><strong>Hidratação e bebidas</strong><br /><span className="muted">Metas e opções liberadas</span></span>
          <span className="muted">abrir</span>
        </button>
        <button type="button" className="check-row" onClick={() => setTab('dev')}>
          <span className="check-box">{ }</span>
          <span>
            <strong>Desenvolvimento</strong>
            <br />
            <span className="muted">
              {devMode ? `Ativo · dia ${devDay}/28 · ${devTimeLive}` : 'Simular participante em 28 dias'}
            </span>
          </span>
          <span className="muted">{devMode ? 'DEV' : 'abrir'}</span>
        </button>
      </div>

      <section className="card stack-sm">
        <p className="eyebrow">Conta neste dispositivo</p>
        <p style={{ margin: 0 }}><strong>{state.profile.name || 'Participante'}</strong></p>
        <p className="muted" style={{ margin: 0 }}>
          Início: {state.startDate} · {state.profile.weight} kg · objetivo −{state.profile.goalKg} kg
          {devMode ? ' · modo DEV' : ''}
        </p>
      </section>
    </div>
  )
}
