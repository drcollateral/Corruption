// /effects.js
// Lightweight visual effects on the board (non-interactive). Provides an expanding "Inferno ring" pulse and burn effects.
import { state } from "../core/GameState.js";

let fxRoot = null;

function ensureFxRoot(){
  if (fxRoot) return fxRoot;
  const board = document.getElementById("board");
  if (!board) return null;
  fxRoot = document.createElement("div");
  fxRoot.id = "fx-overlay";
  board.appendChild(fxRoot);
  return fxRoot;
}

function placeCell(el, col, row){
  el.style.left = `calc(((${col} - 1) * 100%) / var(--grid-cells))`;
  el.style.top  = `calc(((${row} - 1) * 100%) / var(--grid-cells))`;
}

function ringCells(origin, radius, gridN){
  const out = [];
  const { col:oc, row:or } = origin || { col: Math.ceil(gridN/2), row: Math.ceil(gridN/2) };
  for (let dc = -radius; dc <= radius; dc++){
    const dr = radius - Math.abs(dc);
    const c1 = oc + dc, r1 = or + dr;
    const c2 = oc + dc, r2 = or - dr;
    if (dr === 0){
      if (c1>=1 && r1>=1 && c1<=gridN && r1<=gridN) out.push({ col:c1, row:r1 });
    } else {
      if (c1>=1 && r1>=1 && c1<=gridN && r1<=gridN) out.push({ col:c1, row:r1 });
      if (c2>=1 && r2>=1 && c2<=gridN && r2<=gridN) out.push({ col:c2, row:r2 });
    }
  }
  return out;
}

function circularRingCells(origin, r, gridN){
  // Returns all cells with Euclidean distance in [r, r+1)
  const out = [];
  const { col:oc, row:or } = origin;
  for (let c=1; c<=gridN; c++){
    for (let r0=1; r0<=gridN; r0++){
      const dist = Math.sqrt((c-oc)*(c-oc) + (r0-or)*(r0-or));
      if (dist >= r && dist < r+2) out.push({ col:c, row:r0 });
    }
  }
  return out;
}

function maxManhattanToCorners(o, n){
  const corners = [
    { col:1, row:1 },
    { col:n, row:1 },
    { col:1, row:n },
    { col:n, row:n },
  ];
  let best = 0;
  for (const c of corners){
    const d = Math.abs(o.col - c.col) + Math.abs(o.row - c.row);
    if (d > best) best = d;
  }
  return best;
}

/**
 * Expanding circular ring animation from an origin cell.
 * Creates WoW Hellfire-style multiple concentric expanding rings.
 */
export function runInfernoRing(origin, opts={}){
  const root = ensureFxRoot();
  if (!root) return;
  const gridN = state.grid?.cells ?? 15;
  const o = origin || { col: Math.ceil(gridN/2), row: Math.ceil(gridN/2) };
  
  // Create single expanding ring like WoW Hellfire
  const ringCount = 1;
  const ringDelay = 150; // ms between rings
  
  for (let i = 0; i < ringCount; i++) {
    setTimeout(() => {
      const ring = document.createElement("div");
      ring.className = "fx-ring hellfire-ring";
      
      // Position at player location
      ring.style.left = `calc(((${o.col} - 1) * 100%) / var(--grid-cells))`;
      ring.style.top = `calc(((${o.row} - 1) * 100%) / var(--grid-cells))`;
      
      // Each ring has slightly different properties for variation
      ring.style.setProperty('--ring-index', i);
      
      // Remove after animation completes
      ring.addEventListener("animationend", () => ring.remove(), { once: true });
      root.appendChild(ring);
    }, i * ringDelay);
  }
}

// Burn effect functions
export function playBurnApplication(col, row, width = 1, height = 1) {
  console.log('Playing burn application at', col, row, 'size:', width, height);
  const root = ensureFxRoot();
  if (!root) {
    console.log('No fx root found');
    return;
  }
  
  // Create flame burst effect that adapts to boss size
  const flames = document.createElement("div");
  flames.className = "fx-burn-application";
  flames.style.left = `calc(((${col} - 1) * 100%) / var(--grid-cells))`;
  flames.style.top = `calc(((${row} - 1) * 100%) / var(--grid-cells))`;
  flames.style.width = `calc((${width} * 100%) / var(--grid-cells))`;
  flames.style.height = `calc((${height} * 100%) / var(--grid-cells))`;
  console.log('Created burn application element:', flames);
  
  flames.addEventListener("animationend", () => flames.remove(), { once: true });
  root.appendChild(flames);
}

export function addBurnDebuffOverlay(col, row, width = 1, height = 1, duration = null, bossId = null) {
  const root = ensureFxRoot();
  if (!root) return;
  
  // Create persistent burn overlay that matches boss dimensions
  const burnOverlay = document.createElement("div");
  burnOverlay.className = "fx-burn-debuff";
  burnOverlay.dataset.col = col;
  burnOverlay.dataset.row = row;
  burnOverlay.dataset.bossId = bossId || state.boss?.id; // Link to boss
  burnOverlay.style.left = `calc(((${col} - 1) * 100%) / var(--grid-cells))`;
  burnOverlay.style.top = `calc(((${row} - 1) * 100%) / var(--grid-cells))`;
  burnOverlay.style.width = `calc((${width} * 100%) / var(--grid-cells))`;
  burnOverlay.style.height = `calc((${height} * 100%) / var(--grid-cells))`;
  
  root.appendChild(burnOverlay);
  
  // Store reference for boss movement updates
  if (!state.burnOverlays) state.burnOverlays = [];
  state.burnOverlays.push(burnOverlay);
  
  // Only use timeout if duration is specified (for backwards compatibility)
  // Otherwise, overlay persists until manually removed
  if (duration && duration > 0) {
    setTimeout(() => {
      burnOverlay.remove();
      // Clean up reference
      if (state.burnOverlays) {
        const index = state.burnOverlays.indexOf(burnOverlay);
        if (index > -1) state.burnOverlays.splice(index, 1);
      }
    }, duration);
  }
  
  return burnOverlay;
}

export function removeBurnDebuffOverlay(col, row) {
  const root = ensureFxRoot();
  if (!root) return;
  
  // Find and remove burn overlay at specific location
  const overlay = root.querySelector(`.fx-burn-debuff[data-col="${col}"][data-row="${row}"]`);
  if (overlay) {
    overlay.remove();
    // Clean up reference
    if (state.burnOverlays) {
      const index = state.burnOverlays.indexOf(overlay);
      if (index > -1) state.burnOverlays.splice(index, 1);
    }
  }
}

export function updateBurnOverlayPositions(bossCol, bossRow, bossWidth = 1, bossHeight = 1) {
  if (!state.burnOverlays) return;
  
  // Update all burn overlays to follow the boss
  state.burnOverlays.forEach(overlay => {
    if (overlay && overlay.dataset.bossId === state.boss?.id) {
      // Position overlay to cover the entire boss area
      overlay.style.left = `calc(((${bossCol} - 1) * 100%) / var(--grid-cells))`;
      overlay.style.top = `calc(((${bossRow} - 1) * 100%) / var(--grid-cells))`;
      overlay.style.width = `calc((${bossWidth} * 100%) / var(--grid-cells))`;
      overlay.style.height = `calc((${bossHeight} * 100%) / var(--grid-cells))`;
      
      // Update data attributes to match new position
      overlay.dataset.col = bossCol;
      overlay.dataset.row = bossRow;
    }
  });
}

export function playBurnTick(col, row, width = 1, height = 1) {
  const root = ensureFxRoot();
  if (!root) return;
  
  // Create damage tick effect that adapts to boss size
  const tick = document.createElement("div");
  tick.className = "fx-burn-tick";
  tick.style.left = `calc(((${col} - 1) * 100%) / var(--grid-cells))`;
  tick.style.top = `calc(((${row} - 1) * 100%) / var(--grid-cells))`;
  tick.style.width = `calc((${width} * 100%) / var(--grid-cells))`;
  tick.style.height = `calc((${height} * 100%) / var(--grid-cells))`;
  
  tick.addEventListener("animationend", () => tick.remove(), { once: true });
  root.appendChild(tick);
}
