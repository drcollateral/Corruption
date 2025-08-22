// Probability utilities (enhanced) for deck tracking & draw odds, including reshuffle cases.

// Memoization cache for binomial coefficients
const _nCkCache = new Map();
// Lazy DEBUG hook (no hard dependency if Debug.js not yet loaded)
let _DEBUG = null;
function D(){
  if (!_DEBUG){
    try { _DEBUG = (window.DEBUG) ? window.DEBUG : null; } catch { /* ignore */ }
  }
  return _DEBUG;
}

/**
 * Binomial coefficient (n choose k) with memoization.
 * Uses multiplicative formula for numerical stability with small ints typical of decks.
 */
export function nCk(n, k){
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  const key = n + "," + k;
  if (_nCkCache.has(key)) {
    if (D()?.is('prob')) D().log('prob','nCk cache hit', key);
    return _nCkCache.get(key);
  }
  let result = 1;
  for (let i = 1; i <= k; i++){
    result = result * (n - k + i) / i;
  }
  _nCkCache.set(key, result);
  if (D()?.is('prob')) D().log('prob','nCk compute', { n, k, result });
  return result;
}

/** Basic hypergeometric probability of at least one success (no reshuffle). */
export function probAtLeastOne(deckSize, copies, draws){
  if (copies <= 0 || draws <= 0) return 0;
  if (draws >= deckSize) return copies > 0 ? 1 : 0;
  if (copies >= deckSize) return 1;
  const totalWays = nCk(deckSize, draws);
  if (!totalWays) return 0;
  const waysWithout = nCk(deckSize - copies, draws);
  const p = 1 - (waysWithout / totalWays);
  if (D()?.is('prob')) D().log('prob','probAtLeastOne', { deckSize, copies, draws, p });
  return p;
}

// Backwards-compatible alias used earlier in code (keep old name if referenced elsewhere)
export const probAtLeastOne_noReshuffle = probAtLeastOne;

/**
 * Probability with potential reshuffle: draw `draws` cards; if draw pile empties, discard reshuffles.
 * Model: Draw all remaining from current deck, then (if still need more) draw the rest from discard pile.
 */
export function probWithReshuffle(deckSize, copiesInDeck, discardSize, copiesInDiscard, draws){
  const totalCopies = copiesInDeck + copiesInDiscard;
  const totalCards = deckSize + discardSize;
  if (totalCopies === 0 || draws <= 0) return 0;
  if (draws >= totalCards) return totalCopies > 0 ? 1 : 0;
  // No reshuffle needed
  if (draws <= deckSize){
  const r = probAtLeastOne(deckSize, copiesInDeck, draws);
  if (D()?.is('prob')) D().log('prob','probWithReshuffle(no-reshuffle)', { deckSize, copiesInDeck, draws, result:r });
  return r;
  }
  // Reshuffle path
  const drawsFromDeck = deckSize;
  const drawsFromDiscard = draws - deckSize;
  if (drawsFromDiscard > discardSize) return 1; // would exhaust everything
  const pNoneDeck = deckSize === 0 ? 1 : 1 - probAtLeastOne(deckSize, copiesInDeck, drawsFromDeck);
  const pNoneDiscard = discardSize === 0 ? 1 : 1 - probAtLeastOne(discardSize, copiesInDiscard, drawsFromDiscard);
  const p = 1 - (pNoneDeck * pNoneDiscard);
  if (D()?.is('prob')) D().log('prob','probWithReshuffle(reshuffle)', { deckSize, copiesInDeck, discardSize, copiesInDiscard, draws, p });
  return p;
}

/**
 * Convenience: probability for next draw of k cards (default 1) given current draw & discard piles.
 * Falls back to reshuffle model automatically when deck smaller than k.
 */
export function probCardNextDraw(drawCount, copyCount, discardCount, k = 1){
  const p = probWithReshuffle(drawCount, copyCount, discardCount, 0, k);
  if (D()?.is('prob')) D().log('prob','probCardNextDraw', { drawCount, copyCount, discardCount, k, p });
  return p;
}

/** Clear internal caches (rarely needed, exposed for diagnostics). */
export function clearProbabilityCache(){ _nCkCache.clear(); if (D()?.is('prob')) D().log('prob','clearProbabilityCache'); }
