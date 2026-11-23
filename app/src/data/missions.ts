import type { WeekMission } from './types'

export const missions: WeekMission[] = [
  {
    week: 1,
    title: 'Missão do Jejum',
    theme: 'Disciplina',
    summary:
      'Três jejuns noturnos: inicie antes de dormir e encerre após o café no dia seguinte (Seg 6h · Qua 8h · Sex 12h).',
    tasks: [
      { label: 'Segunda → Terça', detail: '6 horas — início à noite, café + check-in de manhã' },
      { label: 'Quarta → Quinta', detail: '8 horas — início à noite, café + check-in de manhã' },
      { label: 'Sexta → Sábado', detail: '12 horas — início à noite, café + check-in de manhã' },
    ],
    validation: 'Publique 1 Story em cada dia e marque @drcristianosantos.',
    records: 3,
  },
  {
    week: 2,
    title: 'Missão da Água',
    theme: 'Hidratação',
    summary: 'Beba 3,5 litros por dia, de segunda a domingo — 7 dias seguidos.',
    tasks: [
      { label: 'Meta diária', detail: '3,5 litros de água' },
      { label: 'Período', detail: 'Segunda a domingo' },
      { label: 'Validação', detail: '1 Story por dia (7 registros)' },
    ],
    validation: 'Publique 1 Story por dia mostrando a meta e marque @drcristianosantos.',
    records: 7,
  },
  {
    week: 3,
    title: 'Missão Superação',
    theme: 'Abdominais',
    summary: '4 séries de 20 abdominais remadores — segunda, quarta e sexta.',
    tasks: [
      { label: 'Execução', detail: '4 × 20 abdominais remadores' },
      { label: 'Dias', detail: 'Segunda, quarta e sexta' },
      { label: 'Volume', detail: '80 reps/dia · 240 na semana' },
    ],
    validation: 'Publique 1 Story em cada dia da missão e marque @drcristianosantos.',
    records: 3,
  },
  {
    week: 4,
    title: 'Energia Coletiva',
    theme: 'Aulas coletivas',
    summary: 'Participe de pelo menos 2 aulas coletivas: spinning, jump, step ou dança.',
    tasks: [
      { label: 'Meta', detail: '2 aulas coletivas na semana' },
      { label: 'Modalidades', detail: 'Spinning, jump, step ou dança' },
      { label: 'Validação', detail: '1 Story por aula (2 registros)' },
    ],
    validation: 'Publique 1 Story em cada aula e marque @drcristianosantos.',
    records: 2,
  },
]

export function getMission(week: 1 | 2 | 3 | 4) {
  return missions.find((m) => m.week === week)!
}
