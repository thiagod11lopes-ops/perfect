import { hashDateKey } from './dayGames'
import { MEMORY_MATCH_FACE_VIDEOS } from './exerciseDemos'

export const QUIZ_REWARD_COINS = 10

export type QuizRound = {
  correctTitle: string
  videoSrc: string
  choices: string[]
}

function shuffleSeeded<T>(items: T[], seed: number): T[] {
  const out = [...items]
  let s = seed >>> 0
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Uma rodada estável por sessionKey — mesmo vídeo e alternativas na sessão. */
export function buildQuizRound(sessionKey: string): QuizRound {
  const pool = MEMORY_MATCH_FACE_VIDEOS
  const correctIndex = hashDateKey(`quiz:${sessionKey}:correct`) % pool.length
  const correct = pool[correctIndex]

  const wrongTitles: string[] = []
  let cursor = hashDateKey(`quiz:${sessionKey}:wrong`)
  let guard = 0
  while (wrongTitles.length < 3 && guard < 200) {
    guard++
    cursor = (Math.imul(cursor, 1103515245) + 12345) >>> 0
    const idx = cursor % pool.length
    if (idx === correctIndex) continue
    const title = pool[idx].title
    if (wrongTitles.includes(title)) continue
    wrongTitles.push(title)
  }

  const choices = shuffleSeeded(
    [correct.title, ...wrongTitles.slice(0, 3)],
    hashDateKey(`quiz:${sessionKey}:shuffle`),
  )

  return {
    correctTitle: correct.title,
    videoSrc: correct.faceSrc,
    choices,
  }
}