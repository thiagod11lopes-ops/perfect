import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { brand } from '../data/content'
import { features, type FeatureModule } from '../data/features'
import { useAppBase } from '../hooks/useAppBase'
import { publicUrl } from '../utils/publicUrl'

const modules: Array<'Todas' | FeatureModule> = [
  'Todas',
  'IA Nutricional',
  'Dieta',
  'Treino',
  'Missões',
  'Progresso',
  'Hidratação',
  'Compras',
  'Engajamento',
  'Coach',
  'Plataforma',
]

export function Features() {
  const { path } = useAppBase()
  const [module, setModule] = useState<(typeof modules)[number]>('Todas')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return features.filter((f) => {
      const byModule = module === 'Todas' || f.module === module
      const byQuery =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q)
      return byModule && byQuery
    })
  }, [module, query])

  return (
    <div className="features-page">
      <div className="features-bg" aria-hidden />

      <header className="features-top">
        <Link to={path('/')} className="features-brand">
          <img src={publicUrl('/logo.png?v=do-zero-cinza-solido')} alt={brand.name} />
        </Link>
        <div className="features-top-meta">
          <span className="features-live-dot" />
          Sistema ativo · {features.length} funções
        </div>
      </header>

      <section className="features-hero">
        <p className="features-kicker">Mapa operacional</p>
        <h1>Funcionalidades</h1>
        <p className="features-lead">
          Visão completa do ecossistema Zero ao Topo — dieta, treino, missões, progresso e
          inteligência nutricional em uma única superfície.
        </p>
      </section>

      <div className="features-toolbar">
        <label className="features-search">
          <span className="sr-only">Buscar</span>
          <input
            type="search"
            placeholder="Buscar função..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="features-filters" role="tablist" aria-label="Módulos">
          {modules.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={module === m}
              className={module === m ? 'is-active' : undefined}
              onClick={() => setModule(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="features-table-wrap">
        <table className="features-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Função</th>
              <th scope="col">Módulo</th>
              <th scope="col">O que faz</th>
              <th scope="col">Impacto</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f, i) => (
              <tr key={f.id} className={i === 0 && module === 'Todas' && !query ? 'is-hero-row' : undefined}>
                <td className="col-id">
                  <span>{f.id}</span>
                </td>
                <td className="col-name">
                  <strong>{f.name}</strong>
                  {i === 0 && module === 'Todas' && !query ? (
                    <em className="features-flag">Destaque</em>
                  ) : null}
                </td>
                <td className="col-module">
                  <span className={`mod-chip mod-${slug(f.module)}`}>{f.module}</span>
                </td>
                <td className="col-desc">{f.description}</td>
                <td className="col-impact">
                  <span className={`impact impact-${f.impact.toLowerCase()}`}>{f.impact}</span>
                </td>
                <td className="col-status">
                  <span className="status-live">
                    <span className="pulse" />
                    Ativa
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="features-empty">Nenhuma função encontrada para esse filtro.</p>
        ) : null}
      </div>
    </div>
  )
}

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
}
