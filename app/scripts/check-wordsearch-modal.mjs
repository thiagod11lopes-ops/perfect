import { chromium, devices } from 'playwright'

const iPhone = devices['iPhone 13']

const measureJs = `function box(el) {
  if (!el) return null
  const r = el.getBoundingClientRect()
  const s = getComputedStyle(el)
  return {
    w: Math.round(r.width),
    h: Math.round(r.height),
    x: Math.round(r.x),
    y: Math.round(r.y),
    width: s.width,
    height: s.height,
    maxWidth: s.maxWidth,
    maxHeight: s.maxHeight,
    display: s.display,
    padding: s.padding,
    position: s.position,
    className: el.className,
  }
}`

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  baseURL: 'http://127.0.0.1:5173',
})
const page = await context.newPage()
await page.addInitScript(() => {
  try {
    const k = 'zero-ao-topo-mvp-v1'
    const state = JSON.parse(localStorage.getItem(k) || '{}')
    state.onboardingComplete = true
    state.acceptedRules = true
    state.devMode = true
    localStorage.setItem(k, JSON.stringify(state))
  } catch {
    /* empty */
  }
})
await page.goto('/celular', { waitUntil: 'networkidle' })
const intro = page.locator('.celular-intro')
if (await intro.count()) {
  await intro.click()
  await page.waitForTimeout(1400)
}

await page.locator('.phone-app .deck-grid, .phone-app .mobile-main').first().waitFor({ timeout: 20000 })

const wsCard = page.locator('.deck-card--wordsearch').first()
const wsCount = await wsCard.count()

const out = { wsCount }

if (wsCount > 0) {
  await wsCard.click()
  await page.waitForTimeout(400)
  await page.locator('.deck-wordsearch-level-btn').first().click()
  await page.waitForTimeout(600)
  out.wordSearch = await page.evaluate(new Function(`${measureJs}
    const phone = document.querySelector('.phone-app')
    const modal = document.querySelector('.game-card-modal')
    const panel = document.querySelector('.game-card-modal-panel')
    const embed = document.querySelector('.day-game-embed--word-search')
    const grid = document.querySelector('.wordsearch-grid')
    const pr = phone?.getBoundingClientRect()
  return {
    modal: box(modal),
    panel: box(panel),
    embed: box(embed),
    grid: box(grid),
    viewport: { w: window.innerWidth, h: window.innerHeight },
    phoneClient: pr ? { w: Math.round(pr.width), h: Math.round(pr.height) } : null,
  }`))
}

const memCard = page.locator('.deck-card.is-special').filter({ has: page.locator('.is-day-challenge-label') }).filter({ hasText: /Memória/i }).first()
const memCount = await memCard.count()
out.memCount = memCount

if (memCount > 0 && wsCount > 0) {
  await page.locator('.game-card-modal').first().waitFor({ state: 'visible' })
  const close = page.locator('.game-card-modal-close')
  if (await close.isVisible()) await close.click()
  await page.waitForTimeout(400)
  await memCard.click()
  await page.waitForTimeout(500)
  const pick = page.locator('.memory-level-pick-btn').first()
  if (await pick.count()) await pick.click()
  await page.waitForTimeout(800)
  out.memory = await page.evaluate(new Function(`${measureJs}
    const phone = document.querySelector('.phone-app')
    const modal = document.querySelector('.game-card-modal')
    const panel = document.querySelector('.game-card-modal-panel')
    const embed = document.querySelector('.day-game-embed--memory-match')
    const pr = phone?.getBoundingClientRect()
  return {
    modal: box(modal),
    panel: box(panel),
    embed: box(embed),
    viewport: { w: window.innerWidth, h: window.innerHeight },
    phoneClient: pr ? { w: Math.round(pr.width), h: Math.round(pr.height) } : null,
  }`))
}

console.log(JSON.stringify(out, null, 2))
await browser.close()