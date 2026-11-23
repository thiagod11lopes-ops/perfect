import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { nanoid } from 'nanoid';
import { Reels } from '@/components';
import { FitScale } from '@/components/game/FitScale';
import { SlotLever } from '@/components/game/SlotLever';
import { ANIMATE_RESULTS_DURATION, ROW_NUMBER } from '@/game-configs';
import { ModalType, Position, SlotScreenResult, Symbol } from '@/types';
import {
  SPIN_ENDED,
  GAME_RESET,
  NEW_SPIN_PREPARED,
  SPAN,
  EMBED_SESSION_INIT,
} from '@/store/action-types';
import {
  postPerfectEmbedMessage,
  readPerfectEmbedConfig,
  PERFECT_WIN_SPARKLE_MS,
  PERFECT_EMBED_LOSS_SETTLE_MS,
  type PerfectEmbedSession,
  isPerfectEmbedMessage,
} from '@/embed/perfectEmbed';
import { buildPerfectEmbedScreen } from '@/embed/perfectEmbedScreens';
import {
  getScreenResult,
  getScreenWithBonusWildcards,
  getShuffledReels,
  wonBonusWildCards,
} from '@/game-utils';
import { State } from '@/store/types';
import { ModalContext, ModalContextData } from '@/context/ModalContext';
import { LoseSound, SlotWheelSound, ThemeSound, WinSound } from '@/assets/sounds';
import { getRandomNumber } from '@/utils';
import { ReelsContext } from '@/context/ReelsContext';
import { useSymbolSize } from '@/hooks';
import styles from './styles.module.scss';

const SlotMachine: React.FC = () => {
  const embedConfig = useMemo(() => readPerfectEmbedConfig(), []);
  const embedSpinCountRef = useRef(0);
  const embedSessionRef = useRef<PerfectEmbedSession | null>(null);
  const [embedSessionDone, setEmbedSessionDone] = useState(false);
  const [reels, setReels] = useState<Symbol[][]>([]);
  const isMusicOn: boolean = useSelector((state: State) => state.settings.isMusicOn);
  const isSoundOn: boolean = useSelector((state: State) => state.settings.isSoundOn);
  const bet: number = useSelector((state: State) => state.slotMachine.bet);
  const credits: number = useSelector((state: State) => state.slotMachine.credits);
  const isSpinning: boolean = useSelector((state: State) => state.slotMachine.isSpinning);
  const isAutoSpinOn: boolean = useSelector((state: State) => state.slotMachine.isAutoSpinOn);
  const winPayLines = useSelector((state: State) => state.slotMachine.winPayLines);
  const hasOngoingGame: boolean = useSelector((state: State) => state.slotMachine.hasOngoingGame);
  const resetGameOnMount: boolean | null = useSelector(
    (state: State) => state.slotMachine.resetGameOnMount
  );
  const [finalSlotScreen, setFinalSlotScreens] = useState<Symbol[][]>([]);
  const symbolSize: number = useSymbolSize();

  const dispatch = useDispatch();
  const { openModal } = useContext<ModalContextData>(ModalContext);

  const [userAlreadyInteract, setUserAlreadyInteract] = useState<boolean>(false);
  const themeMusic: HTMLAudioElement = useMemo(() => new Audio(ThemeSound), []);
  const slotWheelSound: HTMLAudioElement = useMemo(() => new Audio(SlotWheelSound), []);
  const winSound: HTMLAudioElement = useMemo(() => new Audio(WinSound), []);
  const loseSound: HTMLAudioElement = useMemo(() => new Audio(LoseSound), []);

  const setGameConfigs = useCallback(() => {
    if (embedConfig.embed) {
      dispatch({ type: EMBED_SESSION_INIT });
      postPerfectEmbedMessage({ type: 'perfect-slot:ready', stake: embedConfig.stake });
      return;
    }
    if ((hasOngoingGame && resetGameOnMount === null) || !credits) {
      const modalProps = !credits ? { hasNoCredits: true } : undefined;
      openModal(ModalType.RESET, modalProps);
    }

    if (resetGameOnMount) {
      dispatch({ type: GAME_RESET });
    }
  }, [credits, dispatch, openModal, hasOngoingGame, resetGameOnMount, embedConfig.embed, embedConfig.stake]);

  const playThemeMusic = useCallback((): void => {
    if (!isMusicOn) {
      return;
    }

    themeMusic.play();
    themeMusic.loop = true;
    themeMusic.volume = 0.75;
  }, [isMusicOn, themeMusic]);

  const onSpin = useCallback(() => {
    if (bet > credits) {
      return;
    }

    dispatch({ type: SPAN });

    if (isSoundOn) {
      slotWheelSound.play();
      slotWheelSound.loop = true;
    }
    let slotScreen: Symbol[][];
    if (embedConfig.embed && embedSessionRef.current) {
      const spinIdx = embedSpinCountRef.current;
      const session = embedSessionRef.current;
      const horizontalMatch = session.spinHorizontalMatches[spinIdx] ?? 0;
      slotScreen = buildPerfectEmbedScreen(horizontalMatch, spinIdx % 3);
    } else {
      slotScreen = reels.map(reel => {
        const randomIndex = getRandomNumber(0, reel.length - ROW_NUMBER);
        return reel.slice(randomIndex, randomIndex + ROW_NUMBER);
      });
    }
    setFinalSlotScreens(slotScreen);
  }, [reels, isSoundOn, slotWheelSound, bet, credits, dispatch, embedConfig.embed]);

  const onReelAnimationEnd = useCallback(
    (reelIndex: number): void => {
      setReels(prevReels =>
        prevReels.map((reel, index) =>
          reelIndex !== index
            ? reel
            : [...finalSlotScreen[reelIndex].map(item => ({ ...item, id: nanoid() })), ...reel]
        )
      );
    },
    [finalSlotScreen]
  );

  const getTimerForNewSpin = useCallback(
    (slotResult: SlotScreenResult): number => {
      const noResults = Object.entries(slotResult).every(
        ([_, value]: [string, SlotScreenResult[keyof SlotScreenResult]]) =>
          !value || (Array.isArray(value) && !value.length)
      );

      if (isAutoSpinOn && noResults) {
        return ANIMATE_RESULTS_DURATION / 2;
      }

      return noResults ? ANIMATE_RESULTS_DURATION / 5 : ANIMATE_RESULTS_DURATION;
    },
    [isAutoSpinOn]
  );

  const onSpinningEnd = useCallback(() => {
    slotWheelSound.pause();
    let slotResult: SlotScreenResult = getScreenResult(finalSlotScreen);

    let bonusWildcardsPositions: Position[] = [];
    if (!embedConfig.embed && !slotResult.winAmount && wonBonusWildCards()) {
      const { wildcardsPositions, slotScreenWithWildcards } =
        getScreenWithBonusWildcards(finalSlotScreen);
      setFinalSlotScreens(slotScreenWithWildcards);
      slotResult = getScreenResult(slotScreenWithWildcards);
      bonusWildcardsPositions = wildcardsPositions;
    }

    dispatch({ type: SPIN_ENDED, payload: { slotResult, bonusWildcardsPositions } });

    if (isSoundOn) {
      const endSound = !!slotResult.winPayLines.length ? winSound : loseSound;
      endSound.play();
    }

    const hasWinHighlight = !!slotResult.winPayLines.length;
    const timeToNewSpin: number = embedConfig.embed
      ? hasWinHighlight
        ? PERFECT_WIN_SPARKLE_MS
        : PERFECT_EMBED_LOSS_SETTLE_MS
      : hasWinHighlight
        ? Math.max(PERFECT_WIN_SPARKLE_MS, 900)
        : getTimerForNewSpin(slotResult);

    // shuffle reels for next spinning
    /*   const shuffledReels = getShuffledReels();
    setReels(prevReels =>
      prevReels.map((reel, index) => [
        ...reel.slice(0, ROW_NUMBER),
        ...shuffledReels[index].slice(ROW_NUMBER),
      ])
    ); */

    setTimeout(() => {
      if (embedConfig.embed) {
        const spinIndex = embedSpinCountRef.current;
        const session = embedSessionRef.current;
        const spinAmount = session?.spinAmounts[spinIndex] ?? 0;
        const isWin = !!slotResult.winPayLines.length;
        embedSpinCountRef.current += 1;
        postPerfectEmbedMessage({
          type: 'perfect-slot:spin',
          spin: embedSpinCountRef.current,
          maxSpins: embedConfig.maxSpins,
          spinIndex,
          isWin,
          spinAmount,
        });
        if (embedSpinCountRef.current >= embedConfig.maxSpins) {
          setEmbedSessionDone(true);
          postPerfectEmbedMessage({
            type: 'perfect-slot:complete',
            spins: embedSpinCountRef.current,
          });
          dispatch({ type: NEW_SPIN_PREPARED });
          return;
        }
        dispatch({ type: NEW_SPIN_PREPARED });
        return;
      }
      const updatedCredits: number = credits + slotResult.winAmount;
      if (!updatedCredits) {
        openModal(ModalType.RESET, { hasNoCredits: true });
      }
      dispatch({ type: NEW_SPIN_PREPARED });
      if (isAutoSpinOn) {
        onSpin();
      }
    }, timeToNewSpin);
  }, [
    dispatch,
    isSoundOn,
    winSound,
    loseSound,
    slotWheelSound,
    credits,
    isAutoSpinOn,
    finalSlotScreen,
    getTimerForNewSpin,
    onSpin,
    openModal,
    embedConfig.embed,
    embedConfig.maxSpins,
  ]);
  // const worker = new Worker(new URL('../../../workers/shuffle-worker.ts', import.meta.url));
  useEffect(() => {
    const shuffledReels = getShuffledReels();
    setReels(shuffledReels);
    setGameConfigs();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!embedConfig.embed) return;
    const onMessage = (event: MessageEvent) => {
      if (!isPerfectEmbedMessage(event.data)) return;
      if (event.data.type !== 'perfect-slot:session') return;
      const payload = event.data as PerfectEmbedSession & { type: string }
      const asMatch = (v: unknown): 0 | 1 | 2 | 3 | 4 | 5 => {
        const n = Math.floor(Number(v));
        if (n >= 0 && n <= 5) return n as 0 | 1 | 2 | 3 | 4 | 5;
        return 0;
      };
      embedSessionRef.current = {
        kind: payload.kind === 'loss' ? 'loss' : 'win',
        spinAmounts: [
          Number(payload.spinAmounts?.[0]) || 0,
          Number(payload.spinAmounts?.[1]) || 0,
          Number(payload.spinAmounts?.[2]) || 0,
        ],
        spinHorizontalMatches: [
          asMatch(payload.spinHorizontalMatches?.[0]),
          asMatch(payload.spinHorizontalMatches?.[1]),
          asMatch(payload.spinHorizontalMatches?.[2]),
        ],
      };
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [embedConfig.embed]);

  useEffect(() => {
    if (isMusicOn && userAlreadyInteract) {
      return playThemeMusic();
    }

    themeMusic.pause();
  }, [isMusicOn, themeMusic, playThemeMusic, userAlreadyInteract]);

  useEffect(() => {
    const updateSetUserAlreadyInteract = (): void => setUserAlreadyInteract(true);
    document.addEventListener('click', updateSetUserAlreadyInteract);
    return () => document.removeEventListener('click', updateSetUserAlreadyInteract);
  }, []);

  const leverDisabled = embedConfig.embed
    ? embedSessionDone || isSpinning
  : embedSessionDone ||
      isSpinning ||
      !!winPayLines.length ||
      !credits ||
      bet > credits;

  return (
    <div className={styles['slot-machine']}>
      <FitScale
        className={styles['slot-machine__fit']}
        paddingRatio={embedConfig.embed ? 0.86 : 0.92}
        insetTop={embedConfig.embed ? '1.25rem' : undefined}
      >
        <div className={styles['slot-machine__cabinet']}>
          <div className={styles['slot-machine__stage']}>
            <div className={styles['slot-machine__gold-panel']}>
              <ReelsContext.Provider value={{ symbolSize, onReelAnimationEnd, onSpinningEnd }}>
                <Reels reels={reels} />
              </ReelsContext.Provider>
            </div>
            <SlotLever
              disabled={leverDisabled}
              idleHintEnabled={embedConfig.embed && !embedSessionDone}
              onPull={onSpin}
            />
          </div>
        </div>
      </FitScale>
    </div>
  );
};

export { SlotMachine };
