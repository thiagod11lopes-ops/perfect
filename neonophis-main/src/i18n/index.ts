// i18n — zero-dependency string table. Locales are auto-discovered JSON files
// in ./locales (same import.meta.glob pattern as audio/musicConfig.ts): drop a
// new `xx.json` next to en/pt.json and it becomes selectable with no code
// change. `t()` is the only call site; the no-params path returns the cached
// string reference straight from the parsed JSON (allocation-free — it runs in
// the per-frame canvas render, §18 of CLAUDE.md).

export interface LocaleMeta {
  /** Human name shown if ever needed (e.g. "Português"). */
  name: string;
  /** Short code for the toggle pill ("PT" / "EN"). */
  short: string;
  /** Which mini-flag to draw — see ui/langToggle.ts. */
  flag: string;
  /** Value written to <html lang="…">. */
  htmlLang: string;
}

export type Lang = string;

interface Locale {
  meta: LocaleMeta;
  strings: Record<string, string>;
}

// Preferred display order for the toggle; unknown codes are appended alpha.
const PREFERRED: Lang[] = ['pt', 'en'];
const STORAGE_KEY = 'neonophis:lang';

const raw = import.meta.glob<Record<string, unknown>>('./locales/*.json', {
  eager: true,
  import: 'default',
});

const locales: Record<Lang, Locale> = {};
for (const [path, mod] of Object.entries(raw)) {
  const code = path.match(/\/([^/.]+)\.json$/)?.[1];
  if (!code) continue;
  const { _meta, ...restUnknown } = mod as { _meta?: Partial<LocaleMeta> };
  // Every remaining JSON value is a string by construction (only _meta is an
  // object, and it was destructured out above).
  const strings = restUnknown as unknown as Record<string, string>;
  locales[code] = {
    meta: {
      name: _meta?.name ?? code.toUpperCase(),
      short: _meta?.short ?? code.toUpperCase(),
      flag: _meta?.flag ?? code,
      htmlLang: _meta?.htmlLang ?? code,
    },
    strings,
  };
}

const ALL: Lang[] = Object.keys(locales).sort((a, b) => {
  const ia = PREFERRED.indexOf(a);
  const ib = PREFERRED.indexOf(b);
  if (ia !== -1 || ib !== -1) {
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  }
  return a.localeCompare(b);
});

const FALLBACK: Lang = locales['en'] ? 'en' : (ALL[0] ?? 'en');

function detectInitial(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && locales[saved]) return saved;
  } catch { /* private mode — ignore */ }
  const nav = (typeof navigator !== 'undefined' && navigator.language || '').toLowerCase();
  if (nav.startsWith('pt') && locales['pt']) return 'pt';
  if (locales['en']) return 'en';
  return ALL[0] ?? FALLBACK;
}

let current: Lang = detectInitial();

const subscribers = new Set<() => void>();

function applyDocument(): void {
  if (typeof document === 'undefined') return;
  const m = locales[current]?.meta;
  if (!m) return;
  document.documentElement.lang = m.htmlLang;
  const title = t('title');
  if (title) document.title = title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', t('meta.description'));
}

/** All selectable language codes, in toggle display order. */
export function availableLangs(): Lang[] {
  return ALL;
}

export function getLang(): Lang {
  return current;
}

export function langInfo(lang: Lang): LocaleMeta {
  return (locales[lang] ?? locales[FALLBACK])!.meta;
}

export function setLang(lang: Lang): void {
  if (!locales[lang] || lang === current) return;
  current = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  applyDocument();
  for (const cb of subscribers) cb();
}

/** Cycle to the next available language (toggle convenience). */
export function nextLang(): Lang {
  const i = ALL.indexOf(current);
  return ALL[(i + 1) % ALL.length] ?? current;
}

/** Subscribe to language changes (DOM strings need a manual refresh). Canvas
 *  text re-reads via t() every frame, so it needs no subscription. */
export function onLangChange(cb: () => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

const PARAM_RE = /\{(\w+)\}/g;

export function t(key: string, params?: Record<string, string | number>): string {
  const s =
    locales[current]?.strings[key] ??
    locales[FALLBACK]?.strings[key] ??
    key;
  if (!params) return s;
  return s.replace(PARAM_RE, (_, k: string) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}

// Reflect the detected language on the document at module load.
applyDocument();
