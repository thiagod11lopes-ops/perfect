type NeonophisDumbbellTrackProps = {
  total: number
  collected: number
}

function DumbbellIcon({ lit }: { lit: boolean }) {
  return (
    <svg
      className={`neonophis-dumbbell-slot${lit ? ' neonophis-dumbbell-slot--lit' : ''}`}
      viewBox="0 0 24 16"
      width="100%"
      height="100%"
      aria-hidden
    >
      <rect x="1" y="5.5" width="22" height="5" rx="2.5" fill="currentColor" opacity="0.9" />
      <rect x="0" y="3" width="5.5" height="10" rx="1.5" fill="currentColor" />
      <rect x="18.5" y="3" width="5.5" height="10" rx="1.5" fill="currentColor" />
    </svg>
  )
}

/** Coluna vertical: base da pilha acende com a 1ª coleta (flex column-reverse). */
export function NeonophisDumbbellTrack({ total, collected }: NeonophisDumbbellTrackProps) {
  const slots = Math.max(1, Math.min(24, total))
  return (
    <div
      className="neonophis-dumbbell-track"
      aria-label={`Halteres coletados: ${collected} de ${slots}`}
      role="img"
    >
      {Array.from({ length: slots }, (_, slotFromBottom) => (
        <DumbbellIcon key={slotFromBottom} lit={collected >= slotFromBottom + 1} />
      ))}
    </div>
  )
}