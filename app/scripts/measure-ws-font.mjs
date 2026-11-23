import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
})
const page = await context.newPage()
await page.addInitScript(() => {
  localStorage.setItem(
    'zero-ao-topo-mvp-v1',
    JSON.stringify({
      onboardingComplete: true,
      acceptedRules: true,
      devMode: true,
      profile: {
        name: 'Test',
        birthDate: '1994-01-01',
        age: '30',
        sex: 'F',
        weight: '70',
        height: '170',
        goalKg: '5',
        health: '',
        meds: '',
        allergies: '',
      },
      coins: 100,
    }),
  )
})
await page.goto('http://127.0.0.1:5173/celular', { waitUntil: 'load', timeout: 60000 })
for (let i = 0; i < 5 && (await page.locator('.celular-intro').count()); i++) {
  await page.locator('.celular-intro').click()
  await page.waitForTimeout(1000)
}
await page.waitForSelector('.phone-device', { timeout: 30000 })
await page.locator('.phone-app .deck-card.is-day-challenge', { hasText: 'Caça-palavras' }).first().click()
await page.waitForTimeout(500)
await page.locator('.wordsearch-level-pick-btn').nth(2).click()
await page.waitForTimeout(2500)
const sizes = await page.evaluate(() => {
  const cell = document.querySelector('.phone-app .wordsearch-cell.is-settled')
  const item = document.querySelector('.phone-app .wordsearch-list-item span:last-child')
  const fs = (el) => (el ? getComputedStyle(el).fontSize : null)
  return { cell: fs(cell), list: fs(item), inline: item?.getAttribute('style') }
})
console.log(JSON.stringify(sizes, null, 2))
await browser.close()