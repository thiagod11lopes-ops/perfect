export type FeatureModule =
  | 'IA Nutricional'
  | 'Dieta'
  | 'Treino'
  | 'Missões'
  | 'Progresso'
  | 'Hidratação'
  | 'Compras'
  | 'Engajamento'
  | 'Coach'
  | 'Plataforma'

export interface FeatureRow {
  id: string
  name: string
  module: FeatureModule
  description: string
  impact: 'Alto' | 'Médio' | 'Essencial'
}

export const features: FeatureRow[] = [
  {
    id: 'F01',
    name: 'Foto do alimento + cálculo médio de calorias',
    module: 'IA Nutricional',
    description:
      'Captura a refeição pela câmera e estima calorias médias, porções e macros com feedback imediato.',
    impact: 'Essencial',
  },
  {
    id: 'F02',
    name: 'Onboarding e questionário de saúde',
    module: 'Plataforma',
    description: 'Cadastro inicial com dados pessoais, medidas, objetivos e restrições de saúde.',
    impact: 'Essencial',
  },
  {
    id: 'F03',
    name: 'Home do desafio (dia e fase)',
    module: 'Engajamento',
    description: 'Painel do dia com progresso dos 28 dias, fase atual e atalhos de ação.',
    impact: 'Essencial',
  },
  {
    id: 'F04',
    name: 'Plano alimentar das 4 semanas',
    module: 'Dieta',
    description: 'Cardápio completo por fase (1800 → 1200 kcal) com 4 refeições diárias e gramagens.',
    impact: 'Essencial',
  },
  {
    id: 'F05',
    name: 'Check-in de refeições',
    module: 'Dieta',
    description: 'Marcação de café, almoço, lanche e jantar cumpridos no dia.',
    impact: 'Alto',
  },
  {
    id: 'F06',
    name: 'Guia de substituições',
    module: 'Dieta',
    description: 'Trocas oficiais por equivalência nutricional, por semana e por refeição.',
    impact: 'Alto',
  },
  {
    id: 'F07',
    name: 'Scanner nutricional por foto (macros)',
    module: 'IA Nutricional',
    description: 'Estimativa de proteínas, carboidratos e gorduras a partir da imagem do prato.',
    impact: 'Alto',
  },
  {
    id: 'F08',
    name: 'Comparação foto vs cardápio oficial',
    module: 'IA Nutricional',
    description: 'Confronta o prato fotografado com a refeição prevista do desafio e aponta desvios.',
    impact: 'Alto',
  },
  {
    id: 'F09',
    name: 'Treinos A/B/C das 4 semanas',
    module: 'Treino',
    description: 'Programação full body concorrente com blocos de força + cardio por dia.',
    impact: 'Essencial',
  },
  {
    id: 'F10',
    name: 'Timer guiado por bloco',
    module: 'Treino',
    description: 'Cronômetro de 6′ + 1′ + 3′ + transição para conduzir cada bloco ao vivo.',
    impact: 'Alto',
  },
  {
    id: 'F11',
    name: 'Vídeos demonstrativos de exercício',
    module: 'Treino',
    description: 'Biblioteca visual com execução correta de cada movimento do desafio.',
    impact: 'Alto',
  },
  {
    id: 'F12',
    name: 'Missões semanais de superação',
    module: 'Missões',
    description: 'Jejum, hidratação, abdômen e aulas coletivas com checklist de validação.',
    impact: 'Alto',
  },
  {
    id: 'F13',
    name: 'Premiação 50% OFF consulta',
    module: 'Missões',
    description: 'Acompanhamento do benefício ao completar e validar as 4 missões.',
    impact: 'Médio',
  },
  {
    id: 'F14',
    name: 'Tracker de hidratação',
    module: 'Hidratação',
    description: 'Meta automática por peso (30 ml/kg) com registro rápido de consumo.',
    impact: 'Essencial',
  },
  {
    id: 'F15',
    name: 'Lista de compras semanal',
    module: 'Compras',
    description: 'Checklist de itens, quantidades e custo estimado por semana do desafio.',
    impact: 'Alto',
  },
  {
    id: 'F16',
    name: 'Registro fotográfico de evolução',
    module: 'Progresso',
    description: 'Fotos de domingo (frente, costas e perfis) com anotações privadas.',
    impact: 'Alto',
  },
  {
    id: 'F17',
    name: 'Pesagem início e fim',
    module: 'Progresso',
    description: 'Registro de peso inicial e final, sem pesagem semanal obrigatória.',
    impact: 'Essencial',
  },
  {
    id: 'F18',
    name: '10 regras de ouro',
    module: 'Plataforma',
    description: 'Orientações oficiais de suplementação, preparo, álcool e cuidados individuais.',
    impact: 'Essencial',
  },
  {
    id: 'F19',
    name: 'Streaks e aderência diária',
    module: 'Engajamento',
    description: 'Sequência de dias com dieta, treino e água cumpridos para reforçar constância.',
    impact: 'Alto',
  },
  {
    id: 'F20',
    name: 'Lembretes inteligentes',
    module: 'Engajamento',
    description: 'Notificações de refeição, treino, água e missão no horário certo.',
    impact: 'Alto',
  },
  {
    id: 'F21',
    name: 'Modo offline / PWA',
    module: 'Plataforma',
    description: 'Uso sem internet com sincronização automática ao reconectar.',
    impact: 'Alto',
  },
  {
    id: 'F22',
    name: 'Login e sync na nuvem',
    module: 'Plataforma',
    description: 'Conta do participante com dados salvos e disponíveis em múltiplos dispositivos.',
    impact: 'Essencial',
  },
  {
    id: 'F23',
    name: 'Painel do coach',
    module: 'Coach',
    description: 'Visão do Dr. Cristiano com check-ins, aderência e alertas da turma.',
    impact: 'Alto',
  },
  {
    id: 'F24',
    name: 'Upload privado de fotos e questionário',
    module: 'Coach',
    description: 'Envio seguro de dados sensíveis e evolução corporal em canal privado.',
    impact: 'Alto',
  },
  {
    id: 'F25',
    name: 'Relatório final do desafio',
    module: 'Progresso',
    description: 'Exportação de antes/depois, aderência e resultado consolidado dos 28 dias.',
    impact: 'Médio',
  },
  {
    id: 'F26',
    name: 'Simulador mobile (/celular)',
    module: 'Plataforma',
    description: 'Experiência em moldura de smartphone para apresentação e uso mobile-first.',
    impact: 'Médio',
  },
  {
    id: 'F27',
    name: 'Histórico de pratos fotografados',
    module: 'IA Nutricional',
    description: 'Galeria das refeições analisadas com calorias estimadas e tendência semanal.',
    impact: 'Alto',
  },
  {
    id: 'F28',
    name: 'Gamificação e conquistas',
    module: 'Engajamento',
    description: 'Badges por fases, missões e consistência para manter o participante motivado.',
    impact: 'Médio',
  },
]
