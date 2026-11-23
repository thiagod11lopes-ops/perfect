import {
  AthleteAIcon,
  AthleteBIcon,
  BenchIcon,
  BicepIcon,
  CoinBronzeIcon,
  CoinGoldIcon,
  CoinSilverIcon,
  DumbbellIcon,
  KettlebellIcon,
  PlateIcon,
} from '@/assets/fitness/FitnessSymbol'
import { Color, Symbol, SymbolType, PayLine, PayLineType } from '@/types';
import { PERFECT_EMBED_ANIM_PACE } from '@/embed/perfectEmbed';

const WIN_FACTORS: Readonly<{ [key: string]: number[] }> = {
  VERY_LOW: [1, 5, 20],
  LOW: [1, 8, 30],
  MEDIUM: [6, 20, 150],
  HIGH: [8, 80, 400],
  VERY_HIGH: [20, 200, 1000],
};

/** Wildcard especial (substitui outros símbolos). */
export const WILDCARD_METADATA: Readonly<Omit<Symbol, 'id'>> = {
  type: SymbolType.TYPESCRIPT,
  icon: AthleteBIcon,
};

/** Scatter — giros grátis. */
export const SCATTER_METADATA: Readonly<Omit<Symbol, 'id'>> = {
  type: SymbolType.JAVASCRIPT,
  icon: AthleteAIcon,
};

/** Explosive — bônus de wildcards. */
export const EXPLOSIVE_METADATA: Readonly<Omit<Symbol, 'id'>> = {
  type: SymbolType.VITE,
  icon: KettlebellIcon,
};

/**
 * Símbolos da roleta: academia + moedas Perfect Body (bronze / prata / ouro).
 * Tipos raros antigos ficam com frequency 0 para não poluir o visual.
 */
export const SYMBOLS_METADATA: Readonly<{ [key in SymbolType]: Omit<Symbol, 'id'> }> = {
  [SymbolType.REACT]: {
    type: SymbolType.REACT,
    icon: DumbbellIcon,
    frequency: 4,
    winFactor: WIN_FACTORS.VERY_LOW,
  },
  [SymbolType.REDUX]: {
    type: SymbolType.REDUX,
    icon: BicepIcon,
    frequency: 4,
    winFactor: WIN_FACTORS.VERY_LOW,
  },
  [SymbolType.VUE]: {
    type: SymbolType.VUE,
    icon: PlateIcon,
    frequency: 3,
    winFactor: WIN_FACTORS.LOW,
  },
  [SymbolType.ANGULAR]: {
    type: SymbolType.ANGULAR,
    icon: BenchIcon,
    frequency: 3,
    winFactor: WIN_FACTORS.MEDIUM,
  },
  [SymbolType.MOBX]: {
    type: SymbolType.MOBX,
    icon: CoinBronzeIcon,
    frequency: 3,
    winFactor: WIN_FACTORS.LOW,
  },
  [SymbolType.PINIA]: {
    type: SymbolType.PINIA,
    icon: CoinSilverIcon,
    frequency: 2,
    winFactor: WIN_FACTORS.MEDIUM,
  },
  [SymbolType.PIXIJS]: {
    type: SymbolType.PIXIJS,
    icon: CoinGoldIcon,
    frequency: 2,
    winFactor: WIN_FACTORS.HIGH,
  },
  [SymbolType.BABYLONJS]: {
    type: SymbolType.BABYLONJS,
    icon: BenchIcon,
    frequency: 0,
    winFactor: WIN_FACTORS.HIGH,
  },
  [SymbolType.JEST]: {
    type: SymbolType.JEST,
    icon: AthleteAIcon,
    frequency: 0,
    winFactor: WIN_FACTORS.VERY_HIGH,
  },
  [SymbolType.CYPRESS]: {
    type: SymbolType.CYPRESS,
    icon: AthleteBIcon,
    frequency: 0,
    winFactor: WIN_FACTORS.VERY_HIGH,
  },
  [SymbolType.JAVASCRIPT]: {
    ...SCATTER_METADATA,
    frequency: 1,
    winFactor: WIN_FACTORS.MEDIUM,
  },
  [SymbolType.VITE]: {
    ...EXPLOSIVE_METADATA,
    frequency: 1,
    winFactor: WIN_FACTORS.HIGH,
  },
  [SymbolType.TYPESCRIPT]: {
    ...WILDCARD_METADATA,
    frequency: 0,
  },
};

export const PAY_LINES_METADATA: Readonly<{ [key in PayLineType]: PayLine }> = {
  [PayLineType.PL_1]: {
    type: PayLineType.PL_1,
    color: Color.BLUE,
    positions: [
      { reel: 0, row: 1 },
      { reel: 1, row: 1 },
      { reel: 2, row: 1 },
      { reel: 3, row: 1 },
      { reel: 4, row: 1 },
    ],
  },
  [PayLineType.PL_2]: {
    type: PayLineType.PL_2,
    color: Color.GREEN,
    positions: [
      { reel: 0, row: 0 },
      { reel: 1, row: 0 },
      { reel: 2, row: 0 },
      { reel: 3, row: 0 },
      { reel: 4, row: 0 },
    ],
  },
  [PayLineType.PL_3]: {
    type: PayLineType.PL_3,
    color: Color.PURPLE,
    positions: [
      { reel: 0, row: 2 },
      { reel: 1, row: 2 },
      { reel: 2, row: 2 },
      { reel: 3, row: 2 },
      { reel: 4, row: 2 },
    ],
  },
  [PayLineType.PL_4]: {
    type: PayLineType.PL_4,
    color: Color.PINK,
    positions: [
      { reel: 0, row: 0 },
      { reel: 1, row: 1 },
      { reel: 2, row: 2 },
      { reel: 3, row: 1 },
      { reel: 4, row: 0 },
    ],
  },
  [PayLineType.PL_5]: {
    type: PayLineType.PL_5,
    color: Color.ORANGE,
    positions: [
      { reel: 0, row: 2 },
      { reel: 1, row: 1 },
      { reel: 2, row: 0 },
      { reel: 3, row: 1 },
      { reel: 4, row: 2 },
    ],
  },
  [PayLineType.PL_6]: {
    type: PayLineType.PL_6,
    color: Color.LIGHT_GREEN,
    positions: [
      { reel: 0, row: 1 },
      { reel: 1, row: 2 },
      { reel: 2, row: 2 },
      { reel: 3, row: 2 },
      { reel: 4, row: 1 },
    ],
  },
  [PayLineType.PL_7]: {
    type: PayLineType.PL_7,
    color: Color.DARK_BLUE,
    positions: [
      { reel: 0, row: 1 },
      { reel: 1, row: 0 },
      { reel: 2, row: 0 },
      { reel: 3, row: 0 },
      { reel: 4, row: 1 },
    ],
  },
  [PayLineType.PL_8]: {
    type: PayLineType.PL_8,
    color: Color.RED,
    positions: [
      { reel: 0, row: 2 },
      { reel: 1, row: 2 },
      { reel: 2, row: 1 },
      { reel: 3, row: 0 },
      { reel: 4, row: 0 },
    ],
  },
  [PayLineType.PL_9]: {
    type: PayLineType.PL_9,
    color: Color.YELLOW,
    positions: [
      { reel: 0, row: 0 },
      { reel: 1, row: 0 },
      { reel: 2, row: 1 },
      { reel: 3, row: 2 },
      { reel: 4, row: 2 },
    ],
  },
};

export const MIN_MATCH_SEQUENCE_NUMBER: Readonly<number> = 3;

export const ROW_NUMBER: Readonly<number> = 3;
export const REELS_NUMBER: Readonly<number> = 5;

export const INITIAL_CREDITS: Readonly<number> = 100;
export const DEFAULT_BET: Readonly<number> = 1;
export const FREE_SPINS_NUMBER: Readonly<number> = 10;
export const BONUS_WILDCARDS_NUMBER: Readonly<number> = 4;

export const SYMBOL_SIZE: Readonly<number> = 3.35; // in rem — cabe no celular
export const SYMBOL_SIZE_SMALL: Readonly<number> = 2.65; // in rem

export const MIN_SPIN_ANIMATION_DURATION: Readonly<number> = 3 * PERFECT_EMBED_ANIM_PACE; // seconds
export const MAX_SPIN_ANIMATION_DURATION: Readonly<number> = 4 * PERFECT_EMBED_ANIM_PACE; // seconds

export const ANIMATE_RESULTS_DURATION: Readonly<number> = 5000; // in milliseconds

export const LIGHTS_NUMBER: Readonly<number> = 5;
