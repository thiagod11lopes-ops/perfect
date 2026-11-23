const BG_URL = `${import.meta.env.BASE_URL}assets/gym-cobra-bg.png`;

let img: HTMLImageElement | null = null;
let ready = false;

/** Opacidade da arte (alto = mais visível). */
const IMAGE_ALPHA = 0.2;
/** Vinheta escura leve para a grade continuar legível. */
const VEIL_ALPHA = 0.14;

export function preloadPlayfieldBg(): void {
  if (img) return;
  img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    ready = true;
  };
  img.src = BG_URL;
}

export function isPlayfieldBgReady(): boolean {
  return ready && !!img?.naturalWidth;
}

export function drawPlayfieldBg(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): void {
  if (!ready || !img?.naturalWidth) return;

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(bw / iw, bh / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = bx + (bw - dw) / 2;
  const dy = by + (bh - dh) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(bx, by, bw, bh);
  ctx.clip();

  ctx.globalAlpha = IMAGE_ALPHA;
  ctx.drawImage(img, dx, dy, dw, dh);

  ctx.globalAlpha = VEIL_ALPHA;
  ctx.fillStyle = '#0a0612';
  ctx.fillRect(bx, by, bw, bh);

  ctx.restore();
}