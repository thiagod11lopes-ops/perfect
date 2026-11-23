export const brand = {
  name: 'Desafio do Zero ao Topo',
  coach: 'Dr. Cristiano Santos',
  handle: '@drcristianosantos',
  tagline: '28 dias • 4 fases • 1 objetivo',
  prize: '50% OFF na consulta individual online do Método Cristiano Santos',
}

export const phases = [
  { week: 1 as const, name: 'Adaptação', focus: 'Aprender a dinâmica e organizar a rotina', kcal: 1800 },
  { week: 2 as const, name: 'Evolução', focus: 'Avançar com constância', kcal: 1600 },
  { week: 3 as const, name: 'Aceleração', focus: 'Desenvolver o condicionamento', kcal: 1400 },
  { week: 4 as const, name: 'Superação', focus: 'Concluir o ciclo e consolidar hábitos', kcal: 1200 },
]

export const goldenRules = [
  {
    title: 'Medicamentos de uso contínuo',
    text: 'Não interrompa nem altere medicamentos de doenças crônicas. Qualquer mudança deve ser orientada pelo médico responsável.',
  },
  {
    title: 'Suplementação',
    text: 'Suplemento esportivo autorizado: creatina até 3 g/dia. Multivitamínicos e probióticos já prescritos podem ser mantidos.',
  },
  {
    title: 'Adoçantes permitidos',
    text: 'Estévia, sucralose e xilitol para café, chás e sucos.',
  },
  {
    title: 'Preparo das refeições',
    text: 'Prefira panelas antiaderentes. Se usar óleo/azeite, utilize o mínimo possível.',
  },
  {
    title: 'Temperos e sal',
    text: 'Temperos naturais liberados (alho, cebola, salsa, cebolinha, coentro, orégano, limão). Use pouco sal.',
  },
  {
    title: 'Pesagem e porções',
    text: 'Respeite as gramagens. Pese os alimentos na condição indicada no cardápio (cozidos ou prontos).',
  },
  {
    title: 'Substituições alimentares',
    text: 'Use apenas o Guia Oficial de Substituições da semana correspondente. Sem trocas livres.',
  },
  {
    title: 'Bebidas alcoólicas e extras',
    text: 'Sem álcool nos 28 dias. Evite açúcar, molhos, manteiga, óleo e extras não previstos.',
  },
  {
    title: 'Intolerâncias alimentares',
    text: 'Sem glúten ou sem lactose: escolha opções adequadas e confira rótulos. Na doença celíaca, evite contaminação cruzada.',
  },
  {
    title: 'Alergias e cuidados individuais',
    text: 'Se tiver alergia a algum alimento, não consuma e peça troca segura ao Dr. Cristiano. Doenças crônicas exigem avaliação individual.',
  },
]

export const hydrationDrinks = [
  { name: 'Água natural ou com gás', tip: 'Liberada' },
  { name: 'Chás', tip: 'Sem adição de açúcar' },
  { name: 'Refrigerante zero', tip: 'Versões sem açúcar' },
  { name: 'Suco de limão / morango / melão', tip: 'Sem açúcar; adoçante permitido' },
]

export const photoPoses = ['Frente', 'Costas', 'Perfil direito', 'Perfil esquerdo']

export function waterTargetMl(weightKg: number, trainingDay: boolean) {
  const base = Math.round(weightKg * 30)
  return trainingDay ? base + 500 : base
}
