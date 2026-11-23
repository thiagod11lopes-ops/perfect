import { CoinIcon } from './CoinIcon'
import { WORD_SEARCH_LEVELS, type WordSearchLevel } from '../data/wordSearchLevels'

type Props = {
  onPickLevel: (level: WordSearchLevel) => void
}

/** Escolha de nível em tela cheia (modal), não no verso da carta. */
export function SpecialCardWordSearchIntro({ onPickLevel }: Props) {
  return (
    <div className="skill-mission skill-mission--intro skill-mission--wordsearch skill-mission--wordsearch-intro">
      <p className="skill-mission-lead">
        Encontre os nomes dos exercícios na grade. Escolha o nível:
      </p>
      <div className="wordsearch-level-pick memory-level-pick">
        {WORD_SEARCH_LEVELS.map((lv) => (
          <button
            key={lv.level}
            type="button"
            className="wordsearch-level-pick-btn memory-level-pick-btn"
            onClick={() => onPickLevel(lv.level)}
          >
            <span className="memory-level-pick-num">{lv.wordCount} palavras</span>
            <span className="memory-level-pick-meta">
              +{lv.reward} <CoinIcon size={18} />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}