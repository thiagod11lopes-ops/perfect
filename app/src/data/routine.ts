/** Horários pontuais (refeições / acordar). */
export type RoutinePointSlot =
  | 'wake'
  | 'cafe'
  | 'colacao'
  | 'almoco'
  | 'lanche'
  | 'jantar'
  | 'ceia'

/** Blocos com intervalo início–fim. */
export type RoutineIntervalSlot =
  | 'treino'
  | 'sleep'
  | 'trabalho'
  | 'descanso'
  | 'lazer'
  | 'estudo'

export type RoutineSlot = RoutinePointSlot | RoutineIntervalSlot

export interface TimeInterval {
  start: string
  end: string
}

export type DailyRoutine = Record<RoutinePointSlot, string> &
  Record<RoutineIntervalSlot, TimeInterval>

/** Índice JS: 0=Dom … 6=Sáb (igual a Date.getDay()). */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Rotina por dia da semana. */
export type WeeklyRoutine = Record<WeekdayIndex, DailyRoutine>

/** Ordem de exibição: segunda → domingo. */
export const WEEKDAY_ORDER: WeekdayIndex[] = [1, 2, 3, 4, 5, 6, 0]

export const WEEKDAY_META: Record<WeekdayIndex, { short: string; long: string }> = {
  0: { short: 'Dom', long: 'Domingo' },
  1: { short: 'Seg', long: 'Segunda-feira' },
  2: { short: 'Ter', long: 'Terça-feira' },
  3: { short: 'Qua', long: 'Quarta-feira' },
  4: { short: 'Qui', long: 'Quinta-feira' },
  5: { short: 'Sex', long: 'Sexta-feira' },
  6: { short: 'Sáb', long: 'Sábado' },
}

export const WEEKDAY_INDICES: WeekdayIndex[] = [0, 1, 2, 3, 4, 5, 6]

export const pointFields: {
  key: RoutinePointSlot
  label: string
  section: 'refeicoes' | 'atividade' | 'agenda'
}[] = [
  { key: 'wake', label: 'Acorda', section: 'refeicoes' },
  { key: 'cafe', label: 'Café da manhã', section: 'refeicoes' },
  { key: 'colacao', label: 'Colação', section: 'refeicoes' },
  { key: 'almoco', label: 'Almoço', section: 'refeicoes' },
  { key: 'lanche', label: 'Lanche', section: 'refeicoes' },
  { key: 'jantar', label: 'Janta', section: 'refeicoes' },
  { key: 'ceia', label: 'Ceia', section: 'refeicoes' },
]

export const intervalFields: {
  key: RoutineIntervalSlot
  label: string
  section: 'atividade' | 'agenda'
}[] = [
  { key: 'treino', label: 'Treino', section: 'atividade' },
  { key: 'sleep', label: 'Sono', section: 'atividade' },
  { key: 'trabalho', label: 'Trabalho', section: 'agenda' },
  { key: 'descanso', label: 'Descanso', section: 'agenda' },
  { key: 'lazer', label: 'Lazer', section: 'agenda' },
  { key: 'estudo', label: 'Estudo', section: 'agenda' },
]

/** @deprecated use pointFields + intervalFields */
export const routineFields = pointFields

export const emptyInterval = (): TimeInterval => ({ start: '', end: '' })

export const emptyRoutine: DailyRoutine = {
  wake: '',
  cafe: '',
  colacao: '',
  almoco: '',
  lanche: '',
  jantar: '',
  ceia: '',
  treino: emptyInterval(),
  sleep: emptyInterval(),
  trabalho: emptyInterval(),
  descanso: emptyInterval(),
  lazer: emptyInterval(),
  estudo: emptyInterval(),
}

/** Rotina padrão usada no exemplo / demo / migração. */
export const exampleRoutine: DailyRoutine = {
  wake: '06:00',
  cafe: '07:00',
  colacao: '10:00',
  almoco: '12:30',
  lanche: '16:00',
  jantar: '19:30',
  ceia: '21:30',
  treino: { start: '18:00', end: '19:00' },
  sleep: { start: '23:00', end: '06:00' },
  trabalho: { start: '08:00', end: '17:00' },
  descanso: { start: '13:00', end: '14:00' },
  lazer: { start: '21:00', end: '22:30' },
  estudo: { start: '20:00', end: '22:00' },
}

export function cloneDailyRoutine(routine: DailyRoutine): DailyRoutine {
  return {
    ...routine,
    treino: { ...routine.treino },
    sleep: { ...routine.sleep },
    trabalho: { ...routine.trabalho },
    descanso: { ...routine.descanso },
    lazer: { ...routine.lazer },
    estudo: { ...routine.estudo },
  }
}

export function emptyWeeklyRoutine(): WeeklyRoutine {
  return {
    0: cloneDailyRoutine(emptyRoutine),
    1: cloneDailyRoutine(emptyRoutine),
    2: cloneDailyRoutine(emptyRoutine),
    3: cloneDailyRoutine(emptyRoutine),
    4: cloneDailyRoutine(emptyRoutine),
    5: cloneDailyRoutine(emptyRoutine),
    6: cloneDailyRoutine(emptyRoutine),
  }
}

export function exampleWeeklyRoutine(): WeeklyRoutine {
  return {
    0: cloneDailyRoutine(exampleRoutine),
    1: cloneDailyRoutine(exampleRoutine),
    2: cloneDailyRoutine(exampleRoutine),
    3: cloneDailyRoutine(exampleRoutine),
    4: cloneDailyRoutine(exampleRoutine),
    5: cloneDailyRoutine(exampleRoutine),
    6: cloneDailyRoutine(exampleRoutine),
  }
}

export function asWeekdayIndex(value: number): WeekdayIndex {
  const n = ((value % 7) + 7) % 7
  return n as WeekdayIndex
}

export function getRoutineForWeekday(
  weekly: WeeklyRoutine | null | undefined,
  weekday: number,
): DailyRoutine {
  if (!weekly) return cloneDailyRoutine(exampleRoutine)
  const day = weekly[asWeekdayIndex(weekday)]
  return day ? cloneDailyRoutine(day) : cloneDailyRoutine(exampleRoutine)
}

/** Sono da noite anterior (para madrugada overnight). */
export function sleepForChallengeDateKey(weekly: WeeklyRoutine, now: Date): TimeInterval {
  const yesterday = asWeekdayIndex(now.getDay() - 1)
  return { ...weekly[yesterday].sleep }
}

export function copyRoutineToDays(
  weekly: WeeklyRoutine,
  from: WeekdayIndex,
  targets: WeekdayIndex[],
): WeeklyRoutine {
  const source = cloneDailyRoutine(weekly[from])
  const next = { ...weekly }
  for (const day of targets) {
    if (day === from) continue
    next[day] = cloneDailyRoutine(source)
  }
  return next
}

export function isWeekdayComplete(weekly: WeeklyRoutine, day: WeekdayIndex) {
  return isRoutineComplete(weekly[day])
}

export function isWeeklyRoutineComplete(weekly: WeeklyRoutine) {
  return WEEKDAY_INDICES.every((day) => isRoutineComplete(weekly[day]))
}

export function completedWeekdayCount(weekly: WeeklyRoutine) {
  return WEEKDAY_INDICES.filter((day) => isRoutineComplete(weekly[day])).length
}

export function parseTimeToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

export function minutesToHour(minutes: number) {
  return Math.floor((((minutes % 1440) + 1440) % 1440) / 60)
}

export function formatMinutes(minutes: number) {
  const safe = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(safe / 60)
  const m = safe % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatInterval(interval: TimeInterval) {
  if (!interval.start || !interval.end) return '—'
  return `${interval.start}–${interval.end}`
}

export function nowMinutes(from = Date.now()) {
  const d = new Date(from)
  return d.getHours() * 60 + d.getMinutes()
}

export function isIntervalSlot(key: RoutineSlot): key is RoutineIntervalSlot {
  return (
    key === 'treino' ||
    key === 'sleep' ||
    key === 'trabalho' ||
    key === 'descanso' ||
    key === 'lazer' ||
    key === 'estudo'
  )
}

export function isIntervalComplete(interval: TimeInterval) {
  return parseTimeToMinutes(interval.start) != null && parseTimeToMinutes(interval.end) != null
}

export function isRoutineComplete(routine: DailyRoutine) {
  const pointsOk = pointFields.every((f) => Boolean(parseTimeToMinutes(routine[f.key])))
  const intervalsOk = intervalFields.every((f) => isIntervalComplete(routine[f.key]))
  return pointsOk && intervalsOk
}

/** Tolerância (min) para cartas de horário pontual. */
export const POINT_TOLERANCE_MIN = 10

export function resolveRoutineMinutes(
  routine: DailyRoutine,
  key: RoutineSlot,
  edge: 'start' | 'end' = 'start',
): number | null {
  if (isIntervalSlot(key)) {
    const interval = routine[key]
    return parseTimeToMinutes(edge === 'end' ? interval.end : interval.start)
  }
  return parseTimeToMinutes(routine[key])
}

export function resolveRoutineWindow(
  routine: DailyRoutine,
  key: RoutineSlot,
  edge: 'start' | 'end' = 'start',
  offsetMin = 0,
): { start: number; end: number; kind: 'interval' | 'tolerance' } | null {
  // Intervalo completo só quando usa o início sem deslocamento (ex.: treino, sono)
  if (isIntervalSlot(key) && edge === 'start' && offsetMin === 0) {
    const start = parseTimeToMinutes(routine[key].start)
    const end = parseTimeToMinutes(routine[key].end)
    if (start == null || end == null) return null
    return { start, end, kind: 'interval' }
  }

  // Ponto fixo, borda "end", ou início com offset → janela de tolerância
  const base = resolveRoutineMinutes(routine, key, edge)
  if (base == null) return null
  const start = ((base + offsetMin) % 1440 + 1440) % 1440
  const end = (start + POINT_TOLERANCE_MIN) % 1440
  return { start, end, kind: 'tolerance' }
}

export function isInTimeWindow(nowMin: number, start: number, end: number) {
  if (end >= start) return nowMin >= start && nowMin <= end
  return nowMin >= start || nowMin <= end
}

/**
 * Janela no mesmo dia: após o fim = passado.
 * Janela overnight (ex. 23:00–06:00): entre o fim e o início (06:01–22:59)
 * é espera pela noite — NÃO é passado (senão a carta de sono fica “perdida” o dia todo).
 */
export function isPastTimeWindow(nowMin: number, start: number, end: number) {
  if (end >= start) return nowMin > end
  return false
}

/** Antes da abertura da janela (inclui tarde do dia em janelas overnight). */
export function isBeforeTimeWindow(nowMin: number, start: number, end: number) {
  if (end >= start) return nowMin < start
  return nowMin > end && nowMin < start
}

export function windowDurationMin(start: number, end: number) {
  if (end >= start) return Math.max(end - start, 1)
  return 1440 - start + end
}

export function bandFromMinutes(minutes: number): 'manha' | 'dia' | 'tarde' | 'noite' {
  const h = minutesToHour(minutes)
  if (h < 11) return 'manha'
  if (h < 15) return 'dia'
  if (h < 18) return 'tarde'
  return 'noite'
}

function looksLikeDailyRoutine(raw: Record<string, unknown>) {
  return (
    typeof raw.wake === 'string' ||
    typeof raw.cafe === 'string' ||
    (raw.treino != null && typeof raw.treino === 'object') ||
    typeof raw.treino === 'string' ||
    raw.sleep != null
  )
}

function looksLikeWeeklyRoutine(raw: Record<string, unknown>) {
  return WEEKDAY_INDICES.some((day) => {
    const entry = raw[String(day)]
    return entry != null && typeof entry === 'object'
  })
}

/** Migra rotina antiga (strings) para o formato com intervalos. */
export function migrateRoutine(raw: unknown): DailyRoutine {
  if (!raw || typeof raw !== 'object') return cloneDailyRoutine(emptyRoutine)
  const src = raw as Record<string, unknown>
  const next: DailyRoutine = cloneDailyRoutine(emptyRoutine)

  for (const f of pointFields) {
    if (typeof src[f.key] === 'string') next[f.key] = src[f.key] as string
  }

  const toInterval = (value: unknown, fallbackEndOffset = 60): TimeInterval => {
    if (value && typeof value === 'object' && 'start' in value) {
      const v = value as TimeInterval
      return { start: String(v.start ?? ''), end: String(v.end ?? '') }
    }
    if (typeof value === 'string' && value) {
      const startMin = parseTimeToMinutes(value)
      if (startMin == null) return { start: value, end: '' }
      const endMin = (startMin + fallbackEndOffset + 1440) % 1440
      return {
        start: value,
        end: formatMinutes(endMin),
      }
    }
    return emptyInterval()
  }

  next.treino = toInterval(src.treino, 60)
  next.trabalho = toInterval(src.trabalho, 480)
  next.descanso = toInterval(src.descanso ?? src.descansoLazer, 60)
  next.lazer = toInterval(src.lazer, 90)
  next.estudo = toInterval(src.estudo, 120)

  // Sono: intervalo novo, ou string antiga "23:00" → 23:00–06:00 (usa wake se existir)
  if (src.sleep && typeof src.sleep === 'object') {
    next.sleep = toInterval(src.sleep, 0)
  } else if (typeof src.sleep === 'string' && src.sleep) {
    const wake = typeof src.wake === 'string' && src.wake ? src.wake : '06:00'
    next.sleep = { start: src.sleep, end: wake }
  }

  if (!next.lazer.start && src.descansoLazer && !src.descanso) {
    if (!next.descanso.start) next.descanso = toInterval(src.descansoLazer, 60)
    else next.lazer = toInterval(src.descansoLazer, 90)
  }

  return next
}

/** Migra rotina única antiga → 7 dias, ou já semanal. */
export function migrateWeeklyRoutine(raw: unknown): WeeklyRoutine {
  if (!raw || typeof raw !== 'object') return emptyWeeklyRoutine()
  const src = raw as Record<string, unknown>

  if (looksLikeWeeklyRoutine(src)) {
    const next = emptyWeeklyRoutine()
    for (const day of WEEKDAY_INDICES) {
      const entry = src[String(day)]
      next[day] = migrateRoutine(entry ?? {})
    }
    return next
  }

  if (looksLikeDailyRoutine(src)) {
    const day = migrateRoutine(src)
    return {
      0: cloneDailyRoutine(day),
      1: cloneDailyRoutine(day),
      2: cloneDailyRoutine(day),
      3: cloneDailyRoutine(day),
      4: cloneDailyRoutine(day),
      5: cloneDailyRoutine(day),
      6: cloneDailyRoutine(day),
    }
  }

  return emptyWeeklyRoutine()
}
