import { diets as defaultDiets } from './diets'
import type { WeekDiet, WeekWorkout, WorkoutLetter } from './types'
import { workouts as defaultWorkouts } from './workouts'
import { deleteAdminVideoBlob } from './adminVideoDb'

export const ADMIN_STORAGE_KEY = 'zero-ao-topo-admin-v1'

export type AdminVideoSource = {
  /** ID do YouTube, se houver. */
  youtubeId?: string
  /** URL direta (mp4, CDN, etc.). */
  url?: string
  /** Chave do blob enviado no IndexedDB. */
  blobKey?: string
  fileName?: string
}

export type AdminInstaMissionState = {
  /** Handles Instagram detectados / cadastrados (sem @). */
  handles: string[]
  lastScanAt?: string
  lastRawText?: string
}

export type AdminContentState = {
  diets: WeekDiet[]
  workouts: WeekWorkout[]
  videos: Record<string, AdminVideoSource>
  instaMission: AdminInstaMissionState
}

const listeners = new Set<() => void>()

function cloneDiets(list: WeekDiet[]): WeekDiet[] {
  return list.map((d) => ({
    ...d,
    meals: d.meals.map((m) => ({
      ...m,
      items: m.items.map((i) => ({ ...i })),
    })),
  }))
}

function cloneWorkouts(list: WeekWorkout[]): WeekWorkout[] {
  return list.map((w) => ({
    ...w,
    blocks: w.blocks.map((b) => ({ ...b })),
  }))
}

function normalizeHandles(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    if (typeof item !== 'string') continue
    const h = item.trim().replace(/^@+/, '').toLowerCase()
    if (!h || seen.has(h)) continue
    seen.add(h)
    out.push(h)
  }
  return out
}

function defaultInstaMission(): AdminInstaMissionState {
  return { handles: [] }
}

function defaultState(): AdminContentState {
  return {
    diets: cloneDiets(defaultDiets),
    workouts: cloneWorkouts(defaultWorkouts),
    videos: {},
    instaMission: defaultInstaMission(),
  }
}

function loadRaw(): AdminContentState {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as Partial<AdminContentState>
    const base = defaultState()
    const insta =
      parsed.instaMission && typeof parsed.instaMission === 'object'
        ? parsed.instaMission
        : null
    return {
      diets:
        Array.isArray(parsed.diets) && parsed.diets.length
          ? (parsed.diets as WeekDiet[])
          : base.diets,
      workouts:
        Array.isArray(parsed.workouts) && parsed.workouts.length
          ? (parsed.workouts as WeekWorkout[])
          : base.workouts,
      videos:
        parsed.videos && typeof parsed.videos === 'object' ? parsed.videos : {},
      instaMission: {
        handles: normalizeHandles(insta?.handles),
        lastScanAt: typeof insta?.lastScanAt === 'string' ? insta.lastScanAt : undefined,
        lastRawText: typeof insta?.lastRawText === 'string' ? insta.lastRawText : undefined,
      },
    }
  } catch {
    return defaultState()
  }
}

let cache: AdminContentState = loadRaw()

function persist() {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(cache))
  listeners.forEach((fn) => fn())
}

export function subscribeAdminContent(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getAdminContent(): AdminContentState {
  return cache
}

export function getAdminDiet(week: 1 | 2 | 3 | 4): WeekDiet {
  return cache.diets.find((d) => d.week === week) ?? cloneDiets(defaultDiets).find((d) => d.week === week)!
}

/** Dieta usada pelo app (painel /adm tem prioridade sobre o padrão). */
export function getEffectiveDiet(week: 1 | 2 | 3 | 4): WeekDiet {
  return getAdminDiet(week)
}

export function getAdminWorkout(week: 1 | 2 | 3 | 4, letter: WorkoutLetter): WeekWorkout {
  return (
    cache.workouts.find((w) => w.week === week && w.letter === letter) ??
    cloneWorkouts(defaultWorkouts).find((w) => w.week === week && w.letter === letter)!
  )
}

/** Treino usado pelo app (painel /adm tem prioridade sobre o padrão). */
export function getEffectiveWorkout(week: 1 | 2 | 3 | 4, letter: WorkoutLetter): WeekWorkout {
  return getAdminWorkout(week, letter)
}

export function getAdminVideo(exercise: string): AdminVideoSource | null {
  return cache.videos[exercise] ?? null
}

export function setAdminDiets(next: WeekDiet[]) {
  cache = { ...cache, diets: cloneDiets(next) }
  persist()
}

export function updateAdminDiet(week: 1 | 2 | 3 | 4, patch: WeekDiet) {
  cache = {
    ...cache,
    diets: cache.diets.map((d) => (d.week === week ? cloneDiets([patch])[0] : d)),
  }
  persist()
}

export function resetAdminDiets() {
  cache = { ...cache, diets: cloneDiets(defaultDiets) }
  persist()
}

export function updateAdminWorkout(week: 1 | 2 | 3 | 4, letter: WorkoutLetter, patch: WeekWorkout) {
  const next = cloneWorkouts([patch])[0]
  const exists = cache.workouts.some((w) => w.week === week && w.letter === letter)
  cache = {
    ...cache,
    workouts: exists
      ? cache.workouts.map((w) => (w.week === week && w.letter === letter ? next : w))
      : [...cache.workouts, next],
  }
  persist()
}

export function resetAdminWorkouts() {
  cache = { ...cache, workouts: cloneWorkouts(defaultWorkouts) }
  persist()
}

export function setAdminVideo(exercise: string, source: AdminVideoSource | null) {
  const videos = { ...cache.videos }
  if (!source || (!source.youtubeId && !source.url && !source.blobKey)) {
    delete videos[exercise]
  } else {
    videos[exercise] = source
  }
  cache = { ...cache, videos }
  persist()
}

export async function clearAdminVideo(exercise: string) {
  const prev = cache.videos[exercise]
  if (prev?.blobKey) {
    try {
      await deleteAdminVideoBlob(prev.blobKey)
    } catch {
      /* ignore */
    }
  }
  setAdminVideo(exercise, null)
}

export function listTrainingExercises(): string[] {
  const set = new Set<string>()
  for (const w of cache.workouts) {
    for (const b of w.blocks) set.add(b.exercise)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** Extrai ID do YouTube a partir de URL ou ID puro. */
export function parseYoutubeId(input: string): string | null {
  const value = input.trim()
  if (!value) return null
  if (/^[\w-]{6,20}$/.test(value) && !value.includes('.')) return value
  const m =
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,20})/i.exec(
      value,
    )
  return m?.[1] ?? null
}

export function getAdminInstaMission(): AdminInstaMissionState {
  return cache.instaMission
}

export function setAdminInstaHandles(handles: string[], meta?: { rawText?: string }) {
  cache = {
    ...cache,
    instaMission: {
      handles: normalizeHandles(handles),
      lastScanAt: new Date().toISOString(),
      lastRawText: meta?.rawText ?? cache.instaMission.lastRawText,
    },
  }
  persist()
}

export function addAdminInstaHandle(handle: string) {
  const h = handle.trim().replace(/^@+/, '').toLowerCase()
  if (!h) return
  if (cache.instaMission.handles.includes(h)) return
  setAdminInstaHandles([...cache.instaMission.handles, h])
}

export function removeAdminInstaHandle(handle: string) {
  const h = handle.trim().replace(/^@+/, '').toLowerCase()
  setAdminInstaHandles(cache.instaMission.handles.filter((x) => x !== h), {
    rawText: cache.instaMission.lastRawText,
  })
}

export function clearAdminInstaHandles() {
  cache = {
    ...cache,
    instaMission: defaultInstaMission(),
  }
  persist()
}

export function reloadAdminContentFromStorage() {
  cache = loadRaw()
  listeners.forEach((fn) => fn())
}
