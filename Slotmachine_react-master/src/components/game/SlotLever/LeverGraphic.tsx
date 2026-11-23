/** Alavanca vetorial — a base fica coberta pela roleta (z-index menor). */
const LeverGraphic: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 320"
    fill="none"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="lvGoldX" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#6b4200" />
        <stop offset="18%" stopColor="#c99210" />
        <stop offset="45%" stopColor="#ffe9a0" />
        <stop offset="70%" stopColor="#e0b020" />
        <stop offset="100%" stopColor="#5a3800" />
      </linearGradient>
      <linearGradient id="lvGoldY" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffe27a" />
        <stop offset="45%" stopColor="#e8b423" />
        <stop offset="100%" stopColor="#8a5a00" />
      </linearGradient>
      <radialGradient id="lvKnob" cx="34%" cy="28%" r="68%">
        <stop offset="0%" stopColor="#555" />
        <stop offset="40%" stopColor="#1c1c1c" />
        <stop offset="100%" stopColor="#000" />
      </radialGradient>
      <radialGradient id="lvBaseFace" cx="40%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#fff0a8" />
        <stop offset="55%" stopColor="#e0a818" />
        <stop offset="100%" stopColor="#7a4e00" />
      </radialGradient>
    </defs>

    {/* Base — fica atrás da roleta */}
    <ellipse cx="18" cy="278" rx="26" ry="28" fill="url(#lvGoldY)" />
    <ellipse cx="18" cy="278" rx="18" ry="20" fill="url(#lvBaseFace)" />
    <ellipse cx="18" cy="278" rx="9" ry="10" fill="#5a3800" opacity="0.45" />

    {/* Haste */}
    <path
      d="M28 274
         C34 230 48 168 58 112
         C60 98 62 88 64 76
         L76 80
         C74 92 72 102 70 116
         C60 172 46 232 40 276
         Z"
      fill="url(#lvGoldX)"
    />
    <path
      d="M42 258 C50 208 60 152 70 100"
      stroke="#fff6c8"
      strokeWidth="2.8"
      strokeLinecap="round"
      opacity="0.5"
    />

    {/* Knob preto */}
    <circle cx="72" cy="54" r="32" fill="url(#lvKnob)" />
    <ellipse cx="60" cy="40" rx="11" ry="8" fill="#fff" opacity="0.32" />
  </svg>
)

export { LeverGraphic }
