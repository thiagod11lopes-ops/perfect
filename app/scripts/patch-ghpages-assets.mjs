/**
 * Embeds em public/games foram buildados com caminhos absolutos /games/…
 * Reescreve para /perfect/games/… após o build de GitHub Pages.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distGames = path.resolve(__dirname, '../dist/games')
const prefix = process.env.GHPAGES_BASE || '/perfect'

const assetRoot = prefix.endsWith('/') ? `${prefix}games/` : `${prefix}/games/`

function patchFile(filePath) {
  const before = fs.readFileSync(filePath, 'utf8')
  const after = before.replaceAll('/games/', assetRoot)
  if (after !== before) fs.writeFileSync(filePath, after)
}

function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(html?|js|css|json|webmanifest|txt)$/i.test(entry.name)) patchFile(full)
  }
}

walk(distGames)
console.log(`Patched game assets under ${distGames} → ${assetRoot}`)