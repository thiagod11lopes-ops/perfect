import { postExit } from './bridge';

export const GOODBYE_MS = 3_000;

type Actions = {
  onRetry: () => void;
  collected: number;
  targetCoins: number;
};

let layer: HTMLDivElement | null = null;
let farewellLayer: HTMLDivElement | null = null;

function dismissLayer(el: HTMLDivElement | null): void {
  el?.remove();
}

export function hideGameOver(): void {
  dismissLayer(layer);
  layer = null;
}

export function showGameOver(host: HTMLElement, actions: Actions): void {
  hideGameOver();
  layer = document.createElement('div');
  layer.className = 'game-over';
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-labelledby', 'game-over-title');

  const card = document.createElement('article');
  card.className = 'game-over-card';

  const title = document.createElement('h1');
  title.id = 'game-over-title';
  title.className = 'game-over-title';
  title.textContent = 'GAME OVER';

  const btnRow = document.createElement('div');
  btnRow.className = 'game-over-actions';

  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'game-over-btn game-over-btn--primary';
  retry.textContent = 'Tentar novamente';

  const exit = document.createElement('button');
  exit.type = 'button';
  exit.className = 'game-over-btn game-over-btn--ghost';
  exit.textContent = 'Sair';

  retry.addEventListener('click', () => {
    hideGameOver();
    actions.onRetry();
  });

  exit.addEventListener('click', () => {
    hideGameOver();
    playGoodbyeFarewell(host, () => {
      postExit(actions.collected, actions.targetCoins);
    });
  });

  btnRow.appendChild(retry);
  btnRow.appendChild(exit);
  card.appendChild(title);
  card.appendChild(btnRow);
  layer.appendChild(card);
  host.appendChild(layer);
}

export function playGoodbyeFarewell(host: HTMLElement, onDone: () => void): void {
  dismissLayer(farewellLayer);
  farewellLayer = document.createElement('div');
  farewellLayer.className = 'goodbye-farewell';
  farewellLayer.setAttribute('aria-hidden', 'true');

  const wave = document.createElement('div');
  wave.className = 'goodbye-farewell-hand';
  wave.textContent = '👋';

  farewellLayer.appendChild(wave);
  host.appendChild(farewellLayer);

  window.setTimeout(() => {
    dismissLayer(farewellLayer);
    farewellLayer = null;
    onDone();
  }, GOODBYE_MS);
}