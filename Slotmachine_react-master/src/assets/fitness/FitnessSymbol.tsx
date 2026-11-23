import React from 'react'
import athleteA from '../images/symbols/athlete-a.png'
import athleteB from '../images/symbols/athlete-b.png'
import bench from '../images/symbols/bench.png'
import bicep from '../images/symbols/bicep.png'
import coinBronze from '../images/symbols/coin-bronze.png'
import coinGold from '../images/symbols/coin-gold.png'
import coinSilver from '../images/symbols/coin-silver.png'
import dumbbell from '../images/symbols/dumbbell.png'
import kettlebell from '../images/symbols/kettlebell.png'
import plate from '../images/symbols/plate.png'
import styles from './FitnessSymbol.module.scss'

type FitnessSymbolProps = {
  animate?: boolean
  src: string
  label: string
}

const FitnessSymbol: React.FC<FitnessSymbolProps> = ({ animate = false, src, label }) => (
  <img
    className={`${styles.symbolImg}${animate ? ` ${styles['symbolImg--animate']}` : ''}`}
    src={src}
    alt={label}
    draggable={false}
  />
)

function createFitnessIcon(src: string, label: string): React.FC<{ animate?: boolean }> {
  const Icon: React.FC<{ animate?: boolean }> = ({ animate }) => (
    <FitnessSymbol animate={animate} src={src} label={label} />
  )
  Icon.displayName = `FitnessIcon(${label})`
  return Icon
}

export const DumbbellIcon = createFitnessIcon(dumbbell, 'Halter')
export const BicepIcon = createFitnessIcon(bicep, 'Bíceps')
export const PlateIcon = createFitnessIcon(plate, 'Anilha')
export const KettlebellIcon = createFitnessIcon(kettlebell, 'Kettlebell')
export const BenchIcon = createFitnessIcon(bench, 'Banco')
export const AthleteAIcon = createFitnessIcon(athleteA, 'Atleta')
export const AthleteBIcon = createFitnessIcon(athleteB, 'Campeão')
export const CoinBronzeIcon = createFitnessIcon(coinBronze, 'Moeda Bronze')
export const CoinSilverIcon = createFitnessIcon(coinSilver, 'Moeda Prata')
export const CoinGoldIcon = createFitnessIcon(coinGold, 'Moeda Ouro')
/** @deprecated use CoinGoldIcon */
export const CoinIcon = CoinGoldIcon
