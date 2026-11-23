// Font specs shared by all canvas renderers. Loaded via src/styles/fonts.css.
// Headings get the 3D arcade Rubik Iso; HUD/body uses pixel-grid Bitcount.

export const FONT_DISPLAY = '"Rubik Iso", "Bitcount Grid Double", monospace';
export const FONT_BODY    = '"Bitcount Grid Double", "Rubik Iso", monospace';

/**
 * Force-load both fonts so the canvas can render them on the very first frame.
 * Without this, `ctx.fillText` falls back to the system font until something in
 * the DOM uses the @font-face — and Canvas2D doesn't trigger font loading on its
 * own. Resolves once both fonts are usable, or after a short timeout.
 */
export async function ensureFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load("16px 'Rubik Iso'"),
        document.fonts.load("16px 'Bitcount Grid Double'"),
      ]),
      new Promise(resolve => setTimeout(resolve, 1500)),
    ]);
  } catch {
    // ignore — fall back to system mono.
  }
}
