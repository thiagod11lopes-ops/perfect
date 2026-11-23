#!/usr/bin/env bash
# Regenerates public/icons/* (PWA manifest icons + favicon) from the master
# glyph. Run after changing the icon: npm run assets
#
# WHY ImageMagick MVG and not the SVG: this environment has no SVG
# rasterizer with gradient support (no rsvg-convert / inkscape / cairosvg),
# and ImageMagick's internal SVG renderer drops the Bézier path entirely.
# So the icon is rebuilt from ImageMagick native vector ops + a native
# gradient — fully deterministic, pure IM (CLAUDE.md §7.2). The geometry
# below mirrors assets/src/icon.svg, which stays the human-readable
# source-of-truth and is the same neon S-curve inlined as the favicon in
# index.html.

set -euo pipefail

cd "$(dirname "$0")/.."

command -v magick >/dev/null 2>&1 || {
  echo "ERROR: ImageMagick (magick) not found." >&2
  exit 1
}

OUT="public/icons"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Geometry — mirrors assets/src/icon.svg (viewBox 0 0 512 512).
PATH_D='M96,256 Q96,144 208,144 Q320,144 320,256 Q320,368 432,368'
STROKE_W=64
BG='#0a0420'
RX=96
EYE_CX=416
EYE_CY=352
EYE_R=24
C0='#00ffd5'   # gradient stop 0 — cyan, at path bbox top-left
C1='#ff00ff'   # gradient stop 1 — magenta, at path bbox bottom-right
OPT=(-strip -define png:compression-level=9 -define png:compression-filter=5)

# 1. Stroke mask: white snake on black.
magick -size 512x512 xc:black -fill none -stroke white -strokewidth "$STROKE_W" \
  -draw "stroke-linecap round path '$PATH_D'" "$TMP/mask.png"

# 2. Gradient corner-to-corner across the stroke's own bounding box. This
#    reproduces the SVG objectBoundingBox linearGradient (x1,y1=0 ->
#    x2,y2=1): the full cyan->magenta ramp maps across the glyph itself,
#    not a thin slice of a canvas-wide gradient.
BB=$(magick "$TMP/mask.png" -format '%@' info:)   # WxH+X+Y of the stroke
W=${BB%%x*}; rest=${BB#*x}; H=${rest%%+*}; rest=${rest#*+}
X=${rest%%+*}; Y=${rest#*+}
X2=$((X + W))
Y2=$((Y + H))
magick -size 512x512 xc: -sparse-color barycentric \
  "$X,$Y $C0 $X2,$Y2 $C1" "$TMP/grad.png"

# 3. Dark rounded-rect bg + gradient-filled snake + white eye.
magick -size 512x512 xc:none -fill "$BG" \
  -draw "roundrectangle 0,0 511,511 $RX,$RX" "$TMP/bg.png"
magick "$TMP/grad.png" "$TMP/mask.png" -alpha off \
  -compose CopyOpacity -composite "$TMP/snake.png"
magick "$TMP/bg.png" "$TMP/snake.png" -compose over -composite \
  -fill white -stroke none \
  -draw "circle $EYE_CX,$EYE_CY $EYE_CX,$((EYE_CY + EYE_R))" "$TMP/icon.png"

# 4. Emit outputs. PNG8 palette: the art is a dark field + smooth gradient
#    stroke + white dot, so 256 colors is visually lossless and tiny.
magick "$TMP/icon.png" -colors 256 -depth 8 "${OPT[@]}" "$OUT/icon-512.png"
magick "$TMP/icon.png" -resize 192x192 -colors 256 -depth 8 "${OPT[@]}" \
  "$OUT/icon-192.png"
# Maskable: full-bleed dark square, glyph at ~70% inside the Android
# adaptive-icon safe zone (OS applies its own mask/rounding).
magick -size 512x512 xc:"$BG" \( "$TMP/icon.png" -resize 358x358 \) \
  -gravity center -compose over -composite -colors 256 -depth 8 \
  "${OPT[@]}" "$OUT/icon-512-maskable.png"
# apple-touch: opaque, no alpha (iOS strips alpha and rounds corners itself).
magick "$TMP/icon.png" -resize 180x180 -background "$BG" \
  -alpha remove -alpha off -colors 256 -depth 8 "${OPT[@]}" \
  "$OUT/apple-touch-icon.png"
# favicon.ico — multi-res 16/32/48 (the primary favicon is the inline SVG
# in index.html; this is the legacy fallback).
for s in 16 32 48; do
  magick "$TMP/icon.png" -resize ${s}x${s} -colors 256 -depth 8 \
    "$TMP/fav-$s.png"
done
magick "$TMP/fav-16.png" "$TMP/fav-32.png" "$TMP/fav-48.png" \
  "$OUT/favicon.ico"

# 5. Budget guard — CLAUDE.md §7.5: <= 50 KB of pre-rendered assets total.
TOTAL=$(cat "$OUT"/icon-512.png "$OUT"/icon-192.png \
  "$OUT"/icon-512-maskable.png "$OUT"/apple-touch-icon.png \
  "$OUT"/favicon.ico | wc -c)
echo "Generated $OUT/:"
ls -l "$OUT" | awk 'NR>1 {printf "  %-26s %6d B\n", $9, $5}'
echo "Total: $TOTAL bytes ($((TOTAL / 1024)) KB) — budget 51200 (50 KB)"
if [ "$TOTAL" -gt 51200 ]; then
  echo "ERROR: assets exceed 50 KB (§7.5). Reduce -colors or sizes." >&2
  exit 1
fi
