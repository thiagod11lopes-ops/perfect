import { createWorker } from 'tesseract.js'

/** Palavras comuns do feed de atividade do Instagram (PT) — não são @. */
const STOP_WORDS = new Set(
  [
    'seguiu',
    'voce',
    'você',
    'vocé',
    'de',
    'volta',
    'automaticamente',
    'comecou',
    'começou',
    'a',
    'seguir',
    'mencionou',
    'um',
    'comentario',
    'comentário',
    'curtiu',
    'sua',
    'publicacao',
    'publicação',
    'foto',
    'story',
    'stories',
    'reels',
    'out',
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'nov',
    'dez',
    'hoje',
    'ontem',
    'seguindo',
    'e',
    'né',
    'ne',
    'é',
    'tt',
    'tk',
    'th',
    'ra',
    'rá',
  ].map((w) => w.toLowerCase()),
)

const ACTION_RE = /\b(seguiu|come[cç]ou|mencionou|curtiu)\b/i
const MENTION_RE = /@([a-z0-9._]{2,30})/gi
const HANDLE_TOKEN_RE = /^[a-z0-9._]{2,30}$/i
const BEFORE_ACTION_RE =
  /([a-z0-9._]+(?:\s+[a-z0-9._]+)?)\s+(?:seguiu|come[cç]ou|mencionou|curtiu)\b/gi

export function normalizeInstaHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, '')
    .replace(/\.+$/g, '')
    .toLowerCase()
}

export function isValidInstaHandle(raw: string): boolean {
  const h = normalizeInstaHandle(raw)
  if (!HANDLE_TOKEN_RE.test(h)) return false
  if (STOP_WORDS.has(h)) return false
  if (/^\d+$/.test(h)) return false
  if (!/[a-z]/i.test(h)) return false
  if (h.length < 3) return false
  // Sufixos típicos de português (OCR pega “automaticamente”, etc.)
  if (/(mente|ção|cao|dade)$/i.test(h) && !/\d|_/.test(h)) return false
  // Fragmentos de data grudados no OCR
  if (/(^|_)(de_)?out(\.|_|$)/i.test(h)) return false
  return true
}

function pushHandle(raw: string, seen: Set<string>, found: string[]) {
  const h = normalizeInstaHandle(raw)
  if (!isValidInstaHandle(h) || seen.has(h)) return
  seen.add(h)
  found.push(h)
}

/** Resolve 1–2 tokens imediatamente antes do verbo da notificação. */
function resolveHandleChunk(chunk: string): string | null {
  const parts = chunk
    .split(/\s+/)
    .map(normalizeInstaHandle)
    .filter(Boolean)
  if (!parts.length) return null

  if (parts.length === 1) {
    return isValidInstaHandle(parts[0]) ? parts[0] : null
  }

  const prev = parts[parts.length - 2]
  const last = parts[parts.length - 1]

  // OCR parte "jean_braga35" → "jean braga35"
  if (
    prev &&
    last &&
    /^[a-z]{2,15}$/i.test(prev) &&
    !STOP_WORDS.has(prev) &&
    /\d/.test(last) &&
    isValidInstaHandle(`${prev}_${last}`)
  ) {
    return `${prev}_${last}`
  }

  if (isValidInstaHandle(last)) return last
  if (isValidInstaHandle(prev)) return prev
  return null
}

/**
 * Extrai handles de um texto OCR de print do Instagram (atividade / seguidores).
 */
export function extractInstaHandlesFromText(text: string): string[] {
  const found: string[] = []
  const seen = new Set<string>()

  // 1) Menções explícitas (@thiago…)
  for (const m of text.matchAll(MENTION_RE)) {
    pushHandle(m[1], seen, found)
  }

  // 2) Handle imediatamente antes do verbo (seguiu / começou / mencionou)
  const flat = text.replace(/\r?\n/g, ' ')
  for (const m of flat.matchAll(BEFORE_ACTION_RE)) {
    const resolved = resolveHandleChunk(m[1])
    if (resolved) pushHandle(resolved, seen, found)
  }

  // 3) Fallback por linha com verbo: primeiro token válido
  for (const line of text.split(/\r?\n/)) {
    const cleaned = line.replace(/[^\w.@\s]/g, ' ').trim()
    if (!cleaned || !ACTION_RE.test(cleaned)) continue
    const first = cleaned.split(/\s+/).find((t) => isValidInstaHandle(t))
    if (first) pushHandle(first, seen, found)
  }

  return found
}

export type OcrProgress = {
  status: string
  progress: number
}

export async function readInstaHandlesFromImage(
  file: File | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<{ handles: string[]; rawText: string }> {
  const worker = await createWorker('por+eng', 1, {
    logger: (m) => {
      if (!onProgress) return
      const progress = typeof m.progress === 'number' ? m.progress : 0
      onProgress({ status: String(m.status ?? ''), progress })
    },
  })

  try {
    const {
      data: { text },
    } = await worker.recognize(file)
    const handles = extractInstaHandlesFromText(text)
    return { handles, rawText: text }
  } finally {
    await worker.terminate()
  }
}
