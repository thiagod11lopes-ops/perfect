/**
 * Prova visual: /celular Missão de Habilidade — borda roxa até a direita.
 * npm run preview --port 4173 && node scripts/proof-neonophis-celular.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.PERFECT_URL ?? 'http://127.0.0.1:4173'
const OUT = join(__dirname, 'out')
const SHOT = join(OUT, 'neonophis-celular-proof.png')

const STORAGE_KEY = 'zero-ao-topo-mvp-v1'

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  await page.addInitScript(
    ({ key }) => {
      const today = new Date().toISOString().slice(0, 10)
      const state = {
        onboardingComplete: true,
        acceptedRules: true,
        startDate: today,
        profile: { name: 'Teste', age: 30, sex: 'M', heightCm: 175, weightKg: 80, goal: 'cut' },
        routine: { wake: '07:00', sleep: '23:00', meals: {}, workouts: {} },
        weightFinal: '',
        coins: 500,
        coinEconomyVersion: 2,
        devMode: true,
        devDay: 1,
        devTime: '08:00:00',
        devClockAnchoredAt: Date.now(),
        devClockPaused: false,
        devGameCardReplayEpoch: 0,
        devNeonophisGridW: 12,
        devNeonophisGridH: 20,
        devNeonophisCellPx: 16,
        dayQueues: {
          [today]: {
            dateKey: today,
            week: 1,
            cards: [
              {
                id: 'w1-jogo-neonophis',
                week: 1,
                band: 'manha',
                unlockHour: 7,
                unlockMinutes: 480,
                windowStartMinutes: 480,
                windowEndMinutes: 1430,
                windowKind: 'interval',
                flexible: true,
                title: '✦ Missão de Habilidade',
                description: 'Neon Ophis',
                proofHint: 'Jogue',
                coins: 10,
                durationMin: 60,
                kind: 'jogo',
                proofMode: 'game',
                confirmLabel: 'Concluir',
                challengeId: 'w1-jogo-neonophis',
                status: 'ready',
                gamePlayEpoch: 0,
              },
            ],
          },
        },
        daily: {},
        shopping: {},
        photoNotes: {},
        workoutLoads: {},
      }
      localStorage.setItem(key, JSON.stringify(state))
    },
    { key: STORAGE_KEY },
  )

  await page.goto(`${BASE}/celular`, { waitUntil: 'networkidle', timeout: 90_000 })

  const intro = page.locator('.celular-intro')
  if (await intro.isVisible().catch(() => false)) {
    await intro.click()
    await page.waitForTimeout(1500)
  }

  await page.goto(`${BASE}/celular`, { waitUntil: 'networkidle' })

  const card = page.locator('.deck-tile').filter({ hasText: /Missão|Habilidade|Neon/i }).first()
  await card.waitFor({ state: 'visible', timeout: 30_000 })
  await card.click()
  await page.waitForTimeout(400)

  const start = page.locator('button.skill-mission-start, button:has-text("Jogar"), button:has-text("Começar")')
  if (await start.isVisible().catch(() => false)) {
    await start.click()
    await page.waitForTimeout(1200)
  }

  const fr = page.frame({ url: /neonophis/ })
  if (!fr) throw new Error('Neonophis iframe not found')

  await fr.waitForSelector('#game-canvas', { timeout: 30_000 })
  await page.waitForTimeout(800)

  const measures = await page.evaluate(() => {
    const phoneApp = document.querySelector('.phone-app')
    const host = document.querySelector('.neonophis-embed-host')
    const iframe = document.querySelector('iframe.day-game-frame--neonophis')
    return {
      phoneApp: phoneApp?.getBoundingClientRect().width ?? 0,
      host: host?.getBoundingClientRect().width ?? 0,
      iframe: iframe?.getBoundingClientRect().width ?? 0,
    }
  })

  const inner = await fr.evaluate(() => {
    const stage = document.getElementById('stage')
    const canvas = document.getElementById('game-canvas')
    return {
      docW: document.documentElement.clientWidth,
      stageW: stage?.clientWidth ?? 0,
      canvasW: canvas?.offsetWidth ?? 0,
      canvasStyleW: canvas?.style.width ?? '',
    }
  })

  await page.locator('.phone-screen').screenshot({ path: SHOT })

  const report = { measures, inner, shot: SHOT }
  writeFileSync(join(OUT, 'neonophis-celular-measures.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))

  const phoneW = measures.phoneApp
  const canvasW = inner.canvasW
  const ok = phoneW > 0 && Math.abs(canvasW - phoneW) <= 2
  console.log('FULL_WIDTH_OK:', ok, `(phoneApp=${phoneW.toFixed(1)} canvas=${canvasW})`)

  await browser.close()
  if (!ok) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})