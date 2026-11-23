import { getEffectiveDiet, getEffectiveWorkout } from './adminContent'
import { getMission } from './missions'
import {
  WATER_CARD_COUNT,
  formatWaterMl,
  parseWeightKg,
  waterMissionGoalMl,
  waterMlForChallenge,
} from './waterMission'
import {
  bandFromMinutes,
  exampleRoutine,
  formatMinutes,
  minutesToHour,
  parseTimeToMinutes,
  POINT_TOLERANCE_MIN,
  resolveRoutineMinutes,
  resolveRoutineWindow,
  windowDurationMin,
  type DailyRoutine,
  type RoutineSlot,
} from './routine'
import type { MealKey, WorkoutLetter } from './types'
import { addDays, toISODate } from '../utils/dates'

/**
 * Jejum noturno: inicia Seg/Qua/Sex à noite (antes do sono) e termina
 * Ter/Qui/Sáb de manhã após o café (6h / 8h / 12h).
 */
export const JEJUM_HOURS_BY_START_WEEKDAY: Partial<Record<number, number>> = {
  1: 6,
  3: 8,
  5: 12,
}
export const JEJUM_HOURS_BY_END_WEEKDAY: Partial<Record<number, number>> = {
  2: 6,
  4: 8,
  6: 12,
}
/** @deprecated Prefer JEJUM_HOURS_BY_START_WEEKDAY / END. */
export const JEJUM_HOURS_BY_WEEKDAY = JEJUM_HOURS_BY_START_WEEKDAY

export type ChallengeKind = 'dieta' | 'treino' | 'agua' | 'missao' | 'habito' | 'jogo'
export type DayBand = 'manha' | 'dia' | 'tarde' | 'noite'

/** Moedas do card principal de treino do dia. */
export const WORKOUT_CARD_COINS = 100
/** Penalidade após celebrar o ganho, se o treino for concluído em atraso. */
export const WORKOUT_LATE_PENALTY = 10

export function isMainWorkoutCard(card: { challengeId: string; kind?: string }) {
  return card.kind === 'treino' && /^w[1-4]-treino$/.test(card.challengeId)
}

export const bandLabel: Record<DayBand, string> = {
  manha: 'Manhã',
  dia: 'Dia',
  tarde: 'Tarde',
  noite: 'Noite',
}

export interface DailyChallenge {
  id: string
  week: 1 | 2 | 3 | 4
  band: DayBand
  /** Hora local (0–23) a partir da qual a carta libera (fallback). */
  unlockHour: number
  /** Minutos desde 00:00 — início da janela. */
  unlockMinutes: number
  windowStartMinutes: number
  windowEndMinutes: number
  windowKind: 'interval' | 'tolerance'
  /**
   * @deprecated Prefer windowKind. Mantido para UI legada.
   * true ≈ janela de intervalo da rotina.
   */
  flexible?: boolean
  /** Slot da rotina que define o horário de liberação. */
  scheduleKey?: RoutineSlot
  /** Para intervalos: start = janela completa; end = tolerância no fim. */
  scheduleEdge?: 'start' | 'end'
  /** Desloca o horário do slot (minutos). Ex.: check-out = sleep - 60. */
  scheduleOffsetMin?: number
  /** 0=Dom … 6=Sáb. Se omitido, vale todos os dias da semana. */
  weekdays?: number[]
  skipRestDay?: boolean
  onlyRestDay?: boolean
  title: string
  description: string
  proofHint: string
  coins: number
  /** Duração da janela (min). */
  durationMin: number
  /** Volume de água desta carta (ml) — meta 3,5 L repartida no dia (todas as semanas). */
  waterMl?: number
  kind: ChallengeKind
  /** photo = câmera; confirm = botão sem foto; game = abre minijogo no modal. */
  proofMode?: 'photo' | 'confirm' | 'game'
  /** Rótulo do botão de confirmação. */
  confirmLabel?: string
}

type Week = 1 | 2 | 3 | 4

const weekMeta: Record<Week, { kcal: number; phase: string }> = {
  1: { kcal: 1800, phase: 'Adaptação' },
  2: { kcal: 1600, phase: 'Evolução' },
  3: { kcal: 1400, phase: 'Aceleração' },
  4: { kcal: 1200, phase: 'Superação' },
}

function card(
  partial: Omit<
    DailyChallenge,
    'unlockMinutes' | 'windowStartMinutes' | 'windowEndMinutes' | 'windowKind'
  > & {
    unlockMinutes?: number
    windowStartMinutes?: number
    windowEndMinutes?: number
    windowKind?: 'interval' | 'tolerance'
  },
): DailyChallenge {
  const unlockMinutes = partial.unlockMinutes ?? partial.unlockHour * 60
  const windowKind = partial.windowKind ?? (partial.flexible ? 'interval' : 'tolerance')
  const windowStartMinutes = partial.windowStartMinutes ?? unlockMinutes
  const windowEndMinutes =
    partial.windowEndMinutes ??
    (windowKind === 'tolerance'
      ? (unlockMinutes + POINT_TOLERANCE_MIN) % 1440
      : unlockMinutes + Math.max(partial.durationMin, POINT_TOLERANCE_MIN))
  return {
    ...partial,
    unlockMinutes,
    windowStartMinutes,
    windowEndMinutes: windowEndMinutes % 1440,
    windowKind,
    flexible: windowKind === 'interval',
    durationMin:
      partial.durationMin ||
      windowDurationMin(windowStartMinutes, windowEndMinutes % 1440),
  }
}

function buildWeekDayDeck(week: Week): DailyChallenge[] {
  const { kcal, phase } = weekMeta[week]
  const w = `w${week}`

  const deck: DailyChallenge[] = [
    card({
      id: `${w}-acorde`,
      week,
      band: 'manha',
      unlockHour: 6,
      scheduleKey: 'wake',
      title: 'Check-in da manhã',
      description: `Comece o dia da fase ${phase}. Marque presença e prepare a rotina.`,
      proofHint: 'Toque em Acordado na hora de começar o dia — sem foto.',
      coins: 30,
      durationMin: 90,
      kind: 'habito',
      proofMode: 'confirm',
      confirmLabel: 'Acordado',
    }),
    card({
      id: `${w}-agua-manha`,
      week,
      band: 'manha',
      unlockHour: 6,
      scheduleKey: 'wake',
      title: 'Água',
      description: 'Hidratação ao acordar conforme seu peso.',
      proofHint: 'Foto da garrafa após beber.',
      coins: 10,
      durationMin: 120,
      kind: 'agua',
    }),
    card({
      id: `${w}-cafe`,
      week,
      band: 'manha',
      unlockHour: 6,
      scheduleKey: 'cafe',
      title: 'Café da manhã',
      description: `Siga o café do cardápio da semana ${week} (${kcal} kcal/dia).`,
      proofHint: 'Foto do café da manhã completo.',
      coins: 20,
      durationMin: 150,
      kind: 'dieta',
    }),
    card({
      id: `${w}-agua-cafe`,
      week,
      band: 'manha',
      unlockHour: 6,
      scheduleKey: 'cafe',
      title: 'Água',
      description: 'Hidratação no café da manhã.',
      proofHint: 'Foto da garrafa após beber.',
      coins: 10,
      durationMin: 150,
      kind: 'agua',
    }),
    card({
      id: `${w}-colacao`,
      week,
      band: 'manha',
      unlockHour: 10,
      scheduleKey: 'colacao',
      title: 'Colação',
      description: `Refeição intermediária da manhã — semana ${week}.`,
      proofHint: 'Foto da colação.',
      coins: 20,
      durationMin: 120,
      kind: 'dieta',
    }),
    card({
      id: `${w}-agua-colacao`,
      week,
      band: 'manha',
      unlockHour: 10,
      scheduleKey: 'colacao',
      title: 'Água',
      description: 'Hidratação na colação.',
      proofHint: 'Foto da garrafa após beber.',
      coins: 10,
      durationMin: 120,
      kind: 'agua',
    }),
    card({
      id: `${w}-movimento`,
      week,
      band: 'manha',
      unlockHour: 7,
      scheduleKey: 'wake',
      scheduleOffsetMin: 45,
      title:
        week === 1
          ? 'Movimento de adaptação'
          : week === 2
            ? 'Mobilidade + passos'
            : week === 3
              ? 'Ativação pré-treino'
              : 'Movimento de superação',
      description:
        week === 1
          ? 'Caminhada leve ou alongamento (5–10 min) — fase Adaptação.'
          : week === 2
            ? 'Mobilidade articular + 5–10 min de passos rápidos — fase Evolução.'
            : week === 3
              ? 'Ativação dinâmica (5–10 min) antes do dia intenso — fase Aceleração.'
              : 'Mobilidade completa (8–12 min) para aguentar a semana final — fase Superação.',
      proofHint: 'Foto do movimento / tênis / ambiente.',
      coins: 10,
      durationMin: 120,
      kind: 'habito',
    }),

    card({
      id: `${w}-treino`,
      week,
      band: 'dia',
      unlockHour: 6,
      scheduleKey: 'treino',
      scheduleEdge: 'start',
      flexible: true,
      title: 'Treino',
      description: 'Complete o treino na janela da sua rotina (início–fim do formulário).',
      proofHint: 'Foto no treino ou ao final da sessão.',
      coins: WORKOUT_CARD_COINS,
      durationMin: 720,
      kind: 'treino',
    }),
    card({
      id: `${w}-descanso`,
      week,
      band: 'dia',
      unlockHour: 6,
      scheduleKey: 'descanso',
      scheduleEdge: 'start',
      flexible: true,
      onlyRestDay: true,
      title: 'Dia de descanso ativo',
      description: 'Recuperação na sua janela de descanso: caminhada leve, alongamento ou pausa consciente.',
      proofHint: 'Foto do momento de recuperação.',
      coins: 30,
      durationMin: 720,
      kind: 'habito',
    }),
    card({
      id: `${w}-almoco`,
      week,
      band: 'dia',
      unlockHour: 11,
      scheduleKey: 'almoco',
      title: 'Almoço',
      description: `Refeição principal do cardápio — semana ${week}, fase ${phase}.`,
      proofHint: 'Foto do prato de almoço.',
      coins: 30,
      durationMin: 180,
      kind: 'dieta',
    }),
    card({
      id: `${w}-agua-meio`,
      week,
      band: 'dia',
      unlockHour: 11,
      scheduleKey: 'almoco',
      title: 'Água',
      description: 'Hidratação no almoço.',
      proofHint: 'Foto da garrafa após beber.',
      coins: 10,
      durationMin: 180,
      kind: 'agua',
    }),
    card({
      id: `${w}-pos-treino`,
      week,
      band: 'dia',
      unlockHour: 6,
      scheduleKey: 'treino',
      scheduleEdge: 'end',
      flexible: true,
      skipRestDay: true,
      title: 'Água pós-treino',
      description: 'Hidratação ao fim da sessão.',
      proofHint: 'Foto da garrafa após beber.',
      coins: 10,
      durationMin: 720,
      kind: 'agua',
    }),
    card({
      id: `${w}-agua-descanso`,
      week,
      band: 'dia',
      unlockHour: 6,
      scheduleKey: 'descanso',
      scheduleEdge: 'start',
      flexible: true,
      onlyRestDay: true,
      title: 'Água no descanso',
      description: 'Hidratação na janela de descanso.',
      proofHint: 'Foto da garrafa após beber.',
      coins: 10,
      durationMin: 720,
      kind: 'agua',
    }),

    card({
      id: `${w}-lanche`,
      week,
      band: 'tarde',
      unlockHour: 15,
      scheduleKey: 'lanche',
      title: 'Lanche da tarde',
      description: `Cumprir o lanche oficial do cardápio da semana ${week}.`,
      proofHint: 'Foto do lanche.',
      coins: 20,
      durationMin: 150,
      kind: 'dieta',
    }),
    card({
      id: `${w}-agua-tarde`,
      week,
      band: 'tarde',
      unlockHour: 15,
      scheduleKey: 'lanche',
      title: 'Água',
      description: 'Hidratação no lanche da tarde.',
      proofHint: 'Foto da garrafa após beber.',
      coins: 10,
      durationMin: 150,
      kind: 'agua',
    }),

    card({
      id: `${w}-jantar`,
      week,
      band: 'noite',
      unlockHour: 18,
      scheduleKey: 'jantar',
      title: 'Jantar',
      description: `Feche as refeições do dia com o jantar do cardápio (${kcal} kcal).`,
      proofHint: 'Foto do jantar.',
      coins: 30,
      durationMin: 180,
      kind: 'dieta',
    }),
    card({
      id: `${w}-agua-jantar`,
      week,
      band: 'noite',
      unlockHour: 18,
      scheduleKey: 'jantar',
      title: 'Água',
      description: 'Hidratação no jantar.',
      proofHint: 'Foto da garrafa após beber.',
      coins: 10,
      durationMin: 180,
      kind: 'agua',
    }),
    card({
      id: `${w}-ceia`,
      week,
      band: 'noite',
      unlockHour: 21,
      scheduleKey: 'ceia',
      title: 'Ceia',
      description: `Última refeição leve do dia — semana ${week}.`,
      proofHint: 'Foto da ceia.',
      coins: 20,
      durationMin: 120,
      kind: 'dieta',
    }),
    card({
      id: `${w}-agua-ceia`,
      week,
      band: 'noite',
      unlockHour: 21,
      scheduleKey: 'ceia',
      title: 'Água',
      description: 'Hidratação na ceia.',
      proofHint: 'Foto da garrafa após beber.',
      coins: 10,
      durationMin: 120,
      kind: 'agua',
    }),
    card({
      id: `${w}-agua-noite`,
      week,
      band: 'noite',
      unlockHour: 21,
      scheduleKey: 'ceia',
      title: 'Água',
      description: 'Hidratação ao encerrar o dia.',
      proofHint: 'Foto da garrafa após beber.',
      coins: 10,
      durationMin: 120,
      kind: 'agua',
    }),
    card({
      id: `${w}-check-noite`,
      week,
      band: 'noite',
      unlockHour: 20,
      scheduleKey: 'sleep',
      scheduleOffsetMin: -60,
      title: 'Check-out do dia',
      description: 'Revise o dia, organize o amanhã e encerre com constância.',
      proofHint: 'Selfie noturna ou print do resumo do dia.',
      coins: 20,
      durationMin: 120,
      kind: 'habito',
    }),
    card({
      id: `${w}-sono`,
      week,
      band: 'noite',
      unlockHour: 22,
      scheduleKey: 'sleep',
      scheduleEdge: 'start',
      flexible: true,
      title: 'Sono',
      description: 'Inicie o sono na janela da sua rotina (início–fim do formulário).',
      proofHint: 'Toque em Iniciar Sono na hora de deitar — sem foto.',
      coins: 30,
      durationMin: 480,
      kind: 'habito',
      proofMode: 'confirm',
      confirmLabel: 'Iniciar Sono',
    }),
  ]

  if (week === 1) {
    const mission = getMission(1)
    const cafeIdx = deck.findIndex((c) => c.id.endsWith('-cafe'))
    if (cafeIdx >= 0) {
      deck.splice(
        cafeIdx + 1,
        0,
        card({
          id: `${w}-jejum-fim`,
          week,
          band: 'manha',
          unlockHour: 7,
          scheduleKey: 'cafe',
          scheduleOffsetMin: 20,
          weekdays: [2, 4, 6],
          title: 'Finalizar Jejum',
          description: `${mission.summary} Após o café, confirme o fim do jejum iniciado ontem à noite.`,
          proofHint: 'Toque em Finalizar Jejum — sem foto.',
          // Premia o esforço; início vale só 1 (economia equilibrada p/ unlock semanal).
          coins: 50,
          durationMin: 90,
          kind: 'missao',
          proofMode: 'confirm',
          confirmLabel: 'Finalizar Jejum',
        }),
      )
    }
    const sonoIdx = deck.findIndex((c) => c.id.endsWith('-sono'))
    if (sonoIdx >= 0) {
      deck.splice(
        sonoIdx,
        0,
        card({
          id: `${w}-jejum-inicio`,
          week,
          band: 'noite',
          unlockHour: 22,
          scheduleKey: 'sleep',
          scheduleOffsetMin: -30,
          weekdays: [1, 3, 5],
          title: 'Iniciar Jejum',
          description: `${mission.summary} Inicie sempre antes de dormir.`,
          proofHint: 'Toque em Iniciar Jejum — sem foto.',
          coins: 10,
          durationMin: 30,
          kind: 'missao',
          proofMode: 'confirm',
          confirmLabel: 'Iniciar Jejum',
        }),
      )
    }
  }

  if (week === 3) {
    const mission = getMission(3)
    deck.splice(
      6,
      0,
      card({
        id: `${w}-abs`,
        week,
        band: 'dia',
        unlockHour: 6,
        scheduleKey: 'wake',
        scheduleOffsetMin: 30,
        weekdays: [1, 3, 5],
        skipRestDay: true,
        title: 'Abdominais remadores',
        description: `${mission.summary} Faça 4 × 20 na janela da manhã.`,
        proofHint: 'Foto ou vídeo curto da execução.',
        coins: 90,
        durationMin: 120,
        kind: 'missao',
      }),
    )
  }

  if (week === 4) {
    const mission = getMission(4)
    deck.splice(
      6,
      0,
      card({
        id: `${w}-aula`,
        week,
        band: 'dia',
        unlockHour: 6,
        scheduleKey: 'treino',
        scheduleEdge: 'start',
        flexible: true,
        // Meta oficial: 2 aulas na semana (Seg e Qui).
        weekdays: [1, 4],
        skipRestDay: true,
        title: 'Aula coletiva',
        description: `${mission.summary} Spinning, jump, step ou dança — na janela de treino.`,
        proofHint: 'Foto na aula ou na academia.',
        coins: 50,
        durationMin: 720,
        kind: 'missao',
      }),
    )
  }

  return deck
}

export const dailyChallenges: DailyChallenge[] = [
  ...buildWeekDayDeck(1),
  ...buildWeekDayDeck(2),
  ...buildWeekDayDeck(3),
  ...buildWeekDayDeck(4),
]

function routineHasAnyTime(routine: DailyRoutine) {
  return Boolean(
    routine.wake ||
      routine.cafe ||
      routine.treino?.start ||
      routine.trabalho?.start ||
      routine.descanso?.start ||
      routine.lazer?.start,
  )
}

function mealKeyFromChallengeId(id: string): MealKey | null {
  if (id.endsWith('-cafe')) return 'cafe'
  if (id.endsWith('-almoco')) return 'almoco'
  if (id.endsWith('-lanche')) return 'lanche'
  if (id.endsWith('-jantar')) return 'jantar'
  return null
}

function summarizeMeal(week: 1 | 2 | 3 | 4, mealKey: MealKey): string {
  const diet = getEffectiveDiet(week)
  const meal = diet.meals.find((m) => m.key === mealKey)
  if (!meal) return `Siga o cardápio da semana ${week} (${diet.kcal} kcal/dia).`
  const top = meal.items
    .slice(0, 3)
    .map((i) => `${i.name} (${i.amount})`)
    .join(' · ')
  const extra = meal.items.length > 3 ? ` · +${meal.items.length - 3} itens` : ''
  const prep = meal.prep ? ` ${meal.prep}` : ''
  return `${meal.title} · ${diet.kcal} kcal/dia · ${top}${extra}.${prep}`
}

function summarizeWorkout(week: 1 | 2 | 3 | 4, letter: WorkoutLetter): string {
  const w = getEffectiveWorkout(week, letter)
  const moves = w.blocks.map((b) => b.exercise).slice(0, 4).join(' · ')
  const more = w.blocks.length > 4 ? ` · +${w.blocks.length - 4}` : ''
  return `Treino ${w.letter} (${w.days}) · fase ${w.phase}: ${moves}${more}.`
}

/**
 * Enriquecer cartas com cardápio, treino e missão reais do dia
 * (conteúdo oficial, não exemplos DEV).
 */
export function enrichDayChallenges(
  challenges: DailyChallenge[],
  week: 1 | 2 | 3 | 4,
  opts: {
    weekday: number
    isRest: boolean
    letter: WorkoutLetter | null
    weightKg: number | null
  },
): DailyChallenge[] {
  const diet = getEffectiveDiet(week)
  const mission = getMission(week)
  const jejumStartHours = JEJUM_HOURS_BY_START_WEEKDAY[opts.weekday]
  const jejumEndHours = JEJUM_HOURS_BY_END_WEEKDAY[opts.weekday]

  return challenges.map((c) => {
    const mealKey = mealKeyFromChallengeId(c.id)
    if (mealKey) {
      const baseDesc = summarizeMeal(week, mealKey)
      const mealTitle =
        getEffectiveDiet(week).meals.find((m) => m.key === mealKey)?.title.toLowerCase() ?? 'prato'
      if (mealKey === 'cafe' && jejumEndHours != null) {
        return {
          ...c,
          description: `${baseDesc} Este café encerra o jejum de ${jejumEndHours}h — depois faça o check-in Finalizar Jejum.`,
          proofHint: `Foto do ${mealTitle} completo (quebra do jejum).`,
        }
      }
      return {
        ...c,
        description: baseDesc,
        proofHint: `Foto do ${mealTitle} completo do cardápio.`,
      }
    }

    if (c.id.endsWith('-colacao')) {
      return {
        ...c,
        description: `Colação da fase ${diet.phase} (${diet.kcal} kcal/dia). Mantenha o intervalo leve conforme a rotina — sem substituir o café ou o almoço.`,
        proofHint: 'Foto da colação / lanche intermediário da manhã.',
      }
    }

    if (c.id.endsWith('-ceia')) {
      return {
        ...c,
        description: `Ceia leve da fase ${diet.phase} (${diet.kcal} kcal/dia). Opção sugerida: chá sem açúcar + fruta pequena, sem ultrapassar o cardápio do jantar.`,
        proofHint: 'Foto da ceia leve.',
      }
    }

    if (c.id.endsWith('-treino') && opts.letter && !opts.isRest) {
      return {
        ...c,
        title: `Treino ${opts.letter}`,
        description: summarizeWorkout(week, opts.letter),
        proofHint: `Foto no treino ${opts.letter} ou ao final da sessão.`,
      }
    }

    if (c.id.endsWith('-descanso') && opts.isRest) {
      return {
        ...c,
        description: `Dia de descanso ativo · fase ${diet.phase}. Caminhada leve, alongamento ou pausa consciente na janela de descanso da rotina.`,
      }
    }

    if (c.id.endsWith('-jejum-inicio') && jejumStartHours != null) {
      return {
        ...c,
        description: `${mission.title}: jejum de ${jejumStartHours}h. Toque em Iniciar Jejum antes de dormir — o café de amanhã + check-in encerram.`,
      }
    }

    if (c.id.endsWith('-jejum-fim') && jejumEndHours != null) {
      return {
        ...c,
        description: `${mission.title}: após o café da manhã, confirme o fim do jejum de ${jejumEndHours}h iniciado ontem à noite.`,
      }
    }

    if (c.id.endsWith('-abs')) {
      return {
        ...c,
        description: `${mission.summary} Execute 4 × 20 remadores na janela da manhã.`,
      }
    }

    if (c.id.endsWith('-aula')) {
      return {
        ...c,
        description: `${mission.summary} Modalidades: spinning, jump, step ou dança — na janela de treino.`,
      }
    }

    const waterMl = waterMlForChallenge(c.id, opts.weightKg)
    if (waterMl != null) {
      const goalMl = waterMissionGoalMl(opts.weightKg)
      const goalLabel = goalMl != null ? formatWaterMl(goalMl) : ''
      return {
        ...c,
        waterMl,
        title: `Água · ${formatWaterMl(waterMl)}`,
        description: `Hidratação · fase ${diet.phase}. Beba ${formatWaterMl(waterMl)} nesta janela. Meta do dia: ${goalLabel} em ${WATER_CARD_COUNT} cartas (peso × 35 ml).`,
        proofHint: `Foto da garrafa após beber ${formatWaterMl(waterMl)}.`,
        kind: 'agua',
      }
    }

    if (c.id.endsWith('-check-noite')) {
      return {
        ...c,
        description: `Check-out · semana ${week} (${diet.phase}). Revise refeições, treino/missão e prepare o amanhã.`,
      }
    }

    if (c.id.endsWith('-acorde')) {
      return {
        ...c,
        description: `Check-in · dia da fase ${diet.phase} (${diet.kcal} kcal). Marque presença e prepare a rotina.`,
      }
    }

    return c
  })
}

/** Aplica horários da rotina do participante às cartas do dia. */
export function applyRoutineToChallenges(
  challenges: DailyChallenge[],
  routine: DailyRoutine | null | undefined,
  weekday?: number,
): DailyChallenge[] {
  const r = routine && routineHasAnyTime(routine) ? routine : exampleRoutine
  const jejumStartHours =
    weekday != null ? JEJUM_HOURS_BY_START_WEEKDAY[weekday] : undefined
  const jejumEndHours =
    weekday != null ? JEJUM_HOURS_BY_END_WEEKDAY[weekday] : undefined

  return challenges.map((c) => {
    if (!c.scheduleKey) {
      const start = c.unlockMinutes ?? c.unlockHour * 60
      const end = (start + POINT_TOLERANCE_MIN) % 1440
      return {
        ...c,
        unlockMinutes: start,
        windowStartMinutes: start,
        windowEndMinutes: end,
        windowKind: 'tolerance' as const,
        flexible: false,
        durationMin: POINT_TOLERANCE_MIN,
        band: bandFromMinutes(start),
      }
    }

    // Iniciar jejum: janela curta imediatamente antes do sono
    if (c.id.endsWith('-jejum-inicio')) {
      const sleepStart = resolveRoutineMinutes(r, 'sleep', 'start')
      if (sleepStart == null) return c
      const hours = jejumStartHours ?? 6
      const start = (sleepStart - 30 + 1440) % 1440
      const end = sleepStart
      const durationMin = windowDurationMin(start, end)
      const range = `${formatMinutes(start)}–${formatMinutes(end)}`
      return {
        ...c,
        unlockMinutes: start,
        unlockHour: minutesToHour(start),
        band: bandFromMinutes(start),
        windowStartMinutes: start,
        windowEndMinutes: end,
        windowKind: 'interval' as const,
        flexible: true,
        durationMin,
        description: `Inicie o jejum de ${hours}h nesta janela (${range}), sempre antes de dormir.`,
      }
    }

    // Finalizar jejum: após o café (quebra do jejum) + check-in
    if (c.id.endsWith('-jejum-fim')) {
      const cafeStart = resolveRoutineMinutes(r, 'cafe', 'start')
      if (cafeStart == null) return c
      const hours = jejumEndHours ?? 6
      const start = (cafeStart + 15) % 1440
      const end = (cafeStart + 100) % 1440
      const durationMin = windowDurationMin(start, end)
      const range = `${formatMinutes(start)}–${formatMinutes(end)}`
      return {
        ...c,
        unlockMinutes: start,
        unlockHour: minutesToHour(start),
        band: bandFromMinutes(start),
        windowStartMinutes: start,
        windowEndMinutes: end,
        windowKind: 'interval' as const,
        flexible: true,
        durationMin,
        description: `Após o café, confirme o fim do jejum de ${hours}h (${range}).`,
      }
    }

    const window = resolveRoutineWindow(
      r,
      c.scheduleKey,
      c.scheduleEdge ?? 'start',
      c.scheduleOffsetMin ?? 0,
    )
    if (!window) return c

    const unlockMinutes = window.start
    const unlockHour = minutesToHour(unlockMinutes)
    const band = bandFromMinutes(unlockMinutes)
    const durationMin = windowDurationMin(window.start, window.end)
    const range = `${formatMinutes(window.start)}–${formatMinutes(window.end)}`

    let description = c.description
    if (c.scheduleKey === 'treino' && c.id.endsWith('-treino')) {
      description = `${c.description} Janela da rotina: ${range}.`
    } else if (c.scheduleKey === 'treino' && c.id.endsWith('-aula')) {
      description = `${c.description} Janela: ${range}.`
    } else if (c.scheduleKey === 'sleep' && c.id.endsWith('-sono')) {
      description = `Horário da rotina: ${range}. Toque em Iniciar Sono dentro desta janela.`
    } else if (c.id.endsWith('-cafe') && jejumEndHours != null) {
      description = `${c.description} Jejum de ${jejumEndHours}h — este café encerra; depois faça Finalizar Jejum.`
    }

    return {
      ...c,
      unlockMinutes,
      unlockHour,
      band,
      windowStartMinutes: window.start,
      windowEndMinutes: window.end,
      windowKind: window.kind,
      flexible: window.kind === 'interval',
      durationMin,
      description,
    }
  })
}

export function getTodayChallenges(week: 1 | 2 | 3 | 4, weekday: number, isRest: boolean) {
  return dailyChallenges.filter((c) => {
    if (c.week !== week) return false
    if (c.skipRestDay && isRest) return false
    if (c.onlyRestDay && !isRest) return false
    if (c.weekdays && !c.weekdays.includes(weekday)) return false
    return true
  })
}

/** Baralho do dia pronto para uso real: filtro + conteúdo + rotina. */
export function buildDayChallenges(
  week: 1 | 2 | 3 | 4,
  weekday: number,
  isRest: boolean,
  letter: WorkoutLetter | null,
  routine: DailyRoutine | null | undefined,
  profileWeight?: string,
): DailyChallenge[] {
  const weightKg = parseWeightKg(profileWeight)
  const base = getTodayChallenges(week, weekday, isRest)
  const enriched = enrichDayChallenges(base, week, { weekday, isRest, letter, weightKg })
  const scheduled = applyRoutineToChallenges(enriched, routine, weekday)
  if (weightKg == null) {
    return scheduled.filter((c) => c.kind !== 'agua')
  }
  return scheduled
}

export function challengeProofKey(dateKey: string, challengeId: string) {
  return `${dateKey}::${challengeId}`
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

export function formatUnlockHour(hour: number) {
  return `${String(hour).padStart(2, '0')}h`
}

export function formatUnlockTime(minutes: number) {
  return formatMinutes(minutes)
}

export function formatWindowRange(start: number, end: number) {
  return `${formatMinutes(start)}–${formatMinutes(end)}`
}

function dateKeyToMidnight(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

/** Timestamp do início da janela no dia da fila. */
export function windowStartMs(dateKey: string, startMin: number) {
  const base = dateKeyToMidnight(dateKey)
  base.setMinutes(startMin)
  return base.getTime()
}

/** Prazo das cartas-estrela: 1h antes do início do sono na rotina do dia. */
export function starExtrasDeadlineMinutes(sleepStartMin: number): number {
  let deadline = sleepStartMin - 60
  if (deadline < 0) deadline += 1440
  return deadline
}

export function starExtrasCountdownMs(
  dateKey: string,
  sleepStartMin: number,
  nowMs: number,
): number {
  const deadlineMs = windowStartMs(dateKey, starExtrasDeadlineMinutes(sleepStartMin))
  return Math.max(0, deadlineMs - nowMs)
}

export const MORNING_CHECK_IN_CARD_TITLE = 'Check-in da manhã'

/** Carta de hábito “Check-in da manhã” (id *-acorde), não o slot genérico Acordar. */
export function findMorningCheckInChallenge(
  challenges: DailyChallenge[],
): DailyChallenge | undefined {
  return challenges.find(
    (c) =>
      c.title === MORNING_CHECK_IN_CARD_TITLE ||
      (/-acorde$/.test(c.id) && c.kind === 'habito'),
  )
}

export function morningCheckInStartMinutesFromChallenges(
  challenges: DailyChallenge[],
): number | null {
  const card = findMorningCheckInChallenge(challenges)
  if (!card) return null
  return card.windowStartMinutes ?? card.unlockMinutes ?? null
}

/** Início do check-in + 2h — horário em que as cartas extras podem ser liberadas. */
export function morningCheckInUnlockMinutes(checkInStartMin: number): number {
  return (checkInStartMin + 120) % 1440
}

export function morningCheckInUnlockMs(
  dateKey: string,
  checkInStartMin: number | null,
): number | null {
  if (checkInStartMin == null) return null
  return windowStartMs(dateKey, morningCheckInUnlockMinutes(checkInStartMin))
}

/** Minutos no relógio do app (fase do dia do baralho). */
export function clockMinutesOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes()
}

/**
 * Madrugada bloqueada: do início do sono (ex. 23:00) até check-in + 2h (ex. 08:00).
 * Inclui 06:00 — cartas extras e botão ficam fora até passar o fim do bloqueio.
 */
export function isStarCardsLockWindow(
  now: Date,
  sleepStartMin: number | null,
  checkInStartMin: number | null,
): boolean {
  if (sleepStartMin == null || checkInStartMin == null) return true
  const unlockEndMin = morningCheckInUnlockMinutes(checkInStartMin)
  const mins = clockMinutesOfDay(now)

  if (unlockEndMin <= sleepStartMin) {
    return mins >= sleepStartMin || mins < unlockEndMin
  }
  return mins >= sleepStartMin && mins < unlockEndMin
}

export function starCardsUnlockAvailable(
  dateKey: string,
  now: Date,
  sleepStartMin: number | null,
  checkInStartMin: number | null,
): boolean {
  if (isStarCardsLockWindow(now, sleepStartMin, checkInStartMin)) return false
  const unlockMs = morningCheckInUnlockMs(dateKey, checkInStartMin)
  if (unlockMs == null) return false
  return now.getTime() >= unlockMs
}

/** Timestamp do fim da janela no dia da fila. */
export function windowEndDeadlineMs(dateKey: string, startMin: number, endMin: number) {
  const base = dateKeyToMidnight(dateKey)
  if (endMin >= startMin) {
    base.setMinutes(endMin)
    return base.getTime()
  }
  // Janela atravessa meia-noite: prazo no dia seguinte
  base.setDate(base.getDate() + 1)
  base.setMinutes(endMin)
  return base.getTime()
}

/**
 * Fase real da janela com data (corrige overnight: 15h não é “perdida”
 * só porque 06h já passou no relógio do dia).
 */
export function getWindowPhase(
  dateKey: string,
  startMin: number,
  endMin: number,
  nowMs: number,
): 'before' | 'in' | 'past' {
  const start = windowStartMs(dateKey, startMin)
  const end = windowEndDeadlineMs(dateKey, startMin, endMin)
  if (nowMs < start) return 'before'
  if (nowMs >= end) return 'past'
  return 'in'
}

/**
 * Na madrugada (00:00 até antes do fim do sono), o baralho continua o do dia
 * anterior — senão a carta de 23h some à meia-noite.
 * No horário exato do fim (ex.: 06:00) já usa o dia atual, para liberar o check-in.
 */
export function resolveChallengeDateKey(
  now: Date,
  sleep?: { start: string; end: string } | null,
  challengeStartDate?: string,
): string {
  const key = toISODate(now)
  if (!sleep?.start || !sleep?.end) return key
  const start = parseTimeToMinutes(sleep.start)
  const end = parseTimeToMinutes(sleep.end)
  if (start == null || end == null || end >= start) return key
  const nowMin = now.getHours() * 60 + now.getMinutes()
  // Estrito: 06:00 já é o novo dia (wake); 05:59 ainda é a noite anterior
  if (nowMin < end) {
    const prev = toISODate(addDays(now, -1))
    if (challengeStartDate && prev < challengeStartDate) return key
    return prev
  }
  return key
}

export function endOfDayMs(from = Date.now()) {
  const d = new Date(from)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export function challengesSignature(list: DailyChallenge[]) {
  return list
    .map(
      (c) =>
        `${c.id}:${c.windowStartMinutes}-${c.windowEndMinutes}:${c.windowKind}:${c.title}:${c.coins}:${c.description.slice(0, 48)}`,
    )
    .join('|')
}
