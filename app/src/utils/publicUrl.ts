/** Caminho absoluto para arquivos em /public (respeita `base` do Vite, ex. GitHub Pages). */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL
  const normalized = path.startsWith('/') ? path.slice(1) : path
  return `${base}${normalized}`
}

/** Basename do React Router derivado do `base` do Vite. */
export function routerBasename(): string | undefined {
  const base = import.meta.env.BASE_URL
  if (!base || base === '/') return undefined
  return base.endsWith('/') ? base.slice(0, -1) : base
}