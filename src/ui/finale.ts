// DOM overlay for the ending: the original hand-painted Wilber World banner is
// shown at full resolution (a pixelated canvas copy would lose its detail),
// with the thank-you card on top. viewport.ts keeps it aligned with the game.

export interface FinaleStats {
  score: number;
  best: number;
  newBest: boolean;
  coins: number;
  nearMisses: number;
  bestCombo: number;
  smashed: number;
  prompt: string;
}

function el(): HTMLElement | null {
  return document.getElementById('finale');
}

export function revealFinale(): void {
  const finale = el();
  if (!finale) return;
  finale.classList.remove('zoomed', 'with-text');
  finale.classList.add('visible');
}

export function zoomFinale(): void {
  el()?.classList.add('zoomed');
}

export function showFinaleText(stats: FinaleStats): void {
  const finale = el();
  if (!finale) return;

  let card = document.getElementById('finale-text');
  if (!card) {
    card = document.createElement('div');
    card.id = 'finale-text';
    finale.appendChild(card);
  }

  const pad = (n: number) => String(n).padStart(6, '0');
  card.innerHTML = `
    <h1>THANKS FOR<br>PLAYING!</h1>
    <p class="score">SCORE ${pad(stats.score)}</p>
    <p class="best">${stats.newBest ? 'NEW BEST!' : `BEST ${pad(stats.best)}`}</p>
    <p class="stats">COINS ${stats.coins} &middot; NEAR MISSES ${stats.nearMisses}<br>BEST COMBO x${stats.bestCombo} &middot; SMASHED ${stats.smashed}</p>
    <p class="prompt">${stats.prompt}</p>
  `;
  finale.classList.add('with-text');
}

export function hideFinale(): void {
  const finale = el();
  if (!finale) return;
  finale.classList.remove('visible', 'zoomed', 'with-text');
}
