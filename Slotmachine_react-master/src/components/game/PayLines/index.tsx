import { CSSTransition } from 'react-transition-group';
import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { State } from '@/store/types';
import { ROW_NUMBER } from '@/game-configs';
import { HorizontalWinSparkle, isHorizontalWinPayLine } from './HorizontalWinSparkle';
import styles from './styles.module.scss';

const PayLines: React.FC = () => {
  const showPayLines = useSelector((state: State) => state.slotMachine.showPayLines);
  const winPayLines = useSelector((state: State) => state.slotMachine.winPayLines);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const horizontalWins = useMemo(
    () => winPayLines.filter(isHorizontalWinPayLine),
    [winPayLines],
  );

  const showPreview = showPayLines && !winPayLines.length;
  const visible = showPreview || horizontalWins.length > 0;

  return (
    <CSSTransition
      in={visible}
      timeout={341}
      unmountOnExit
      classNames={{
        enterActive: styles['pay-lines-enter-active'],
        enterDone: styles['pay-lines-enter-done'],
        exit: styles['pay-lines-exit'],
        exitActive: styles['pay-lines-exit-active'],
      }}
      nodeRef={wrapperRef}
    >
      <div className={styles['pay-lines']} ref={wrapperRef}>
        {horizontalWins.map((line) => (
          <HorizontalWinSparkle key={line.type} payLine={line} />
        ))}
        {showPreview ? (
          <div className={styles['pay-lines__preview']} aria-hidden>
            {Array.from({ length: ROW_NUMBER }, (_, row) => (
              <div
                key={row}
                className={styles['pay-lines__preview-row']}
                style={{ top: `${((row + 0.5) / ROW_NUMBER) * 100}%` }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </CSSTransition>
  );
};

export { PayLines };