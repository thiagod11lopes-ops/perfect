import { formatCoins } from '../utils/format'

/** Aposta permitida na carta especial (roleta). */
export type SpecialRouletteStake = 30 | 60 | 90

export const SPECIAL_ROULETTE_STAKES: SpecialRouletteStake[] = [30, 60, 90]

export type SpecialRouletteRng = () => number

/** Combinação horizontal na grade 5×3 (0–2 = perda; 3–5 = pagamentos 1×–3× o segmento). */
export type HorizontalMatchLength = 0 | 1 | 2 | 3 | 4 | 5

export type SpecialRouletteOutcome = {
  stake: SpecialRouletteStake
  kind: 'win' | 'loss'
  /** Valor exibido por “degrau” em cada rolo (10 / 20 / 30). */
  segmentIncrement: 10 | 20 | 30
  /** Moedas ganhas no giro (0 em perda). */
  spinAmounts: [number, number, number]
  /** Símbolos iguais na linha horizontal em cada giro. */
  spinHorizontalMatches: [HorizontalMatchLength, HorizontalMatchLength, HorizontalMatchLength]
  /** Pote final após os 3 giros. */
  prizeTotal: number
  /** Penalidade extra em derrota (10). */
  extraLoss: number
  /** Variação líquida total: prizeTotal − stake − extraLoss. */
  netCoins: number
  /** Por giro: −seg (0–2), +1×seg (3), +2×seg (4), +3×seg (5). */
  spinPotDeltas: [number, number, number]
}

export function segmentIncrementForStake(stake: SpecialRouletteStake): 10 | 20 | 30 {
  return (stake / 3) as 10 | 20 | 30
}

/** Copy das animações de moeda: "Ganho de 30" / "Perda de 10". */
export function rouletteGainLossCopy(
  amount: number,
  mode: 'reward' | 'penalty',
): string {
  const n = Math.abs(Math.floor(amount))
  return mode === 'reward' ? `Ganho de ${formatCoins(n)}` : `Perda de ${formatCoins(n)}`
}

/** Texto no voo por giro: "Você ganhou +30" / "Você perdeu −10". */
export function rouletteSpinFlyCopy(
  signedDelta: number,
): { mode: 'reward' | 'penalty'; label: string; value: string; aria: string } {
  const n = Math.abs(Math.floor(signedDelta))
  const isGain = signedDelta >= 0
  const label = isGain ? 'Você ganhou' : 'Você perdeu'
  const value = `${isGain ? '+' : '-'}${formatCoins(n)}`
  return {
    mode: isGain ? 'reward' : 'penalty',
    label,
    value,
    aria: `${label} ${value}`,
  }
}

/** Alinha sinal do pote com vitória/perda visual do embed (evita “Perda” em ganhos). */
export function spinFlySignedDelta(
  outcome: SpecialRouletteOutcome,
  spinIndex: number,
  embed?: { isWin?: boolean; spinAmount?: number },
): number {
  const fromOutcome = spinPotDeltaForIndex(outcome, spinIndex)
  if (embed?.isWin === true) {
    const mag =
      (embed.spinAmount != null && embed.spinAmount > 0
        ? Math.floor(embed.spinAmount)
        : Math.abs(fromOutcome)) || 0
    return mag > 0 ? mag : fromOutcome
  }
  if (embed?.isWin === false) {
    const mag = Math.abs(fromOutcome) || Math.abs(Math.floor(embed.spinAmount ?? 0))
    return mag > 0 ? -mag : fromOutcome
  }
  return fromOutcome
}

function randomInt(rng: SpecialRouletteRng, min: number, max: number): number {
  const lo = Math.ceil(min)
  const hi = Math.floor(max)
  if (hi < lo) return lo
  return lo + Math.floor(rng() * (hi - lo + 1))
}

/** Variação do pote por comprimento da combinação horizontal. */
export function potDeltaForHorizontalMatch(
  match: HorizontalMatchLength,
  seg: 10 | 20 | 30,
): number {
  if (match <= 2) return -seg
  if (match === 3) return seg
  if (match === 4) return seg * 2
  return seg * 2
}

/** Distribuição aleatória de combinações por giro. */
export function randomHorizontalMatchForSpin(rng: SpecialRouletteRng): HorizontalMatchLength {
  const roll = rng()
  if (roll < 0.2) return 0
  if (roll < 0.32) return 1
  if (roll < 0.44) return 2
  if (roll < 0.64) return 3
  if (roll < 0.84) return 4
  return 5
}

function randomLosingHorizontalMatch(rng: SpecialRouletteRng): 0 | 1 | 2 {
  return randomInt(rng, 0, 2) as 0 | 1 | 2
}

const spinDeltasForStake = (stake: SpecialRouletteStake): number[] => {
  const seg = segmentIncrementForStake(stake)
  return [-seg, seg, seg * 2, seg * 3]
}

/** Valores possíveis do pote da roleta após N giros (deltas −seg … +3×seg por giro). */
export function allowedRoulettePotValues(stake: SpecialRouletteStake, spinsDone = 3): number[] {
  const deltas = spinDeltasForStake(stake)
  let current = new Set<number>([stake])
  for (let spin = 0; spin < spinsDone; spin++) {
    const next = new Set<number>()
    for (const pot of current) {
      for (const d of deltas) {
        next.add(Math.max(0, pot + d))
      }
    }
    current = next
  }
  return [...current].sort((a, b) => a - b)
}

export function isAllowedRoulettePot(value: number, stake: SpecialRouletteStake): boolean {
  const v = Math.floor(value)
  return allowedRoulettePotValues(stake, 3).includes(v)
}

export function spinPotDeltasForOutcome(
  outcome: SpecialRouletteOutcome,
): [number, number, number] {
  return outcome.spinPotDeltas
}

export function spinPotDeltaForIndex(outcome: SpecialRouletteOutcome, spinIndex: number): number {
  const i = Math.max(0, Math.min(2, Math.floor(spinIndex)))
  return outcome.spinPotDeltas[i]
}

export function applySpinToRoulettePot(
  pot: number,
  delta: number,
  stake: SpecialRouletteStake,
): number {
  const next = Math.max(0, Math.floor(pot) + Math.floor(delta))
  if (!isAllowedRoulettePot(next, stake) && import.meta.env.DEV) {
    console.warn('[special-card-roulette] pote fora da grade de combinações', { pot, delta, next, stake })
  }
  return next
}

export function finalPotTotalForOutcome(outcome: SpecialRouletteOutcome): number {
  let pot: number = outcome.stake
  for (const d of outcome.spinPotDeltas) {
    pot = Math.max(0, pot + d)
  }
  if (pot !== outcome.prizeTotal && import.meta.env.DEV) {
    console.warn('[special-card-roulette] prizeTotal ≠ pote final', {
      prizeTotal: outcome.prizeTotal,
      pot,
    })
  }
  return Math.max(0, Math.floor(pot))
}

/** Moedas creditadas no saldo em FINISH (pote restante − extra, se couber). */
export function rouletteWalletCredit(
  coinsBeforeFinish: number,
  outcome: SpecialRouletteOutcome,
): number {
  const potReturn = finalPotTotalForOutcome(outcome)
  const extraDebit = Math.min(Math.max(0, coinsBeforeFinish), outcome.extraLoss)
  return Math.max(0, potReturn - extraDebit)
}

/** Saldo global após FINISH_GAME_ROULETTE (stake já saiu em START). */
export function rouletteWalletAfterSettle(
  coinsBeforeFinish: number,
  outcome: SpecialRouletteOutcome,
): number {
  return Math.max(
    0,
    Math.floor(coinsBeforeFinish) + rouletteWalletCredit(coinsBeforeFinish, outcome),
  )
}

/** Resumo da sessão: variação do pote vs aposta e impacto no saldo. */
export function sessionSummaryDisplayForOutcome(outcome: SpecialRouletteOutcome): {
  potReturn: number
  potDelta: number
  walletDelta: number
  amount: number
  mode: 'reward' | 'penalty'
} {
  const potReturn = finalPotTotalForOutcome(outcome)
  const potDelta = potReturn - outcome.stake
  const walletDelta = potDelta - outcome.extraLoss
  const amount = Math.abs(walletDelta)

  const mode: 'reward' | 'penalty' =
    walletDelta > 0 ? 'reward' : walletDelta < 0 ? 'penalty' : potDelta >= 0 ? 'reward' : 'penalty'
  return { potReturn, potDelta, walletDelta, amount, mode }
}

/** Card pós-3 giros: lucro/prejuízo líquido (ex. pote 90 − aposta 60 = +30). */
export function rouletteSessionCongratsCopy(outcome: SpecialRouletteOutcome): {
  title: string
  subcopy: string
  netAmount: number
  potReturn: number
  mode: 'reward' | 'penalty'
} {
  const { potReturn, walletDelta, amount } = sessionSummaryDisplayForOutcome(outcome)
  const netAbs = amount

  if (walletDelta > 0) {
    return {
      title: `Parabéns! Você ganhou ${formatCoins(walletDelta)} moedas`,
      subcopy: 'Lucro líquido nesta sessão de roleta',
      netAmount: netAbs,
      potReturn,
      mode: 'reward',
    }
  }
  if (walletDelta < 0) {
    return {
      title: `Você perdeu ${formatCoins(netAbs)} moedas`,
      subcopy:
        outcome.extraLoss > 0
          ? `Aposta ${formatCoins(outcome.stake)} + penalidade ${formatCoins(outcome.extraLoss)}`
          : 'Resultado líquido da sessão',
      netAmount: netAbs,
      potReturn,
      mode: 'penalty',
    }
  }
  return {
    title: 'Sessão encerrada sem lucro nem prejuízo',
    subcopy: 'Saldo da sessão devolvido ao saldo principal',
    netAmount: 0,
    potReturn,
    mode: 'reward',
  }
}

/** Ganho líquido máximo vs carteira antes da aposta (pote final − stake − extra). */
export const ROULETTE_MAX_WALLET_NET_GAIN = 80

/** Teto de perda somada nos 3 giros da sessão ruim (~10%). */
export const BAD_SESSION_MAX_SPIN_LOSS_TOTAL = 10

/** Teto de perda líquida vs carteira antes da aposta (stake − pote + extra). */
export const BAD_SESSION_MAX_WALLET_NET_LOSS = 10

/**
 * Reduz perdas por giro para que |Σ deltas negativos| ≤ `maxTotalLoss`.
 * Só para sessão ruim; preserva sinais não-negativos se houver.
 */
export function capBadSessionSpinLossTotal(
  deltas: [number, number, number],
  rng: SpecialRouletteRng,
  maxTotalLoss: number = BAD_SESSION_MAX_SPIN_LOSS_TOTAL,
): [number, number, number] {
  const lossMag = deltas.reduce((sum, d) => (d < 0 ? sum - d : sum), 0)
  if (lossMag <= maxTotalLoss) return deltas

  const [a, b, c] = splitPrizeAcrossThreeSpins(rng, maxTotalLoss)
  return [-a, -b, -c]
}

/** Perda líquida da sessão vs carteira imediatamente antes de `START_GAME_ROULETTE_POT`. */
export function rouletteNetLossVsPreStakeWallet(outcome: SpecialRouletteOutcome): number {
  const potReturn = finalPotTotalForOutcome(outcome)
  return Math.max(0, outcome.stake - potReturn + outcome.extraLoss)
}

/** `extraLoss` da sessão ruim, para stake − pote + extra ≤ teto. */
export function badSessionExtraLossForPotReturn(
  stake: SpecialRouletteStake,
  prizeTotal: number,
  maxNetLoss: number = BAD_SESSION_MAX_WALLET_NET_LOSS,
): number {
  const potLoss = Math.max(0, stake - Math.max(0, Math.floor(prizeTotal)))
  return Math.max(0, Math.min(maxNetLoss, maxNetLoss - potLoss))
}

function buildBadSessionOutcome(
  stake: SpecialRouletteStake,
  matches: [HorizontalMatchLength, HorizontalMatchLength, HorizontalMatchLength],
  rng: SpecialRouletteRng,
): SpecialRouletteOutcome {
  const segmentIncrement = segmentIncrementForStake(stake)
  const rawDeltas = matches.map((m) =>
    potDeltaForHorizontalMatch(m, segmentIncrement),
  ) as [number, number, number]
  const spinPotDeltas = capBadSessionSpinLossTotal(rawDeltas, rng)

  let prizeTotal: number = stake
  for (const d of spinPotDeltas) {
    prizeTotal = Math.max(0, prizeTotal + d)
  }

  const extraLoss = badSessionExtraLossForPotReturn(stake, prizeTotal)
  const outcome = finalizeOutcomeFromMatches(stake, matches, extraLoss, spinPotDeltas, 'loss')

  if (import.meta.env?.DEV && rouletteNetLossVsPreStakeWallet(outcome) > BAD_SESSION_MAX_WALLET_NET_LOSS) {
    console.warn('[special-card-roulette] sessão ruim excede teto de perda', {
      stake,
      prizeTotal: outcome.prizeTotal,
      extraLoss: outcome.extraLoss,
      net: rouletteNetLossVsPreStakeWallet(outcome),
    })
  }

  return outcome
}

/** Particiona `total` em 3 inteiros ≥ 0 que somam `total`. */
export function splitPrizeAcrossThreeSpins(
  rng: SpecialRouletteRng,
  total: number,
): [number, number, number] {
  if (total <= 0) return [0, 0, 0]
  if (total === 1) return [1, 0, 0]
  if (total === 2) return [1, 1, 0]
  const a = randomInt(rng, 1, total - 2)
  const b = randomInt(rng, 1, total - a - 1)
  const c = total - a - b
  return [a, b, c]
}

function finalizeOutcomeFromMatches(
  stake: SpecialRouletteStake,
  matches: [HorizontalMatchLength, HorizontalMatchLength, HorizontalMatchLength],
  extraLoss: number,
  spinPotDeltas: [number, number, number],
  kindOverride?: 'win' | 'loss',
): SpecialRouletteOutcome {
  const segmentIncrement = segmentIncrementForStake(stake)

  let prizeTotal: number = stake
  for (const d of spinPotDeltas) {
    prizeTotal = Math.max(0, prizeTotal + d)
  }

  const spinAmounts = spinPotDeltas.map((d) => Math.max(0, d)) as [number, number, number]
  let netCoins = prizeTotal - stake - extraLoss
  if (extraLoss === 0 && netCoins > ROULETTE_MAX_WALLET_NET_GAIN) {
    prizeTotal = stake + ROULETTE_MAX_WALLET_NET_GAIN
    netCoins = ROULETTE_MAX_WALLET_NET_GAIN
  }
  const kind: 'win' | 'loss' =
    kindOverride ?? (netCoins >= 0 && extraLoss === 0 ? 'win' : 'loss')

  return {
    stake,
    kind,
    segmentIncrement,
    spinAmounts,
    spinHorizontalMatches: matches,
    prizeTotal,
    extraLoss,
    netCoins,
    spinPotDeltas,
  }
}

function buildOutcomeFromMatches(
  stake: SpecialRouletteStake,
  matches: [HorizontalMatchLength, HorizontalMatchLength, HorizontalMatchLength],
  extraLoss: number,
): SpecialRouletteOutcome {
  const segmentIncrement = segmentIncrementForStake(stake)
  const spinPotDeltas = matches.map((m) =>
    potDeltaForHorizontalMatch(m, segmentIncrement),
  ) as [number, number, number]
  return finalizeOutcomeFromMatches(stake, matches, extraLoss, spinPotDeltas)
}

/**
 * Economia da roleta: 3 giros com combinações horizontais aleatórias.
 * 0–2 símbolos → −segmento; 3 → +1×; 4 → +2×; 5 → +3× (segmento 10/20/30).
 * ~10% sessões ruins: três perdas; perda líquida total ≤ 10 moedas.
 */
export function resolveSpecialCardRoulette(
  stake: SpecialRouletteStake,
  rng: SpecialRouletteRng,
  options?: { forceBadSession?: boolean },
): SpecialRouletteOutcome {
  const isBadSession = options?.forceBadSession === true || rng() < 0.1

  if (isBadSession) {
    const matches: [HorizontalMatchLength, HorizontalMatchLength, HorizontalMatchLength] = [
      randomLosingHorizontalMatch(rng),
      randomLosingHorizontalMatch(rng),
      randomLosingHorizontalMatch(rng),
    ]
    return buildBadSessionOutcome(stake, matches, rng)
  }

  const matches: [HorizontalMatchLength, HorizontalMatchLength, HorizontalMatchLength] = [
    randomHorizontalMatchForSpin(rng),
    randomHorizontalMatchForSpin(rng),
    randomHorizontalMatchForSpin(rng),
  ]
  return buildOutcomeFromMatches(stake, matches, 0)
}

export function canAffordStake(balance: number, stake: SpecialRouletteStake): boolean {
  return balance >= stake
}