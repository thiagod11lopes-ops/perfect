import type { WeeklyRoutine } from './routine'

export type {
  DailyRoutine,
  WeeklyRoutine,
  WeekdayIndex,
  RoutineSlot,
  RoutineIntervalSlot,
  RoutinePointSlot,
  TimeInterval,
} from './routine'

export type MealKey = 'cafe' | 'almoco' | 'lanche' | 'jantar'
export type WorkoutLetter = 'A' | 'B' | 'C'
export type Sex = 'F' | 'M' | 'Outro'

export interface FoodItem {
  name: string
  amount: string
  note?: string
}

export interface MealPlan {
  key: MealKey
  time: string
  title: string
  items: FoodItem[]
  prep?: string
}

export interface WeekDiet {
  week: 1 | 2 | 3 | 4
  phase: string
  kcal: number
  meals: MealPlan[]
}

export type LoadUnit = 'kg' | 'placas'

export interface WorkoutBlock {
  id: number
  exercise: string
  sets: string
  /** Carga sugerida / registrada (número ou texto curto). */
  load?: string
  /** Unidade da carga. */
  loadUnit?: LoadUnit
  activeCardio: string
  after: string
}

export interface WorkoutLoadEntry {
  value: string
  unit: LoadUnit
}

export interface WeekWorkout {
  week: 1 | 2 | 3 | 4
  phase: string
  letter: WorkoutLetter
  days: string
  blocks: WorkoutBlock[]
}

export interface MissionTask {
  label: string
  detail: string
}

export interface WeekMission {
  week: 1 | 2 | 3 | 4
  title: string
  theme: string
  summary: string
  tasks: MissionTask[]
  validation: string
  records: number
}

export interface ShoppingItem {
  id: string
  name: string
  weeklyTotal: string
  buy: string
}

export interface WeekShopping {
  week: 1 | 2 | 3 | 4
  phase: string
  kcal: number
  costUsed: string
  costBuy: string
  items: ShoppingItem[]
}

export interface SubstitutionRow {
  original: string
  option1: string
  option2: string
}

export interface WeekSubstitutions {
  week: 1 | 2 | 3 | 4
  meals: Record<MealKey, SubstitutionRow[]>
}

export interface Profile {
  name: string
  birthDate: string
  age: string
  sex: Sex | ''
  weight: string
  height: string
  goalKg: string
  health: string
  meds: string
  allergies: string
}

export interface DayLog {
  meals: Partial<Record<MealKey, boolean>>
  workoutDone: boolean
  waterMl: number
  missionChecks: boolean[]
}

export type DayCardStatus = 'locked' | 'active' | 'completed' | 'expired' | 'analyzing'
export type DayBand = 'manha' | 'dia' | 'tarde' | 'noite'

export type CardProofMode = 'photo' | 'confirm' | 'game'

export interface DayCard {
  challengeId: string
  title: string
  description: string
  proofHint: string
  kind: string
  band: DayBand
  unlockHour: number
  /** Minutos desde 00:00 — início da janela. */
  unlockMinutes: number
  /** Início/fim da janela ativa (minutos desde 00:00). */
  windowStartMinutes: number
  windowEndMinutes: number
  /** interval = janela da rotina; tolerance = horário fixo + 10 min. */
  windowKind: 'interval' | 'tolerance'
  flexible: boolean
  /** photo = câmera; confirm = só botão (acordar / sono). */
  proofMode: CardProofMode
  /** Texto do botão quando proofMode = confirm. */
  confirmLabel?: string
  coins: number
  durationMin: number
  /** Volume de água desta carta (ml), quando kind = agua / missão água. */
  waterMl?: number
  status: DayCardStatus
  /** timestamp ms — prazo do card ativo */
  deadlineAt: number | null
  photoDataUrl?: string
  aiMessage?: string
  coinsAwarded: number
  /** DEV/replay: alinhado a AppState.devGameCardReplayEpoch ao concluir ou reiniciar. */
  gamePlayEpoch?: number
  /** Líquido da roleta (±moedas) — usado para desfazer saldo ao reiniciar a carta. */
  gameSettleNet?: number
}

export interface DayQueue {
  dateKey: string
  cards: DayCard[]
}

export interface AppState {
  onboardingComplete: boolean
  acceptedRules: boolean
  startDate: string
  profile: Profile
  /** Rotina por dia da semana (seg–dom) usada para liberar as cartas. */
  routine: WeeklyRoutine
  weightFinal: string
  coins: number
  /**
   * Versão da economia de moedas (v2 = valores ×10).
   * Usado na migração do localStorage para não multiplicar de novo.
   */
  coinEconomyVersion: number
  /** Modo desenvolvimento: simula participante nos 28 dias. */
  devMode: boolean
  /** Dia do desafio (1–28) no modo desenvolvimento. */
  devDay: number
  /** Horário-base simulado HH:MM:SS no modo desenvolvimento (âncora). */
  devTime: string
  /** Timestamp real em que o horário-base foi fixado — o relógio corre a partir daí. */
  devClockAnchoredAt: number
  /** Se true, o relógio simulado fica congelado (pause). */
  devClockPaused: boolean
  /**
   * Incrementado ao mudar dia/hora no DEV; força replay da carta especial
   * e remonta a roleta no modal.
   */
  devGameCardReplayEpoch: number
  /** Colunas da grade Neonophis no embed PERFECT (modo dev). */
  devNeonophisGridW: number
  /** Linhas da grade Neonophis no embed PERFECT (modo dev). */
  devNeonophisGridH: number
  /** Tamanho em px de cada célula da grade Neonophis no embed (modo dev / celular). */
  devNeonophisCellPx: number
  /** baralho do dia por faixas / horário */
  dayQueues: Record<string, DayQueue>
  /** Cartas-estrela já reveladas (animação feita) por dateKey do baralho. */
  starCardsRevealed: Record<string, boolean>
  /**
   * DEV: dia do desafio já teve sorteio de rotina ou conclusão — ao avançar de dia
   * não zera esse baralho; dias só visitados ficam livres para abrir às 05:00.
   */
  devDayQueueSealed: Record<string, boolean>
  daily: Record<string, DayLog>
  shopping: Record<string, Record<string, boolean>>
  photoNotes: Record<string, string>
  /** Carga registrada por bloco de treino (chave: week-letter-blockId). */
  workoutLoads: Record<string, WorkoutLoadEntry>
  /** dateKey do dia em que o usuário escolheu recomeçar semana 1; aplica no dia seguinte. */
  pendingWeek1RestartAfterDateKey: string | null
}
