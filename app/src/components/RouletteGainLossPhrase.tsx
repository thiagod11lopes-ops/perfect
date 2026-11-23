import type { CSSProperties } from 'react'
import { formatCoins } from '../utils/format'
import { rouletteGainLossCopy, rouletteSpinFlyCopy } from '../data/specialCardRoulette'
import type { CoinCelebrationMode } from './CoinRewardCelebration'

export type RouletteGainLossPhraseVariant = 'celebration' | 'compact' | 'fly' | 'float'

/** `potDelta` = resumo da sessão; `spinFly` = voo por giro no slot. */
export type RouletteGainLossCopyStyle = 'potDelta' | 'spinFly'

type Props = {
  amount: number
  mode: CoinCelebrationMode
  copyStyle?: RouletteGainLossCopyStyle
  /** Delta com sinal — obrigatório em `spinFly` para +/− corretos. */
  signedDelta?: number
  variant?: RouletteGainLossPhraseVariant
  as?: 'span' | 'p' | 'div'
  className?: string
  style?: CSSProperties
}

export function RouletteGainLossPhrase({
  amount,
  mode,
  copyStyle = 'potDelta',
  signedDelta,
  variant = 'celebration',
  as: Tag = 'span',
  className,
  style,
}: Props) {
  const spinFly =
    copyStyle === 'spinFly'
      ? rouletteSpinFlyCopy(signedDelta ?? (mode === 'reward' ? amount : -amount))
      : null
  const isGain = spinFly ? spinFly.mode === 'reward' : mode === 'reward'
  const ariaLabel = spinFly ? spinFly.aria : rouletteGainLossCopy(amount, mode)

  if (spinFly) {
    return (
      <Tag
        className={[
          'roulette-gain-loss-phrase',
          isGain ? 'is-gain' : 'is-loss',
          `roulette-gain-loss-phrase--${variant}`,
          'roulette-gain-loss-phrase--spin-fly',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={style}
      >
        {spinFly.aria}
      </Tag>
    )
  }

  const label = isGain ? 'Ganho de' : 'Perda de'
  const valueText = formatCoins(Math.abs(Math.floor(amount)))

  return (
    <Tag
      className={[
        'roulette-gain-loss-phrase',
        isGain ? 'is-gain' : 'is-loss',
        `roulette-gain-loss-phrase--${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={ariaLabel}
      style={style}
    >
      <span className="roulette-gain-loss-phrase__label">{label}</span>
      <span className="roulette-gain-loss-phrase__value">{valueText}</span>
    </Tag>
  )
}