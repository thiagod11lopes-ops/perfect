import { drawNeonText } from '../render/ui';
import { FONT_BODY, FONT_DISPLAY } from '../render/fonts';
import { t } from '../i18n';
import { drawLangToggle } from './langToggle';

export function renderSplash(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  timeMs: number,
): void {
  const isMobile = window.matchMedia('(pointer: coarse)').matches;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "Adriano Franco apresenta" — yellow, small, just above the title
  const titleSize = Math.max(32, Math.min(140, w / 8));
  const presentSize = Math.max(11, Math.min(16, w / 56));
  ctx.font = `${presentSize}px ${FONT_BODY}`;
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = '#ffe855';
  ctx.fillText(t('splash.presents'), w / 2, h * 0.18 - titleSize * 0.55 - presentSize);

  ctx.globalAlpha = 1;

  // Title — wobbles on desktop, static on mobile
  const wob = isMobile ? 0 : Math.sin(timeMs / 240) * 6;
  ctx.font = `${titleSize}px ${FONT_DISPLAY}`;
  drawNeonText(ctx, t('title'), w / 2, h * 0.18 + wob, '#00ffd5');

  ctx.font = `${titleSize * 0.32}px ${FONT_BODY}`;
  ctx.globalAlpha = 0.85;
  drawNeonText(ctx, t('tagline'), w / 2, h * 0.18 + titleSize * 0.65 + wob, '#ff5fae');
  ctx.globalAlpha = 1;

  // Tagline — lower on mobile to clear the JOGAR button (top: 48% + ~76px)
  const taglineY = isMobile ? h * 0.72 : h * 0.55;
  ctx.font = `${Math.max(16, Math.min(26, w / 36))}px ${FONT_BODY}`;
  ctx.globalAlpha = 0.75;
  drawNeonText(ctx, t('splash.eatGrow'), w / 2, taglineY, '#88ddff');
  ctx.globalAlpha = 1;

  // "PRESS ANY KEY" — desktop only (mobile has the DOM button)
  if (!isMobile) {
    const blink = Math.sin(timeMs / 480) > 0;
    if (blink) {
      ctx.font = `${Math.max(13, Math.min(20, w / 56))}px ${FONT_BODY}`;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#fff';
      ctx.fillText(t('splash.pressAnyKey'), w / 2, h * 0.83);
      ctx.globalAlpha = 1;
    }
  }

  drawLangToggle(ctx, w, h, 'splash', timeMs);

  ctx.restore();
}
