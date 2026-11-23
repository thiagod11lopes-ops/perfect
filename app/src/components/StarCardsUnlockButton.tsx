type StarCardsUnlockButtonProps = {
  onClick: () => void
}

/** Botão para liberar visualmente as cartas-estrela (após check-in + 2h). */
export function StarCardsUnlockButton({ onClick }: StarCardsUnlockButtonProps) {
  return (
    <div className="deck-stars-unlock-wrap">
      <button type="button" className="deck-stars-unlock-btn" onClick={onClick}>
        <span className="deck-stars-unlock-shine" aria-hidden />
        <span className="deck-stars-unlock-text">Cartas extras liberadas</span>
      </button>
    </div>
  )
}