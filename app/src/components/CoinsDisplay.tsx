import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useApp } from '../store/AppContext'
import { formatCoins } from '../utils/format'
import { CoinIcon } from './CoinIcon'

type CoinsDisplayCtx = {
  displayCoins: number
  setDisplayCoins: (value: number | ((prev: number) => number)) => void
  /** Mantém o chip até o Redux alcançar o mesmo saldo (ex.: liquidação da roleta). */
  pinDisplayCoinsUntilSynced: (value: number) => void
  /** Alinha chip ao state.coins e remove pin (ex.: editar moedas no DEV). */
  alignDisplayWithAppWallet: (value?: number) => void
  setCoinCelebrating: (value: boolean) => void
}

const CoinsDisplayContext = createContext<CoinsDisplayCtx | null>(null)

export function CoinsDisplayProvider({ children }: { children: ReactNode }) {
  const { state } = useApp()
  const [displayCoins, setDisplayCoins] = useState(state.coins)
  const [celebrating, setCelebrating] = useState(false)
  const pinnedUntilSyncRef = useRef<number | null>(null)

  const pinDisplayCoinsUntilSynced = useCallback((value: number) => {
    const n = Math.max(0, Math.floor(value))
    pinnedUntilSyncRef.current = n
    setDisplayCoins(n)
  }, [])

  const alignDisplayWithAppWallet = useCallback(
    (value?: number) => {
      pinnedUntilSyncRef.current = null
      const n = value !== undefined ? Math.max(0, Math.floor(value)) : state.coins
      setDisplayCoins(n)
    },
    [state.coins],
  )

  useEffect(() => {
    const pinned = pinnedUntilSyncRef.current
    if (pinned !== null) {
      setDisplayCoins(pinned)
      if (!celebrating && state.coins >= pinned) {
        pinnedUntilSyncRef.current = null
        setDisplayCoins(state.coins)
      }
      return
    }
    if (celebrating) return
    setDisplayCoins(state.coins)
  }, [state.coins, celebrating])

  const setCoinCelebrating = useCallback((value: boolean) => {
    setCelebrating(value)
  }, [])

  const value = useMemo(
    () => ({
      displayCoins,
      setDisplayCoins,
      pinDisplayCoinsUntilSynced,
      alignDisplayWithAppWallet,
      setCoinCelebrating,
    }),
    [alignDisplayWithAppWallet, displayCoins, pinDisplayCoinsUntilSynced, setCoinCelebrating],
  )

  return <CoinsDisplayContext.Provider value={value}>{children}</CoinsDisplayContext.Provider>
}

export function useCoinsDisplay() {
  const ctx = useContext(CoinsDisplayContext)
  if (!ctx) throw new Error('useCoinsDisplay must be used within CoinsDisplayProvider')
  return ctx
}

/** Chip de moedas — usar na linha do eyebrow / card do aluno. */
export function PageCoinsChip({ className = '' }: { className?: string }) {
  const { displayCoins } = useCoinsDisplay()
  return (
    <span
      className={`stat-chip coin-chip page-coins-chip ${className}`.trim()}
      data-coin-chip
      aria-label={`${formatCoins(displayCoins)} moedas`}
    >
      <CoinIcon />
      <span className="coin-chip-value">{formatCoins(displayCoins)}</span>
    </span>
  )
}
