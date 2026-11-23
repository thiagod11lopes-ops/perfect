import type { MealKey, WeekSubstitutions } from './types'

const commonNote =
  'Escolha apenas UMA opção na linha. Não coma o original junto com a troca. Pesos de arroz, feijão, massas, batatas e carnes são após o preparo.'

export const substitutionNote = commonNote

export const substitutions: WeekSubstitutions[] = [
  {
    week: 1,
    meals: {
      cafe: [
        { original: 'Pão francês — 50 g', option1: 'Pão de forma 50 g', option2: 'Cuscuz cozido 115 g' },
        { original: 'Ovo inteiro — 2 un.', option1: 'Ovo cozido — 2 un.', option2: 'Ovo mexido sem óleo — 2 un.' },
        { original: 'Muçarela — 15 g', option1: 'Queijo minas 15 g', option2: 'Queijo prato 15 g' },
        { original: 'Leite desnatado — 200 ml', option1: 'Iogurte desnatado 200 g', option2: 'Leite em pó (rótulo)' },
        { original: 'Mamão — 200 g', option1: 'Melão 240 g', option2: 'Melancia 270 g' },
      ],
      almoco: [
        { original: 'Arroz branco — 100 g', option1: 'Batata cozida 155 g', option2: 'Macarrão 85 g' },
        { original: 'Feijão vermelho — 40 g', option1: 'Feijão preto 40 g', option2: 'Lentilha 35 g' },
        { original: 'Peito de frango — 100 g', option1: 'Tilápia 125 g', option2: 'Peito de peru 105 g' },
        { original: 'Abacaxi — 100 g', option1: 'Melão 150 g', option2: 'Melancia 170 g' },
      ],
      lanche: [
        { original: 'Requeijão light — 30 g', option1: 'Cream cheese light 30 g', option2: 'Ricota 33 g' },
        { original: 'Pão de forma — 25 g', option1: 'Pão francês 25 g', option2: 'Cuscuz 55 g' },
        { original: 'Maçã — 100 g', option1: 'Pera 90 g', option2: 'Mamão 125 g' },
        { original: 'Peito de frango — 50 g', option1: 'Tilápia 65 g', option2: 'Peito de peru 55 g' },
        { original: 'Banana — 100 g', option1: 'Maçã 155 g', option2: 'Mamão 185 g' },
      ],
      jantar: [
        { original: 'Peito de frango — 120 g', option1: 'Tilápia 150 g', option2: 'Peito de peru 126 g' },
        { original: 'Rap10 — 40 g', option1: 'Pão de forma 50 g', option2: 'Pão francês 45 g' },
        { original: 'Requeijão light — 30 g', option1: 'Cream cheese light 30 g', option2: 'Ricota 33 g' },
        { original: 'Uva Itália — 100 g', option1: 'Maçã 95 g', option2: 'Mamão 135 g' },
      ],
    },
  },
  {
    week: 2,
    meals: {
      cafe: [
        { original: 'Pão francês — 50 g', option1: 'Pão de forma 50 g', option2: 'Cuscuz 115 g' },
        { original: 'Ovo inteiro — 2 un.', option1: 'Ovo cozido — 2 un.', option2: 'Ovo mexido sem óleo — 2 un.' },
        { original: 'Muçarela — 15 g', option1: 'Queijo minas 15 g', option2: 'Queijo prato 15 g' },
        { original: 'Leite desnatado — 150 ml', option1: 'Iogurte 150 g', option2: 'Leite em pó (rótulo)' },
        { original: 'Mamão — 150 g', option1: 'Melão 180 g', option2: 'Melancia 200 g' },
      ],
      almoco: [
        { original: 'Arroz branco — 80 g', option1: 'Batata 124 g', option2: 'Macarrão 68 g' },
        { original: 'Feijão vermelho — 40 g', option1: 'Feijão preto 40 g', option2: 'Lentilha 35 g' },
        { original: 'Peito de frango — 100 g', option1: 'Tilápia 125 g', option2: 'Peito de peru 105 g' },
        { original: 'Abacaxi — 100 g', option1: 'Melão 150 g', option2: 'Melancia 170 g' },
      ],
      lanche: [
        { original: 'Requeijão light — 20 g', option1: 'Cream cheese light 20 g', option2: 'Ricota 22 g' },
        { original: 'Pão de forma — 25 g', option1: 'Pão francês 25 g', option2: 'Cuscuz 55 g' },
        { original: 'Maçã — 100 g', option1: 'Pera 90 g', option2: 'Mamão 125 g' },
        { original: 'Peito de frango — 50 g', option1: 'Tilápia 65 g', option2: 'Peito de peru 55 g' },
        { original: 'Banana — 70 g', option1: 'Maçã 110 g', option2: 'Mamão 130 g' },
      ],
      jantar: [
        { original: 'Peito de frango — 100 g', option1: 'Tilápia 125 g', option2: 'Peito de peru 105 g' },
        { original: 'Rap10 — 40 g', option1: 'Pão de forma 50 g', option2: 'Pão francês 45 g' },
        { original: 'Requeijão light — 20 g', option1: 'Cream cheese light 20 g', option2: 'Ricota 22 g' },
        { original: 'Uva Itália — 125 g', option1: 'Maçã 120 g', option2: 'Mamão 170 g' },
      ],
    },
  },
  {
    week: 3,
    meals: {
      cafe: [
        { original: 'Pão de forma — 25 g', option1: 'Pão francês 25 g', option2: 'Cuscuz 55 g' },
        { original: 'Ovo inteiro — 2 un.', option1: 'Ovo cozido — 2 un.', option2: 'Ovo mexido sem óleo — 2 un.' },
        { original: 'Muçarela — 15 g', option1: 'Queijo minas 15 g', option2: 'Queijo prato 15 g' },
        { original: 'Leite desnatado — 150 ml', option1: 'Iogurte 150 g', option2: 'Leite em pó (rótulo)' },
        { original: 'Mamão — 120 g', option1: 'Melão 145 g', option2: 'Melancia 160 g' },
      ],
      almoco: [
        { original: 'Arroz branco — 40 g', option1: 'Batata 62 g', option2: 'Macarrão 34 g' },
        { original: 'Feijão vermelho — 40 g', option1: 'Feijão preto 40 g', option2: 'Lentilha 35 g' },
        { original: 'Peito de frango — 100 g', option1: 'Tilápia 125 g', option2: 'Peito de peru 105 g' },
        { original: 'Abacaxi — 75 g', option1: 'Melão 110 g', option2: 'Melancia 130 g' },
      ],
      lanche: [
        { original: 'Requeijão light — 20 g', option1: 'Cream cheese light 20 g', option2: 'Ricota 22 g' },
        { original: 'Pão de forma — 25 g', option1: 'Pão francês 25 g', option2: 'Cuscuz 55 g' },
        { original: 'Maçã — 100 g', option1: 'Pera 90 g', option2: 'Mamão 125 g' },
        { original: 'Peito de frango — 50 g', option1: 'Tilápia 65 g', option2: 'Peito de peru 55 g' },
        { original: 'Banana — 50 g', option1: 'Maçã 80 g', option2: 'Mamão 90 g' },
      ],
      jantar: [
        { original: 'Peito de frango — 100 g', option1: 'Tilápia 125 g', option2: 'Peito de peru 105 g' },
        { original: 'Rap10 — 40 g', option1: 'Pão de forma 50 g', option2: 'Pão francês 45 g' },
        { original: 'Requeijão light — 20 g', option1: 'Cream cheese light 20 g', option2: 'Ricota 22 g' },
        { original: 'Uva Itália — 70 g', option1: 'Maçã 65 g', option2: 'Mamão 95 g' },
      ],
    },
  },
  {
    week: 4,
    meals: {
      cafe: [
        { original: 'Pão de forma — 25 g', option1: 'Pão francês 25 g', option2: 'Cuscuz 55 g' },
        { original: 'Ovo inteiro — 1 un.', option1: 'Ovo cozido — 1 un.', option2: 'Ovo mexido sem óleo — 1 un.' },
        { original: 'Muçarela — 15 g', option1: 'Queijo minas 15 g', option2: 'Queijo prato 15 g' },
        { original: 'Leite desnatado — 150 ml', option1: 'Iogurte 150 g', option2: 'Leite em pó (rótulo)' },
        { original: 'Mamão — 120 g', option1: 'Melão 145 g', option2: 'Melancia 160 g' },
      ],
      almoco: [
        { original: 'Arroz branco — 40 g', option1: 'Batata 62 g', option2: 'Macarrão 34 g' },
        { original: 'Feijão vermelho — 20 g', option1: 'Feijão preto 20 g', option2: 'Lentilha 18 g' },
        { original: 'Peito de frango — 100 g', option1: 'Tilápia 125 g', option2: 'Peito de peru 105 g' },
        { original: 'Abacaxi — 40 g', option1: 'Melão 60 g', option2: 'Melancia 70 g' },
      ],
      lanche: [
        { original: 'Requeijão light — 20 g', option1: 'Cream cheese light 20 g', option2: 'Ricota 22 g' },
        { original: 'Pão de forma — 25 g', option1: 'Pão francês 25 g', option2: 'Cuscuz 55 g' },
        { original: 'Maçã — 100 g', option1: 'Pera 90 g', option2: 'Mamão 125 g' },
        { original: 'Peito de frango — 50 g', option1: 'Tilápia 65 g', option2: 'Peito de peru 55 g' },
        { original: 'Banana — 40 g', option1: 'Maçã 60 g', option2: 'Mamão 75 g' },
      ],
      jantar: [
        { original: 'Peito de frango — 100 g', option1: 'Tilápia 125 g', option2: 'Peito de peru 105 g' },
        { original: 'Rap10 — 40 g', option1: 'Pão de forma 50 g', option2: 'Pão francês 45 g' },
        { original: 'Requeijão light — 20 g', option1: 'Cream cheese light 20 g', option2: 'Ricota 22 g' },
        { original: 'Uva Itália — 30 g', option1: 'Maçã 30 g', option2: 'Mamão 40 g' },
      ],
    },
  },
]

export const mealLabels: Record<MealKey, string> = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
}

export function getSubstitutions(week: 1 | 2 | 3 | 4) {
  return substitutions.find((s) => s.week === week)!
}
