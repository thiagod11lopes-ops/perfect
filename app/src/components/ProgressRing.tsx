export function ProgressRing({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const r = 42
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="ring-wrap" aria-label={`${pct}%`}>
      <svg width="108" height="108" viewBox="0 0 108 108">
        <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="54"
          cy="54"
          r={r}
          fill="none"
          stroke="url(#orangeGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="orangeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c45700" />
            <stop offset="100%" stopColor="#ff8a1a" />
          </linearGradient>
        </defs>
      </svg>
      <div className="ring-center">
        {pct}%
        {label ? <small>{label}</small> : null}
      </div>
    </div>
  )
}
