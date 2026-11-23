#!/usr/bin/env bash
# Regenerates src/styles/fonts.css with base64-inlined woff2 fonts.
# Run after replacing files in assets/src/fonts/.
#
# Sources are downloaded from Google Fonts; both fonts are SIL OFL.

set -euo pipefail

cd "$(dirname "$0")/.."

RUBIK_FILE="assets/src/fonts/rubik-iso-latin.woff2"
BITCOUNT_FILE="assets/src/fonts/bitcount-grid-double-latin.woff2"
OUT="src/styles/fonts.css"

for f in "$RUBIK_FILE" "$BITCOUNT_FILE"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: $f not found. Re-download from Google Fonts." >&2
    exit 1
  fi
done

python3 - <<PYEOF
import base64
rubik = base64.b64encode(open('$RUBIK_FILE', 'rb').read()).decode('ascii')
bitcount = base64.b64encode(open('$BITCOUNT_FILE', 'rb').read()).decode('ascii')

LATIN_RANGE = ("U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, "
               "U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, "
               "U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD")

css = f"""/* fonts.css — generated. Re-run scripts/build-fonts.sh to regenerate. */
/* Sources: assets/src/fonts/*.woff2 — SIL Open Font License */

@font-face {{
  font-family: 'Rubik Iso';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(data:font/woff2;base64,{rubik}) format('woff2');
  unicode-range: {LATIN_RANGE};
}}

@font-face {{
  font-family: 'Bitcount Grid Double';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(data:font/woff2;base64,{bitcount}) format('woff2');
  unicode-range: {LATIN_RANGE};
}}
"""

with open('$OUT', 'w') as f:
    f.write(css)

print(f"Wrote $OUT ({len(css)} bytes)")
PYEOF
