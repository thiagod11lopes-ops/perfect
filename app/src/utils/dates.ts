import { phases } from '../data/content'
import { getWorkoutLetterForDate } from '../data/workouts'

export function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function diffDays(from: Date, to: Date) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  return Math.floor((b - a) / 86400000)
}

export function challengeDayNumber(startDate: string, date = new Date()) {
  const day = diffDays(parseISODate(startDate), date) + 1
  return Math.min(28, Math.max(1, day))
}

/** Baralho do dia no modo DEV: segue `devDay`, sem recuar a noite anterior. */
export function devSimulatedChallengeDateKey(startDate: string, devDay: number): string {
  const day = Math.min(28, Math.max(1, devDay))
  return toISODate(addDays(parseISODate(startDate), day - 1))
}

export function challengeWeek(startDate: string, date = new Date()): 1 | 2 | 3 | 4 {
  const day = challengeDayNumber(startDate, date)
  if (day <= 7) return 1
  if (day <= 14) return 2
  if (day <= 21) return 3
  return 4
}

export function phaseForWeek(week: 1 | 2 | 3 | 4) {
  return phases.find((p) => p.week === week)!
}

export function weekdayLabel(date: Date) {
  return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][date.getDay()]
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function todayContext(startDate: string, date = new Date()) {
  const week = challengeWeek(startDate, date)
  const day = challengeDayNumber(startDate, date)
  const letter = getWorkoutLetterForDate(date)
  const phase = phaseForWeek(week)
  const isRest = letter === null
  const ended = diffDays(parseISODate(startDate), date) >= 28
  return { week, day, letter, phase, isRest, ended, dateKey: toISODate(date) }
}

export function formatClockTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatClockTimeWithSeconds(date: Date) {
  return `${formatClockTime(date)}:${String(date.getSeconds()).padStart(2, '0')}`
}

/** Normaliza âncora de horário DEV para HH:MM:SS. */
export function normalizeClockTimeWithSeconds(raw: string) {
  const parts = (raw || '08:00:00').trim().split(':')
  const hh = String(Math.min(23, Math.max(0, Number(parts[0]) || 0))).padStart(2, '0')
  const mm = String(Math.min(59, Math.max(0, Number(parts[1]) || 0))).padStart(2, '0')
  const ss = String(Math.min(59, Math.max(0, Number(parts[2]) || 0))).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/** Relógio do app: real ou simulado no modo desenvolvimento (corre a partir da âncora). */
export function resolveAppDate(opts: {
  startDate: string
  devMode?: boolean
  devDay?: number
  devTime?: string
  devClockAnchoredAt?: number
  devClockPaused?: boolean
}) {
  if (!opts.devMode) return new Date()
  const day = Math.min(28, Math.max(1, opts.devDay ?? 1))
  const date = addDays(parseISODate(opts.startDate), day - 1)
  const parts = (opts.devTime || '08:00').split(':').map(Number)
  const hh = parts[0]
  const mm = parts[1]
  const ss = parts[2]
  date.setHours(
    Number.isFinite(hh) ? hh : 0,
    Number.isFinite(mm) ? mm : 0,
    Number.isFinite(ss) ? ss : 0,
    0,
  )
  if (opts.devClockPaused) return date
  const anchoredAt = opts.devClockAnchoredAt ?? Date.now()
  const elapsed = Math.max(0, Date.now() - anchoredAt)
  date.setTime(date.getTime() + elapsed)
  return date
}

export function resolveAppMinutes(opts: {
  startDate: string
  devMode?: boolean
  devDay?: number
  devTime?: string
  devClockAnchoredAt?: number
  devClockPaused?: boolean
}) {
  if (!opts.devMode) {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  }
  const date = resolveAppDate(opts)
  return date.getHours() * 60 + date.getMinutes()
}

export function sundayKeys(startDate: string) {
  const start = parseISODate(startDate)
  const keys: string[] = []
  for (let i = 0; i < 28; i++) {
    const d = addDays(start, i)
    if (d.getDay() === 0) keys.push(toISODate(d))
  }
  // also include day 0 photo if start isn't sunday - initial photo
  keys.unshift(toISODate(start))
  return [...new Set(keys)]
}
