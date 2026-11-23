import { useEffect } from 'react'
import type { WordSearchLevel } from '../data/wordSearchLevels'
import { wordSearchLevelDef } from '../data/wordSearchLevels'
import { WordSearchBoard } from './WordSearchBoard'

export type WordSearchPhase = 'play'

export type WordSearchWinPayload = {
  totalReward: number
  level: WordSearchLevel
}

type Props = {
  level: WordSearchLevel
  sessionKey: string
  onBusyChange?: (busy: boolean) => void
  onWin: (payload: WordSearchWinPayload) => void
}

export function SpecialCardWordSearch({
  level,
  sessionKey,
  onBusyChange,
  onWin,
}: Props) {
  const levelDef = wordSearchLevelDef(level)

  useEffect(() => {
    onBusyChange?.(true)
  }, [onBusyChange, level])

  return (
    <div className="skill-mission skill-mission--embed skill-mission--wordsearch skill-mission--wordsearch-play">
      <WordSearchBoard
        levelDef={levelDef}
        sessionKey={sessionKey}
        onWin={(reward) => {
          onBusyChange?.(false)
          onWin({ totalReward: reward, level })
        }}
      />
    </div>
  )
}