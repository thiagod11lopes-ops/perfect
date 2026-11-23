/**
 * Mede o ganho máximo teórico em um dia (rotina concluída + 2 cartas-estrela no payout máximo).
 * Executar: node scripts/verify-daily-coin-cap.mjs
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = join(__dirname, '..')

async function loadTs(rel) {
  const spec = pathToFileURL(join(appRoot, rel)).href
  return import(spec)
}

const { getTodayChallenges } = await loadTs('src/data/dailyChallenges.ts')
const {
  buildDailyStarChallenges,
  entertainmentGameForWeekday,
  getDayGame,
} = await loadTs('src/data/dayGames.ts')
const { MEMORY_MATCH_LEVELS } = await loadTs('src/data/memoryMatchLevels.ts')
const { WORD_SEARCH_LEVELS } = await loadTs('src/data/wordSearchLevels.ts')
const {
  ROULETTE_MAX_WALLET_NET_GAIN,
  SPECIAL_ROULETTE_STAKES,
  resolveSpecialCardRoulette,
} = await loadTs('src/data/specialCardRoulette.ts')
const { DAILY_COIN_GAIN_CAP } = await loadTs('src/data/coinEconomy.ts')

function maxStarGamePayout(gameId) {
  const base = getDayGame(gameId)?.coins ?? 0
  switch (gameId) {
    case 'workout-vision':
      return Math.max(base, 20)
    case 'slot-machine': {
      let maxNet = 0
      for (const stake of SPECIAL_ROULETTE_STAKES) {
        for (let i = 0; i < 8000; i++) {
          const rng = () => ((i * 9301 + stake * 49297 + 233280) % 233280) / 233280
          const out = resolveSpecialCardRoulette(stake, rng, { forceBadSession: false })
          maxNet = Math.max(maxNet, out.netCoins)
        }
      }
      return Math.min(maxNet, ROULETTE_MAX_WALLET_NET_GAIN)
    }
    case 'memory-match':
      return Math.max(...MEMORY_MATCH_LEVELS.map((l) => l.reward), base)
    case 'word-search':
      return Math.max(...WORD_SEARCH_LEVELS.map((l) => l.reward), base)
    case 'quiz':
    case 'neonophis':
      return base
    default:
      return base
  }
}

function starMaxForWeekday(weekday) {
  const wv = maxStarGamePayout('workout-vision')
  const ent = entertainmentGameForWeekday(weekday)
  const entMax = maxStarGamePayout(ent)
  return wv + entMax
}

let globalMax = 0
let worst = null

for (const week of [1, 2, 3, 4]) {
  for (let weekday = 0; weekday <= 6; weekday++) {
    for (const isRest of [false, true]) {
      const cards = getTodayChallenges(week, weekday, isRest)
      const routine = cards.reduce((s, c) => s + (c.coins || 0), 0)
      const stars = starMaxForWeekday(weekday)
      const total = routine + stars
      if (total > globalMax) {
        globalMax = total
        worst = { week, weekday, isRest, routine, stars, total }
      }
    }
  }
}

console.log('DAILY_COIN_GAIN_CAP', DAILY_COIN_GAIN_CAP)
console.log('max_theoretical_day', globalMax)
console.log('worst_case', worst)

if (globalMax > DAILY_COIN_GAIN_CAP) {
  console.error('FAIL: exceeds cap')
  process.exit(1)
}
console.log('OK')