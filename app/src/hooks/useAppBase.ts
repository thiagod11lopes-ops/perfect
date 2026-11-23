import { useLocation } from 'react-router-dom'

/** Prefixo de rota: '' no desktop, '/celular' no simulador. */
export function useAppBase() {
  const { pathname } = useLocation()
  const base = pathname.startsWith('/celular') ? '/celular' : ''
  const path = (to: string) => {
    const clean = to.startsWith('/') ? to : `/${to}`
    if (!base) return clean === '/' ? '/' : clean
    if (clean === '/') return base
    return `${base}${clean}`
  }
  return { base, path, isMobileSim: base === '/celular' }
}
