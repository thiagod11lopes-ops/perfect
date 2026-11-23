/**
 * Mede larguras — simulador /celular Missão de Habilidade.
 * npm run preview -- --port 4173 && node scripts/measure-neonophis-phone.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.PERFECT_URL ?? 'http://127.0.0.1:4173'
const PHONE_CONTENT_W = 361 // .phone-device 375 - 4px*2 padding + rounding

async function measureEmbedPage(page, label, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(800)
  const inFrame = await page.evaluate(() => {
    const stage = document.getElementById('stage')
    const canvas = document.getElementById('game-canvas')
    const q = new URLSearchParams(location.search)
    const gW = Number(q.get('gridW') ?? 12)
    const cellAttr = q.get('cellPx')
    const canvasStyleW = canvas?.style.width ?? ''
    const cw = canvas?.offsetWidth ?? 0
    const sw = stage?.clientWidth ?? 0
    let cellStep = cw / gW
    return {
      docClientW: document.documentElement.clientWidth,
      innerW: window.innerWidth,
      stageClientW: sw,
      stageStyleW: stage?.style.width ?? '',
      canvasOffsetW: cw,
      canvasStyleW,
      gridW: gW,
      phone: q.get('phone'),
      cellPxParam: cellAttr,
      computedCellStep: cellStep,
      fieldPx: cw,
    }
  })
  console.log(`\n=== ${label} ===`)
  console.log(JSON.stringify(inFrame, null, 2))
  return inFrame
}

async function measureIframeWrapper(browser, hostW) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  })
  const html = `<!DOCTYPE html><html><body style="margin:0;background:#333">
  <div id="host" style="width:${hostW}px;height:700px;background:#0f0818">
  <iframe id="fr" style="width:100%;height:100%;border:0" src="${BASE}/games/neonophis/index.html?embed=1&phone=1&gridW=12&gridH=20&targetCoins=10&durationSec=60&lang=pt"></iframe>
  </div></body></html>`
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  // simulate parent layout postMessage
  const fr = page.frameLocator('#fr')
  await page.evaluate(
    ({ hostW }) => {
      const fr = document.getElementById('fr')
      fr?.contentWindow?.postMessage(
        { source: 'perfect-neonophis', type: 'perfect-neonophis:layout', viewW: hostW, viewH: 680 },
        '*',
      )
    },
    { hostW },
  )
  await page.waitForTimeout(400)
  const hostBox = await page.locator('#host').boundingBox()
  const iframeBox = await page.locator('#fr').boundingBox()
  const inner = await fr.locator('body').evaluate(() => {
    const stage = document.getElementById('stage')
    const canvas = document.getElementById('game-canvas')
    return {
      docClientW: document.documentElement.clientWidth,
      stageClientW: stage?.clientWidth ?? 0,
      canvasOffsetW: canvas?.offsetWidth ?? 0,
      canvasStyleW: canvas?.style.width ?? '',
    }
  })
  console.log('\n=== IFRAME IN HOST ' + hostW + 'px (with layout postMessage) ===')
  console.log(
    JSON.stringify({ hostBoxW: hostBox?.width, iframeBoxW: iframeBox?.width, inner }, null, 2),
  )
  await page.close()
  return { hostBoxW: hostBox?.width, iframeBoxW: iframeBox?.width, ...inner }
}

async function main() {
  const browser = await chromium.launch({ headless: true })

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const directUrl = `${BASE}/games/neonophis/index.html?embed=1&phone=1&gridW=12&gridH=20&targetCoins=10&durationSec=60&lang=pt`
  await measureEmbedPage(
    page,
    'Direct embed (viewport ' + PHONE_CONTENT_W + ')',
    directUrl,
  )

  await page.setViewportSize({ width: PHONE_CONTENT_W, height: 812 })
  const directNarrow = await measureEmbedPage(page, 'Direct embed narrow viewport', directUrl)

  await measureIframeWrapper(browser, PHONE_CONTENT_W)

  await page.close()
  await browser.close()

  const ok =
    Math.abs(directNarrow.canvasOffsetW - directNarrow.stageClientW) <= 1 &&
    Math.abs(directNarrow.canvasOffsetW - directNarrow.docClientW) <= 1
  console.log('\n=== PASS direct narrow (canvas≈stage≈doc):', ok, '===')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})