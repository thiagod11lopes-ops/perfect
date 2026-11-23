import { NavLink, Outlet } from 'react-router-dom'
import { useAppClock } from '../hooks/useAppClock'
import { WaterMissionHost } from './WaterMissionHost'
import { WeekUnlockHost } from './WeekUnlockHost'

const BASE = '/celular'

/** Dia do desafio (1–28) — mesmo índice do app. */
function HojeTabDayMark({ day }: { day: number }) {
  return (
    <span className="nav-ico nav-ico-day" aria-hidden>
      {day}/28
    </span>
  )
}

const links = [
  { to: `${BASE}/treino`, label: 'Treino', ico: '🏋' },
  { to: `${BASE}/dieta`, label: 'Dieta', ico: '🍽' },
  { to: BASE, label: 'Hoje', end: true as const },
  { to: `${BASE}/missao`, label: 'Missão', ico: '★' },
  { to: `${BASE}/mais`, label: 'Mais', ico: '☰' },
]

export function MobileLayout() {
  const { ctx } = useAppClock()

  return (
    <div className="app-shell with-nav mobile-only">
      <main className="main mobile-main">
        <Outlet />
      </main>
      <WaterMissionHost />
      <WeekUnlockHost />

      <nav className="bottom-nav mobile-tabbar" aria-label="Navegação celular">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={'end' in l ? l.end : undefined}>
            {l.label === 'Hoje' ? (
              <HojeTabDayMark day={ctx.day} />
            ) : (
              <span className="nav-ico">{'ico' in l ? l.ico : ''}</span>
            )}
            <span className="nav-label">{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
