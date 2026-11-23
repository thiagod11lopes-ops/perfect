import { useEffect, useState, HTMLAttributes, CSSProperties, useMemo } from 'react';
import { Position, Symbol as SymbolType } from '@/types';
import { useSelector } from 'react-redux';
import { State } from '@/store/types';
import styles from './styles.module.scss';

interface SymbolProps extends HTMLAttributes<HTMLDivElement> {
  symbol: SymbolType;
  reelIndex: number;
  symbolIndex: number | null;
  isSpinning?: boolean;
  isBonusWildCard?: boolean;
}

const Symbol: React.FC<SymbolProps> = ({
  symbol,
  reelIndex,
  symbolIndex,
  isSpinning = false,
  isBonusWildCard = false,
}) => {
  const SymbolIcon = symbol.icon;
  const bonusWildcardsPositions: Position[] = useSelector(
    (state: State) => state.slotMachine.bonusWildcardsPositions
  );
  const [willBeReplacedByBonusWildCardSymbol, setWillBeReplacedByBonusWildCardSymbol] =
    useState<boolean>(false);

  const cssVars = useMemo(
    () =>
      ({
        '--symbol-index': symbolIndex || 0,
      } as CSSProperties),
    [symbolIndex]
  );

  useEffect(() => {
    if (symbolIndex === null) {
      return;
    }
    const willBeReplaced: boolean = isBonusWildCard
      ? false
      : bonusWildcardsPositions.some(
          ({ reel, row }: Position) => reel === reelIndex && row === symbolIndex
        );

    setWillBeReplacedByBonusWildCardSymbol(willBeReplaced);
  }, [bonusWildcardsPositions, reelIndex, symbolIndex, isBonusWildCard]);

  return (
    <div
      id={isBonusWildCard ? undefined : `symbol-${reelIndex}`}
      data-cy="symbol"
      className={`${styles.symbol} ${isSpinning ? styles['symbol--spinning'] : ''} ${
        willBeReplacedByBonusWildCardSymbol ? styles['symbol--hidden'] : ''
      } ${isBonusWildCard ? styles['symbol--showing'] : ''}`}
      style={{ ...cssVars }}
    >
      <SymbolIcon animate={false} />
    </div>
  );
};

export { Symbol };
