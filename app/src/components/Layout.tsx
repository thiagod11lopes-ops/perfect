import { NavLink, Outlet } from 'react-router-dom'
import { WaterMissionHost } from './WaterMissionHost'
import { WeekUnlockHost } from './WeekUnlockHost'
import { brand } from '../data/content'
import { useApp } from '../store/AppContext'
import { publicUrl } from '../utils/publicUrl'

const links = [
  { to: '/', label: 'Hoje', ico: '◉' },
  { to: '/dieta', label: 'Dieta', ico: '🍽' },
  { to: '/treino', label: 'Treino', ico: '🏋' },
  { to: '/missao', label: 'Missão', ico: '★' },
  { to: '/mais', label: 'Mais', ico: '☰' },
]

const STORAGE_KEY = 'zero-ao-topo-mvp-v1'

export function Layout() {
  const { dispatch } = useApp()

  const handleExit = () => {
    if (!confirm('Sair e excluir todos os dados salvos neste dispositivo?')) return
    dispatch({ type: 'RESET' })
    localStorage.removeItem(STORAGE_KEY)
    window.location.href = publicUrl('onboarding')
  }

  return (
    <div className="app-shell with-nav">
      <aside className="sidebar">
        <div className="brand-lockup brand-lockup-text">
          <small>{brand.coach}</small>
        </div>
        <nav className="side-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}>
              <span className="nav-ico">{l.ico}</span>
              {l.label}
            </NavLink>
          ))}
          <NavLink to="/progresso">
            <span className="nav-ico">↗</span>
            Progresso
          </NavLink>
          <NavLink to="/funcionalidades">
            <span className="nav-ico">▦</span>
            Funções
          </NavLink>
          <button type="button" className="btn-exit-nav" onClick={handleExit}>
            <span className="nav-ico">⎋</span>
            Sair
          </button>
        </nav>
      </aside>

      <div className="app-content">
        <main className="main">
          <Outlet />
        </main>
      </div>
      <WaterMissionHost />
      <WeekUnlockHost />

      <nav className="bottom-nav" aria-label="Navegação principal">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}>
            <span className="nav-ico">{l.ico}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
