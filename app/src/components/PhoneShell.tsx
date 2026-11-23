import { Outlet } from 'react-router-dom'
import { brand } from '../data/content'
import { DevTimeControlCard } from './DevTimeControlCard'

export function PhoneShell() {
  return (
    <div className="phone-stage">
      <div className="phone-stage-reveal">
        <div className="phone-stage-copy">
          <p className="eyebrow">Versão celular</p>
          <h1 className="display h2" style={{ fontSize: '2.4rem' }}>
            {brand.name}
          </h1>
          <p className="muted">Simulação em formato de smartphone para apresentação no desktop.</p>
          <p className="stat-chip orange">/celular</p>
        </div>

        <div className="phone-device" aria-label="Simulador de celular">
          <div className="phone-speaker" />
          <div className="phone-screen">
            <div className="phone-status">
              <span>09:41</span>
              <span className="phone-pill" />
              <span>100%</span>
            </div>
            <div className="phone-app">
              <Outlet />
            </div>
          </div>
          <div className="phone-home" />
        </div>

        <DevTimeControlCard />
      </div>
    </div>
  )
}