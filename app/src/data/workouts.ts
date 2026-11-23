import type { WeekWorkout, WorkoutLetter } from './types'

function blocks(
  items: Array<[string, string, string, string]>,
): WeekWorkout['blocks'] {
  return items.map(([exercise, sets, activeCardio, after], i) => ({
    id: i + 1,
    exercise,
    sets,
    activeCardio,
    after,
  }))
}

export const workouts: WeekWorkout[] = [
  {
    week: 1,
    phase: 'Adaptação',
    letter: 'A',
    days: 'Seg / Qui',
    blocks: blocks([
      ['Supino reto', '3 × 10 • força', 'Polichinelos | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Agachamento goblet', '3 × 10 • força', 'Marcha rápida | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Remada baixa', '3 × 10 • força', 'Passos laterais | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Stiff com halteres', '3 × 10 • força', 'Marcha acelerada | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Desenvolvimento com halteres', '3 × 10 • força', 'Elevação alternada dos joelhos | 2 × 45 s', '1 min descanso + 3 min esteira'],
    ]),
  },
  {
    week: 1,
    phase: 'Adaptação',
    letter: 'B',
    days: 'Ter / Sex',
    blocks: blocks([
      ['Puxada frontal', '3 × 10 • força', 'Polichinelos adaptados | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Leg press', '3 × 10 • força', 'Marcha acelerada | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Supino com halteres', '3 × 10 • força', 'Passos laterais | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Mesa flexora', '3 × 10 • força', 'Elevação dos joelhos | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Remada articulada', '3 × 10 • força', 'Marcha rápida | 2 × 45 s', '1 min descanso + 3 min elíptico'],
    ]),
  },
  {
    week: 1,
    phase: 'Adaptação',
    letter: 'C',
    days: 'Qua / Sáb',
    blocks: blocks([
      ['Agachamento no banco', '3 × 10 • força', 'Polichinelos adaptados | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Remada articulada', '3 × 10 • força', 'Marcha rápida | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Flexão inclinada', '3 × 10 • força', 'Passos laterais | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Elevação pélvica', '3 × 12 • força', 'Elevação alternada dos joelhos | 2 × 45 s', '1 min descanso + 3 min elíptico'],
      ['Desenvolvimento na máquina', '3 × 10 • força', 'Marcha acelerada | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
    ]),
  },
  {
    week: 2,
    phase: 'Evolução',
    letter: 'A',
    days: 'Seg / Qui',
    blocks: blocks([
      ['Supino inclinado com halteres', '3 × 10 • força', 'Polichinelos adaptados | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Agachamento livre ou goblet', '3 × 10 • força', 'Marcha acelerada | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Remada cavalo pegada neutra', '3 × 10 • força', 'Passos laterais | 2 × 45 s', '1 min descanso + 3 min elíptico'],
      ['Levantamento terra romeno', '3 × 10 • força', 'Elevação alternada dos joelhos | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Elevação lateral com halteres', '3 × 10 • força', 'Marcha rápida | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
    ]),
  },
  {
    week: 2,
    phase: 'Evolução',
    letter: 'B',
    days: 'Ter / Sex',
    blocks: blocks([
      ['Puxada frontal pegada neutra', '3 × 10 • força', 'Passos laterais | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Cadeira extensora', '3 × 10 • força', 'Marcha acelerada | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Supino na máquina', '3 × 10 • força', 'Polichinelos adaptados | 2 × 45 s', '1 min descanso + 3 min elíptico'],
      ['Cadeira flexora', '3 × 10 • força', 'Elevação alternada dos joelhos | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Remada sentada pegada neutra', '3 × 10 • força', 'Marcha rápida | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
    ]),
  },
  {
    week: 2,
    phase: 'Evolução',
    letter: 'C',
    days: 'Qua / Sáb',
    blocks: blocks([
      ['Leg press 45°', '3 × 10 • força', 'Marcha rápida | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Remada curvada com halteres', '3 × 10 • força', 'Passos laterais | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Crucifixo no banco 45°', '3 × 10 • força', 'Polichinelos adaptados | 2 × 45 s', '1 min descanso + 3 min elíptico'],
      ['Elevação pélvica com carga', '3 × 10 • força', 'Elevação alternada dos joelhos | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Desenvolvimento na máquina', '3 × 10 • força', 'Marcha acelerada | 2 × 45 s', '1 min descanso + 3 min esteira'],
    ]),
  },
  {
    week: 3,
    phase: 'Aceleração',
    letter: 'A',
    days: 'Seg / Qui',
    blocks: blocks([
      ['Supino reto na máquina', '3 × 10 • força', 'Polichinelos adaptados | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Agachamento no Smith', '3 × 10 • força', 'Marcha acelerada | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Puxada frontal pegada neutra', '3 × 10 • força', 'Passos laterais | 2 × 45 s', '1 min descanso + 3 min elíptico'],
      ['Stiff com barra', '3 × 10 • força', 'Elevação alternada dos joelhos | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Elevação lateral na máquina', '3 × 10 • força', 'Marcha rápida | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
    ]),
  },
  {
    week: 3,
    phase: 'Aceleração',
    letter: 'B',
    days: 'Ter / Sex',
    blocks: blocks([
      ['Remada cavalo pegada neutra', '3 × 10 • força', 'Marcha rápida | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Cadeira extensora', '3 × 10 • força', 'Polichinelos adaptados | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Supino inclinado na máquina', '3 × 10 • força', 'Passos laterais | 2 × 45 s', '1 min descanso + 3 min elíptico'],
      ['Mesa flexora', '3 × 10 • força', 'Elevação alternada dos joelhos | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Desenvolvimento com halteres', '3 × 10 • força', 'Marcha acelerada | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
    ]),
  },
  {
    week: 3,
    phase: 'Aceleração',
    letter: 'C',
    days: 'Qua / Sáb',
    blocks: blocks([
      ['Leg press horizontal', '3 × 10 • força', 'Marcha acelerada | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Remada baixa pegada fechada', '3 × 10 • força', 'Passos laterais | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Crucifixo na máquina (peck deck)', '3 × 10 • força', 'Polichinelos adaptados | 2 × 45 s', '1 min descanso + 3 min elíptico'],
      ['Elevação pélvica na máquina', '3 × 10 • força', 'Elevação alternada dos joelhos | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Puxada alta pegada pronada', '3 × 10 • força', 'Marcha rápida | 2 × 45 s', '1 min descanso + 3 min esteira'],
    ]),
  },
  {
    week: 4,
    phase: 'Superação',
    letter: 'A',
    days: 'Seg / Qui',
    blocks: blocks([
      ['Supino inclinado com halteres', '3 × 10 • força', 'Polichinelos adaptados | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Agachamento no hack', '3 × 10 • força', 'Marcha acelerada | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Remada cavalo pegada neutra', '3 × 10 • força', 'Passos laterais | 2 × 45 s', '1 min descanso + 3 min elíptico'],
      ['Cadeira flexora', '3 × 10 • força', 'Elevação alternada dos joelhos | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Desenvolvimento na máquina', '3 × 10 • força', 'Marcha rápida | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
    ]),
  },
  {
    week: 4,
    phase: 'Superação',
    letter: 'B',
    days: 'Ter / Sex',
    blocks: blocks([
      ['Puxada frontal pegada aberta', '3 × 10 • força', 'Marcha acelerada | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Leg press 45 graus', '3 × 10 • força', 'Polichinelos adaptados | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Crucifixo com halteres no banco 45°', '3 × 10 • força', 'Passos laterais | 2 × 45 s', '1 min descanso + 3 min elíptico'],
      ['Stiff com halteres', '3 × 10 • força', 'Elevação alternada dos joelhos | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Elevação lateral com halteres', '3 × 10 • força', 'Marcha rápida | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
    ]),
  },
  {
    week: 4,
    phase: 'Superação',
    letter: 'C',
    days: 'Qua / Sáb',
    blocks: blocks([
      ['Supino reto na máquina', '3 × 10 • força', 'Polichinelos adaptados | 2 × 45 s', '1 min descanso + 3 min esteira'],
      ['Agachamento no Smith', '3 × 10 • força', 'Marcha acelerada | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Remada baixa pegada neutra', '3 × 10 • força', 'Passos laterais | 2 × 45 s', '1 min descanso + 3 min elíptico'],
      ['Elevação pélvica na máquina', '3 × 10 • força', 'Elevação alternada dos joelhos | 2 × 45 s', '1 min descanso + 3 min bicicleta'],
      ['Elevação lateral na máquina', '3 × 10 • força', 'Marcha rápida | 2 × 45 s', '1 min descanso + 3 min esteira'],
    ]),
  },
]

const letterByWeekday: Record<number, WorkoutLetter | null> = {
  0: null,
  1: 'A',
  2: 'B',
  3: 'C',
  4: 'A',
  5: 'B',
  6: 'C',
}

export function getWorkoutLetterForDate(date: Date): WorkoutLetter | null {
  return letterByWeekday[date.getDay()]
}

export function getWorkout(week: 1 | 2 | 3 | 4, letter: WorkoutLetter) {
  return workouts.find((w) => w.week === week && w.letter === letter)!
}
