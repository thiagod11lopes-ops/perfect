export type AiVerdict = {
  approved: boolean
  confidence: number
  message: string
}

/**
 * Simulação da IA de verificação de foto dos desafios.
 * A integração real será instalada depois — por enquanto sempre analisa
 * a imagem enviada e retorna um veredito plausível após um atraso.
 */
export async function simulateChallengeAi(input: {
  challengeTitle: string
  photoDataUrl: string
  fileName?: string
  capturedAt?: number
}): Promise<AiVerdict> {
  const delay = 1400 + Math.floor(Math.random() * 900)
  await new Promise((r) => setTimeout(r, delay))

  const sizeApprox = input.photoDataUrl.length
  const looksLikeImage = input.photoDataUrl.startsWith('data:image/')

  if (!looksLikeImage || sizeApprox < 800) {
    return {
      approved: false,
      confidence: 0.18,
      message: 'IA simulada: a imagem não parece válida. Envie outra foto mais nítida.',
    }
  }

  const confidence = Math.min(0.96, 0.82 + (sizeApprox % 14) / 100)

  const stamp =
    typeof input.capturedAt === 'number'
      ? new Date(input.capturedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : null

  return {
    approved: true,
    confidence,
    message: stamp
      ? `IA simulada: evidência aceita para “${input.challengeTitle}” · captura ${stamp} (confiança ${Math.round(confidence * 100)}%).`
      : `IA simulada: evidência aceita para “${input.challengeTitle}” (confiança ${Math.round(confidence * 100)}%).`,
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Falha ao ler a imagem'))
    reader.readAsDataURL(file)
  })
}
