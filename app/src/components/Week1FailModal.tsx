type Props = {
  open: boolean
  eyebrow: string
  message: string
  onRestartWeek1: () => void
  onQuit: () => void
}

export function Week1FailModal({ open, eyebrow, message, onRestartWeek1, onQuit }: Props) {
  if (!open) return null

  return (
    <div
      className="week1-fail-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="week1-fail-title"
    >
      <div className="week1-fail-veil" aria-hidden />
      <div className="week1-fail-center">
        <div className="week1-fail-card">
          <p className="week1-fail-eyebrow">{eyebrow}</p>
          <h2 id="week1-fail-title" className="week1-fail-title">
            Moedas insuficientes
          </h2>
          <p className="week1-fail-message">{message}</p>
          <div className="week1-fail-actions">
            <button type="button" className="week1-fail-btn week1-fail-btn-primary" onClick={onRestartWeek1}>
              Recomeçar a semana 1
            </button>
            <button type="button" className="week1-fail-btn week1-fail-btn-ghost" onClick={onQuit}>
              Desistir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}