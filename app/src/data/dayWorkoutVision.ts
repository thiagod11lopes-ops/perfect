import type { WorkoutLetter } from './types'
import { getEffectiveWorkout } from './adminContent'
import { hashDateKey } from './dayGames'

const LIFT_RULES: Array<{ pattern: RegExp; lift: string }> = [
  { pattern: /supino|bench/i, lift: 'bench_press' },
  { pattern: /agachamento|leg press|cadeira extensora|goblet/i, lift: 'squat' },
  { pattern: /remada|puxada/i, lift: 'lat_pulldown' },
  { pattern: /stiff|levantamento terra|terra romeno|deadlift/i, lift: 'deadlift' },
  { pattern: /desenvolvimento|elevação lateral|ombro/i, lift: 'overhead_press' },
  { pattern: /flex(ã|a)o|mergulho|push/i, lift: 'push_up' },
  { pattern: /mesa flexora|cadeira flexora|flexora/i, lift: 'leg_curl' },
  { pattern: /rosca|b(i|í)ceps/i, lift: 'bicep_curl' },
  { pattern: /eleva(ç|c)(ã|a)o p(é|e)lvica|glute|ponte/i, lift: 'glute_bridge' },
  { pattern: /tr(i|í)ceps|extens(ã|a)o/i, lift: 'tricep_extension' },
  { pattern: /eleva(ç|c)(ã|a)o frontal|lateral/i, lift: 'lateral_raise' },
]

const FALLBACK = { label: 'Rosca direta', lift: 'bicep_curl' }

export function mapExerciseToWorkoutVisionLift(exerciseLabel: string): string {
  const normalized = exerciseLabel.trim().toLowerCase()
  for (const rule of LIFT_RULES) {
    if (rule.pattern.test(normalized)) return rule.lift
  }
  return FALLBACK.lift
}

export function pickWorkoutVisionExercise(
  dateKey: string,
  week: 1 | 2 | 3 | 4,
  letter: WorkoutLetter | null,
): { label: string; lift: string } {
  if (!letter) return { ...FALLBACK }
  const workout = getEffectiveWorkout(week, letter)
  if (!workout.blocks.length) return { ...FALLBACK }
  const idx = hashDateKey(`${dateKey}:wv-exercise`) % workout.blocks.length
  const label = workout.blocks[idx]?.exercise ?? FALLBACK.label
  return { label, lift: mapExerciseToWorkoutVisionLift(label) }
}