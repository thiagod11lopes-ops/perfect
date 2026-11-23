import { chromium } from 'playwright'

const BASE = process.env.PERFECT_URL ?? 'http://127.0.0.1:4173'

async function run(hostW, layoutW) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const html = `<!DOCTYPE html><html><body style="margin:0">
  <div id="host" style="width:${hostW}px;height:700px;overflow:hidden;background:#222">
  <iframe id="fr" width="100%" height="100%" style="border:0" src="${BASE}/games/neonophis/index.html?embed=1&phone=1&gridW=12&gridH=20&targetCoins=10&durationSec=60"></iframe>
  </div></body></html>`
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.evaluate(
    ({ layoutW }) => {
      document.getElementById('fr')?.contentWindow?.postMessage(
        { source: 'perfect-neonophis', type: 'perfect-neonophis:layout', viewW: layoutW, viewH: 680 },
        '*',
      )
    },
    { layoutW },
  )
  await page.waitForTimeout(400)
  const fr = page.frame({ url: /neonophis/ })
  const inner = await fr.evaluate(() => ({
    docW: document.documentElement.clientWidth,
    stageW: document.getElementById('stage')?.clientWidth,
    canvasW: document.getElementById('game-canvas')?.offsetWidth,
  }))
  const hostBox = await page.locator('#host').boundingBox()
  const iframeBox = await page.locator('#fr').boundingBox()
  console.log({ hostW, layoutW, hostBoxW: hostBox?.width, iframeBoxW: iframeBox?.width, inner })
  await browser.close()
}

await run(361, 280)
await run(361, 361)