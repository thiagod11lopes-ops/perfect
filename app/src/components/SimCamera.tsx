import { useMemo, useState } from 'react'
import { formatClockTimeWithSeconds } from '../utils/dates'

export type SimCameraScene = 'meal' | 'workout' | 'water' | 'habit'

export function resolveSimScene(card: { kind: string; title: string; challengeId: string }): SimCameraScene {
  const id = `${card.challengeId} ${card.title}`.toLowerCase()
  if (card.kind === 'treino' || id.includes('treino')) return 'workout'
  if (card.kind === 'agua' || id.includes('água') || id.includes('agua')) return 'water'
  if (
    card.kind === 'dieta' ||
    id.includes('almo') ||
    id.includes('jantar') ||
    id.includes('caf') ||
    id.includes('lanche') ||
    id.includes('refei')
  ) {
    return 'meal'
  }
  return 'habit'
}

const sceneCopy: Record<SimCameraScene, { label: string; hint: string }> = {
  meal: { label: 'Simulação · almoço', hint: 'Prato de comida no enquadramento' },
  workout: { label: 'Simulação · treino', hint: 'Halter no enquadramento' },
  water: { label: 'Simulação · água', hint: 'Copo d’água no enquadramento' },
  habit: { label: 'Simulação · hábito', hint: 'Cena de check-in' },
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function paintMeal(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2
  const cy = h * 0.48
  ctx.fillStyle = '#2a2118'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 18, 210, 58, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#d8d0c4'
  ctx.beginPath()
  ctx.ellipse(cx, cy, 200, 200, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f4efe6'
  ctx.beginPath()
  ctx.ellipse(cx, cy, 168, 168, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#6b3b1f'
  ctx.beginPath()
  ctx.ellipse(cx - 40, cy - 10, 70, 48, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3ecf8e'
  ctx.beginPath()
  ctx.ellipse(cx + 55, cy + 20, 55, 40, 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f07000'
  ctx.beginPath()
  ctx.ellipse(cx + 10, cy - 55, 48, 36, 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e8c36a'
  ctx.beginPath()
  ctx.ellipse(cx - 20, cy + 55, 60, 28, 0, 0, Math.PI * 2)
  ctx.fill()
}

function paintWorkout(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2
  const cy = h * 0.48
  ctx.fillStyle = '#1a1a1f'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 110, 160, 28, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#9a9aa3'
  ctx.lineWidth = 28
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - 120, cy)
  ctx.lineTo(cx + 120, cy)
  ctx.stroke()

  ctx.fillStyle = '#3a3a42'
  drawRoundedRect(ctx, cx - 190, cy - 55, 70, 110, 16)
  ctx.fill()
  drawRoundedRect(ctx, cx + 120, cy - 55, 70, 110, 16)
  ctx.fill()
  ctx.fillStyle = '#f07000'
  drawRoundedRect(ctx, cx - 175, cy - 40, 40, 80, 12)
  ctx.fill()
  drawRoundedRect(ctx, cx + 135, cy - 40, 40, 80, 12)
  ctx.fill()
}

function paintWater(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2
  const cy = h * 0.5
  ctx.fillStyle = 'rgba(120, 190, 255, 0.35)'
  drawRoundedRect(ctx, cx - 70, cy - 120, 140, 220, 28)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 6
  drawRoundedRect(ctx, cx - 70, cy - 120, 140, 220, 28)
  ctx.stroke()
  ctx.fillStyle = 'rgba(90, 170, 255, 0.55)'
  drawRoundedRect(ctx, cx - 58, cy - 20, 116, 108, 18)
  ctx.fill()
}

function paintHabit(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2
  const cy = h * 0.46
  ctx.fillStyle = '#2a2a30'
  ctx.beginPath()
  ctx.arc(cx, cy - 40, 70, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3a3a44'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 90, 110, 70, 0, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = '#f07000'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(cx + 90, cy - 90, 36, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx + 76, cy - 90)
  ctx.lineTo(cx + 88, cy - 78)
  ctx.lineTo(cx + 108, cy - 104)
  ctx.stroke()
}

function renderSimPhoto(scene: SimCameraScene, watermark: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 720
  canvas.height = 960
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const g = ctx.createLinearGradient(0, 0, 0, canvas.height)
  g.addColorStop(0, '#1c1612')
  g.addColorStop(1, '#0b0b0c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (scene === 'meal') paintMeal(ctx, canvas.width, canvas.height)
  else if (scene === 'workout') paintWorkout(ctx, canvas.width, canvas.height)
  else if (scene === 'water') paintWater(ctx, canvas.width, canvas.height)
  else paintHabit(ctx, canvas.width, canvas.height)

  // Marca d'água — horário da captura
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  drawRoundedRect(ctx, 24, canvas.height - 92, 280, 56, 14)
  ctx.fill()
  ctx.fillStyle = '#fff8f0'
  ctx.font = '700 28px Manrope, sans-serif'
  ctx.fillText(watermark, 42, canvas.height - 54)
  ctx.font = '600 16px Manrope, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText('Zero ao Topo · prova', 42, canvas.height - 30)

  return canvas.toDataURL('image/jpeg', 0.92)
}

export function SimCamera({
  scene,
  clockDate,
  disabled = false,
  preview,
  onCapture,
  onRetake,
}: {
  scene: SimCameraScene
  clockDate: Date
  disabled?: boolean
  preview: string | null
  onCapture: (dataUrl: string, capturedAt: number) => void
  onRetake: () => void
}) {
  const [flash, setFlash] = useState(false)
  const liveStamp = useMemo(() => formatClockTimeWithSeconds(clockDate), [clockDate])
  const copy = sceneCopy[scene]

  const shoot = () => {
    if (disabled) return
    const stamp = formatClockTimeWithSeconds(clockDate)
    const capturedAt = clockDate.getTime()
    const dataUrl = renderSimPhoto(scene, stamp)
    if (!dataUrl) return
    setFlash(true)
    window.setTimeout(() => setFlash(false), 180)
    onCapture(dataUrl, capturedAt)
  }

  return (
    <div className={`sim-camera scene-${scene}${disabled ? ' is-disabled' : ''}`}>
      <div className="sim-camera-top">
        <span className="sim-camera-badge">{copy.label}</span>
        <span className="sim-camera-clock">{liveStamp}</span>
      </div>

      <div className="sim-camera-viewfinder" aria-label={copy.hint}>
        {preview ? (
          <img className="sim-camera-shot" src={preview} alt="Foto capturada" />
        ) : (
          <div className={`sim-camera-scene sim-scene-${scene}`} aria-hidden>
            {scene === 'meal' ? (
              <div className="sim-plate">
                <span className="sim-food sim-food-a" />
                <span className="sim-food sim-food-b" />
                <span className="sim-food sim-food-c" />
                <span className="sim-food sim-food-d" />
              </div>
            ) : null}
            {scene === 'workout' ? (
              <div className="sim-dumbbell">
                <span className="sim-db-weight left" />
                <span className="sim-db-bar" />
                <span className="sim-db-weight right" />
              </div>
            ) : null}
            {scene === 'water' ? <div className="sim-glass"><span className="sim-liquid" /></div> : null}
            {scene === 'habit' ? (
              <div className="sim-habit">
                <span className="sim-habit-head" />
                <span className="sim-habit-body" />
                <span className="sim-habit-ok" />
              </div>
            ) : null}
            <div className="sim-camera-watermark-live">{liveStamp}</div>
          </div>
        )}
        {flash ? <div className="sim-camera-flash" aria-hidden /> : null}
        <div className="sim-camera-frame" aria-hidden />
      </div>

      <p className="sim-camera-hint muted">{preview ? 'Foto com horário gravado na imagem' : copy.hint}</p>

      <div className="sim-camera-controls">
        {preview ? (
          <button type="button" className="btn btn-ghost btn-block" disabled={disabled} onClick={onRetake}>
            Tirar outra
          </button>
        ) : (
          <button
            type="button"
            className="sim-shutter"
            disabled={disabled}
            onClick={shoot}
            aria-label="Tirar foto"
          >
            <span className="sim-shutter-ring" />
            <span className="sim-shutter-core" />
          </button>
        )}
      </div>
    </div>
  )
}
