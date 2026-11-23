import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const dist = resolve(appRoot, '../workout-vision-main/dist')
const target = resolve(appRoot, 'public/games/workout-vision')

if (!existsSync(dist)) {
  console.error('Build workout-vision first: npm run build:workout-vision (with VITE_BASE=/games/workout-vision/)')
  process.exit(1)
}

if (existsSync(target)) rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
cpSync(dist, target, { recursive: true })
console.log(`Synced ${dist} -> ${target}`)