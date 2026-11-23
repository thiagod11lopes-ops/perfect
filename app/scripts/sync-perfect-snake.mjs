import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const dist = resolve(appRoot, '../perfect-snake-phone/dist')
const target = resolve(appRoot, 'public/games/perfect-snake')

if (!existsSync(dist)) {
  console.error('Build perfect-snake first: npm run build:perfect-snake')
  process.exit(1)
}

if (existsSync(target)) rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
cpSync(dist, target, { recursive: true })

const indexHtml = readFileSync(resolve(dist, 'index.html'), 'utf8')
const jsMatch = indexHtml.match(/assets\/index-([A-Za-z0-9_-]+)\.js/)
const buildId = jsMatch?.[1] ?? String(Date.now())
writeFileSync(resolve(target, 'embed-build-id.txt'), `${buildId}\n`, 'utf8')

console.log(`Synced ${dist} -> ${target} (build ${buildId})`)