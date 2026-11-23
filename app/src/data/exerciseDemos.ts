import { getAdminVideo } from './adminContent'

/**
 * Biblioteca de vídeos demonstrativos por exercício.
 * youtubeId → embed do YouTube; src → URL/arquivo; blobKey → upload no /adm.
 */
export type ExerciseDemo = {
  title: string
  youtubeId?: string
  src?: string
  /** Animação local (mp4/gif) do boneco demonstrativo. */
  animationSrc?: string
  blobKey?: string
  fileName?: string
}

/**
 * Animações por exercício (arquivos em /public/exercises).
 * Padrão: 16:9, fundo branco, sem texto; movimento inteiro dentro do quadro;
 * no UI o vídeo usa object-fit: contain para mostrar o desenho inteiro.
 */
const animationsByExercise: Record<string, string> = {
  'Supino reto': '/exercises/supino-reto-animacao.mp4',
  'Supino reto na máquina': '/exercises/supino-reto-animacao.mp4',
  'Supino na máquina': '/exercises/supino-reto-animacao.mp4',
  'Supino com halteres': '/exercises/supino-halteres-animacao.mp4',
  'Supino inclinado com halteres': '/exercises/supino-inclinado-animacao.mp4',
  'Supino inclinado na máquina': '/exercises/supino-inclinado-animacao.mp4',
  'Agachamento goblet': '/exercises/agachamento-goblet-animacao.mp4',
  'Agachamento livre ou goblet': '/exercises/agachamento-goblet-animacao.mp4',
  'Agachamento no banco': '/exercises/agachamento-banco-animacao.mp4',
  'Agachamento no Smith': '/exercises/agachamento-smith-animacao.mp4',
  'Agachamento no hack': '/exercises/agachamento-hack-animacao.mp4',
  'Remada baixa': '/exercises/remada-baixa-animacao.mp4',
  'Remada baixa pegada fechada': '/exercises/remada-baixa-animacao.mp4',
  'Remada baixa pegada neutra': '/exercises/remada-baixa-animacao.mp4',
  'Remada sentada pegada neutra': '/exercises/remada-baixa-animacao.mp4',
  'Remada articulada': '/exercises/remada-articulada-animacao.mp4',
  'Remada cavalo pegada neutra': '/exercises/remada-curvada-animacao.mp4',
  'Remada curvada com halteres': '/exercises/remada-curvada-animacao.mp4',
  'Puxada frontal': '/exercises/puxada-frontal-animacao.mp4',
  'Puxada frontal pegada neutra': '/exercises/puxada-frontal-animacao.mp4',
  'Puxada frontal pegada aberta': '/exercises/puxada-frontal-animacao.mp4',
  'Puxada alta pegada pronada': '/exercises/puxada-frontal-animacao.mp4',
  'Stiff com halteres': '/exercises/stiff-animacao.mp4',
  'Stiff com barra': '/exercises/stiff-animacao.mp4',
  'Levantamento terra romeno': '/exercises/stiff-animacao.mp4',
  'Leg press': '/exercises/leg-press-animacao.mp4',
  'Leg press 45°': '/exercises/leg-press-animacao.mp4',
  'Leg press 45 graus': '/exercises/leg-press-animacao.mp4',
  'Leg press horizontal': '/exercises/leg-press-animacao.mp4',
  'Mesa flexora': '/exercises/mesa-flexora-animacao.mp4',
  'Cadeira flexora': '/exercises/mesa-flexora-animacao.mp4',
  'Cadeira extensora': '/exercises/cadeira-extensora-animacao.mp4',
  'Elevação pélvica': '/exercises/elevacao-pelvica-animacao.mp4',
  'Elevação pélvica com carga': '/exercises/elevacao-pelvica-animacao.mp4',
  'Elevação pélvica na máquina': '/exercises/elevacao-pelvica-animacao.mp4',
  'Desenvolvimento com halteres': '/exercises/desenvolvimento-animacao.mp4',
  'Desenvolvimento na máquina': '/exercises/desenvolvimento-maquina-animacao.mp4',
  'Elevação lateral com halteres': '/exercises/elevacao-lateral-animacao.mp4',
  'Elevação lateral na máquina': '/exercises/elevacao-lateral-animacao.mp4',
  'Crucifixo no banco 45°': '/exercises/crucifixo-animacao.mp4',
  'Crucifixo com halteres no banco 45°': '/exercises/crucifixo-animacao.mp4',
  'Crucifixo na máquina (peck deck)': '/exercises/crucifixo-animacao.mp4',
  'Flexão inclinada': '/exercises/flexao-inclinada-animacao.mp4',
}

/** Demos por família de movimento (fallback por palavra-chave). */
const demosByKeyword: Array<{ match: RegExp; demo: Omit<ExerciseDemo, 'title'> }> = [
  { match: /supino\s*reto/i, demo: { youtubeId: 'gRVjAtPip0Y' } },
  { match: /supino\s*inclinado/i, demo: { youtubeId: '8iPEnn-htA4' } },
  { match: /supino.*m[aá]quina|supino\s*com\s*halteres|supino$/i, demo: { youtubeId: 'VmB1G1K7v94' } },
  { match: /agachamento\s*goblet|agachamento\s*livre/i, demo: { youtubeId: 'MeIiIdhvXT4' } },
  { match: /agachamento\s*no\s*banco/i, demo: { youtubeId: 'wckvfMmKwzE' } },
  { match: /agachamento\s*no\s*smith/i, demo: { youtubeId: 'X0qC1hFqPjA' } },
  { match: /agachamento\s*no\s*hack/i, demo: { youtubeId: 'rYgNArpwE7o' } },
  { match: /leg\s*press/i, demo: { youtubeId: 'IZxyjW7MPJQ' } },
  { match: /remada\s*baixa/i, demo: { youtubeId: 'GZbfZ033f74' } },
  { match: /remada\s*cavalo/i, demo: { youtubeId: 'FWRyZ7w5qMQ' } },
  { match: /remada\s*sentada/i, demo: { youtubeId: 'GZbfZ033f74' } },
  { match: /remada\s*curvada|remada\s*articulada/i, demo: { youtubeId: 'roCP6wCXPqo' } },
  { match: /puxada\s*frontal|puxada\s*alta/i, demo: { youtubeId: 'CAwf7n6Luuc' } },
  { match: /stiff|terra\s*romeno/i, demo: { youtubeId: '2SHsk9AzdjA' } },
  { match: /mesa\s*flexora|cadeira\s*flexora/i, demo: { youtubeId: '1Tq3QqXJcYs' } },
  { match: /cadeira\s*extensora/i, demo: { youtubeId: 'YyvSfVjQeL0' } },
  { match: /eleva[cç][aã]o\s*p[eé]lvica|elevacao\s*pelvica/i, demo: { youtubeId: 'LMSDAsQl_X0' } },
  { match: /desenvolvimento/i, demo: { youtubeId: 'qEwKCR5JCog' } },
  { match: /eleva[cç][aã]o\s*lateral/i, demo: { youtubeId: '3VcKaXpzqRo' } },
  { match: /crucifixo|peck\s*deck/i, demo: { youtubeId: 'eozdZWJLHiM' } },
  { match: /flex[aã]o\s*inclinada/i, demo: { youtubeId: 'IODxDxX7oiE' } },
]

/** Overrides por nome exato do exercício no baralho. */
const demosByName: Record<string, Omit<ExerciseDemo, 'title'>> = {
  'Supino reto': { youtubeId: 'gRVjAtPip0Y' },
  'Supino reto na máquina': { youtubeId: 'eozdZWJLHiM' },
  'Supino com halteres': { youtubeId: 'VmB1G1K7v94' },
  'Supino inclinado com halteres': { youtubeId: '8iPEnn-htA4' },
  'Supino inclinado na máquina': { youtubeId: 'DbFR1RV9CEE' },
  'Supino na máquina': { youtubeId: 'eozdZWJLHiM' },
  'Agachamento goblet': { youtubeId: 'MeIiIdhvXT4' },
  'Agachamento livre ou goblet': { youtubeId: 'MeIiIdhvXT4' },
  'Agachamento no banco': { youtubeId: 'wckvfMmKwzE' },
  'Agachamento no Smith': { youtubeId: 'X0qC1hFqPjA' },
  'Agachamento no hack': { youtubeId: 'rYgNArpwE7o' },
  'Remada baixa': { youtubeId: 'GZbfZ033f74' },
  'Remada baixa pegada fechada': { youtubeId: 'GZbfZ033f74' },
  'Remada baixa pegada neutra': { youtubeId: 'GZbfZ033f74' },
  'Remada articulada': { youtubeId: 'roCP6wCXPqo' },
  'Remada cavalo pegada neutra': { youtubeId: 'FWRyZ7w5qMQ' },
  'Remada curvada com halteres': { youtubeId: 'roCP6wCXPqo' },
  'Remada sentada pegada neutra': { youtubeId: 'GZbfZ033f74' },
  'Puxada frontal': { youtubeId: 'CAwf7n6Luuc' },
  'Puxada frontal pegada neutra': { youtubeId: 'CAwf7n6Luuc' },
  'Puxada frontal pegada aberta': { youtubeId: 'CAwf7n6Luuc' },
  'Puxada alta pegada pronada': { youtubeId: 'CAwf7n6Luuc' },
  'Stiff com halteres': { youtubeId: '2SHsk9AzdjA' },
  'Stiff com barra': { youtubeId: '2SHsk9AzdjA' },
  'Levantamento terra romeno': { youtubeId: '2SHsk9AzdjA' },
  'Leg press': { youtubeId: 'IZxyjW7MPJQ' },
  'Leg press 45°': { youtubeId: 'IZxyjW7MPJQ' },
  'Leg press 45 graus': { youtubeId: 'IZxyjW7MPJQ' },
  'Leg press horizontal': { youtubeId: 'IZxyjW7MPJQ' },
  'Mesa flexora': { youtubeId: '1Tq3QqXJcYs' },
  'Cadeira flexora': { youtubeId: '1Tq3QqXJcYs' },
  'Cadeira extensora': { youtubeId: 'YyvSfVjQeL0' },
  'Elevação pélvica': { youtubeId: 'LMSDAsQl_X0' },
  'Elevação pélvica com carga': { youtubeId: 'LMSDAsQl_X0' },
  'Elevação pélvica na máquina': { youtubeId: 'LMSDAsQl_X0' },
  'Desenvolvimento com halteres': { youtubeId: 'qEwKCR5JCog' },
  'Desenvolvimento na máquina': { youtubeId: 'qEwKCR5JCog' },
  'Elevação lateral com halteres': { youtubeId: '3VcKaXpzqRo' },
  'Elevação lateral na máquina': { youtubeId: '3VcKaXpzqRo' },
  'Crucifixo no banco 45°': { youtubeId: 'eozdZWJLHiM' },
  'Crucifixo com halteres no banco 45°': { youtubeId: 'eozdZWJLHiM' },
  'Crucifixo na máquina (peck deck)': { youtubeId: 'eozdZWJLHiM' },
  'Flexão inclinada': { youtubeId: 'IODxDxX7oiE' },
}

/** Fallback por família de movimento quando o nome não está no mapa exato. */
const animationsByKeyword: Array<{ match: RegExp; src: string }> = [
  { match: /supino\s*inclinado/i, src: '/exercises/supino-inclinado-animacao.mp4' },
  { match: /supino\s*com\s*halteres/i, src: '/exercises/supino-halteres-animacao.mp4' },
  { match: /supino/i, src: '/exercises/supino-reto-animacao.mp4' },
  { match: /agachamento\s*(livre\s*ou\s*)?goblet/i, src: '/exercises/agachamento-goblet-animacao.mp4' },
  { match: /agachamento\s*no\s*banco/i, src: '/exercises/agachamento-banco-animacao.mp4' },
  { match: /agachamento\s*no\s*smith/i, src: '/exercises/agachamento-smith-animacao.mp4' },
  { match: /agachamento\s*no\s*hack/i, src: '/exercises/agachamento-hack-animacao.mp4' },
  { match: /remada\s*(baixa|sentada)/i, src: '/exercises/remada-baixa-animacao.mp4' },
  { match: /remada\s*articulada/i, src: '/exercises/remada-articulada-animacao.mp4' },
  { match: /remada\s*(curvada|cavalo)/i, src: '/exercises/remada-curvada-animacao.mp4' },
  { match: /puxada\s*(frontal|alta)/i, src: '/exercises/puxada-frontal-animacao.mp4' },
  { match: /stiff|terra\s*romeno/i, src: '/exercises/stiff-animacao.mp4' },
  { match: /leg\s*press/i, src: '/exercises/leg-press-animacao.mp4' },
  { match: /mesa\s*flexora|cadeira\s*flexora/i, src: '/exercises/mesa-flexora-animacao.mp4' },
  { match: /cadeira\s*extensora/i, src: '/exercises/cadeira-extensora-animacao.mp4' },
  { match: /eleva[cç][aã]o\s*p[eé]lvica/i, src: '/exercises/elevacao-pelvica-animacao.mp4' },
  { match: /desenvolvimento\s*na\s*m[aá]quina/i, src: '/exercises/desenvolvimento-maquina-animacao.mp4' },
  { match: /desenvolvimento/i, src: '/exercises/desenvolvimento-animacao.mp4' },
  { match: /eleva[cç][aã]o\s*lateral/i, src: '/exercises/elevacao-lateral-animacao.mp4' },
  { match: /crucifixo|peck\s*deck/i, src: '/exercises/crucifixo-animacao.mp4' },
  { match: /flex[aã]o\s*inclinada/i, src: '/exercises/flexao-inclinada-animacao.mp4' },
]

function animationFor(exercise: string): string | undefined {
  if (animationsByExercise[exercise]) return animationsByExercise[exercise]
  for (const entry of animationsByKeyword) {
    if (entry.match.test(exercise)) return entry.src
  }
  return undefined
}

export function resolveExerciseDemo(exercise: string): ExerciseDemo {
  const animationSrc = animationFor(exercise)
  const admin = getAdminVideo(exercise)
  if (admin) {
    return {
      title: exercise,
      youtubeId: admin.youtubeId,
      src: admin.url,
      blobKey: admin.blobKey,
      fileName: admin.fileName,
      animationSrc,
    }
  }

  const exact = demosByName[exercise]
  if (exact) return { title: exercise, ...exact, animationSrc }

  for (const entry of demosByKeyword) {
    if (entry.match.test(exercise)) {
      return { title: exercise, ...entry.demo, animationSrc }
    }
  }

  return { title: exercise, youtubeId: 'gRVjAtPip0Y', animationSrc }
}

/**
 * Vídeos *-animacao.mp4 com figura anatómica 3D (cinza + músculos em destaque).
 * Excluídos os que usam bonequinho laranja 2D (crucifixo, cadeira-extensora, etc.).
 */
export const MEMORY_MATCH_FACE_VIDEOS = [
  { title: 'Agachamento no banco', faceSrc: '/exercises/agachamento-banco-animacao.mp4' },
  { title: 'Agachamento goblet', faceSrc: '/exercises/agachamento-goblet-animacao.mp4' },
  { title: 'Desenvolvimento com halteres', faceSrc: '/exercises/desenvolvimento-animacao.mp4' },
  { title: 'Desenvolvimento na máquina', faceSrc: '/exercises/desenvolvimento-maquina-animacao.mp4' },
  { title: 'Elevação pélvica', faceSrc: '/exercises/elevacao-pelvica-animacao.mp4' },
  { title: 'Flexão inclinada', faceSrc: '/exercises/flexao-inclinada-animacao.mp4' },
  { title: 'Leg press', faceSrc: '/exercises/leg-press-animacao.mp4' },
  { title: 'Mesa flexora', faceSrc: '/exercises/mesa-flexora-animacao.mp4' },
  { title: 'Puxada frontal', faceSrc: '/exercises/puxada-frontal-animacao.mp4' },
  { title: 'Remada articulada', faceSrc: '/exercises/remada-articulada-animacao.mp4' },
  { title: 'Remada baixa', faceSrc: '/exercises/remada-baixa-animacao.mp4' },
  { title: 'Stiff', faceSrc: '/exercises/stiff-animacao.mp4' },
  { title: 'Supino com halteres', faceSrc: '/exercises/supino-halteres-animacao.mp4' },
  { title: 'Supino reto', faceSrc: '/exercises/supino-reto-animacao.mp4' },
] as const satisfies ReadonlyArray<{ title: string; faceSrc: string }>

export type MemoryMatchExercise = {
  title: string
  faceSrc: string
  faceMedia: 'video'
}

/** Pool do jogo de memória: só vídeos da lista permitida (repete se o nível pedir mais pares). */
export function getMemoryMatchExercisePool(): MemoryMatchExercise[] {
  return MEMORY_MATCH_FACE_VIDEOS.map((entry) => ({
    ...entry,
    faceMedia: 'video' as const,
  }))
}

export function exerciseDemoEmbedUrl(demo: ExerciseDemo) {
  if (demo.src) return demo.src
  if (demo.youtubeId) {
    return `https://www.youtube.com/embed/${demo.youtubeId}?rel=0&modestbranding=1&playsinline=1`
  }
  return null
}
