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
  console.log("🔥 HELLFIRE HEATWAVE INITIATED!", origin, opts);
  const root = ensureFxRoot();
  if (!root) return;
  const gridN = state.grid?.cells ?? 15;
  const o = origin || { col: Math.ceil(gridN/2), row: Math.ceil(gridN/2) };
  
  // Micro-shake just the board for impact - not the entire UI
  const boardEl = document.getElementById("board");
  if (boardEl) {
    boardEl.style.transform = 'translate(1px, 0.5px)';
    setTimeout(() => {
      boardEl.style.transform = 'translate(-0.5px, -1px)';
      setTimeout(() => {
        boardEl.style.transform = 'translate(0.5px, 0.5px)';
        setTimeout(() => {
          boardEl.style.transform = '';
        }, 50);
      }, 50);
    }, 50);
  }
  
  // Create ground scorch mark first
  const scorch = document.createElement("div");
  scorch.className = "ground-scorch";
  scorch.style.left = `calc(((${o.col} - 1) * 100%) / var(--grid-cells))`;
  scorch.style.top = `calc(((${o.row} - 1) * 100%) / var(--grid-cells))`;
  root.appendChild(scorch);
  
  // Furnace door flash at caster's feet
  const coreFlash = document.createElement("div");
  coreFlash.className = "hellfire-core-flash";
  coreFlash.style.left = `calc(((${o.col} - 1) * 100%) / var(--grid-cells))`;
  coreFlash.style.top = `calc(((${o.row} - 1) * 100%) / var(--grid-cells))`;
  root.appendChild(coreFlash);
  
  // Create leading dust shockwave ring first
  const dustRing = document.createElement("div");
  dustRing.className = "hellfire-dust-shockwave";
  dustRing.style.left = `calc(((${o.col} - 1) * 100%) / var(--grid-cells))`;
  dustRing.style.top = `calc(((${o.row} - 1) * 100%) / var(--grid-cells))`;
  root.appendChild(dustRing);
  
  // Create ground lava painting effect (initial pulse)
  const lavaGround = document.createElement("div");
  lavaGround.className = "hellfire-lava-ground";
  lavaGround.style.left = `calc(((${o.col} - 1) * 100%) / var(--grid-cells))`;
  lavaGround.style.top = `calc(((${o.row} - 1) * 100%) / var(--grid-cells))`;
  root.appendChild(lavaGround);
  
  // Create secondary lava pulse (follows dust ring closely)
  setTimeout(() => {
    const lavaSecondary = document.createElement("div");
    lavaSecondary.className = "hellfire-lava-secondary";
    lavaSecondary.style.left = `calc(((${o.col} - 1) * 100%) / var(--grid-cells))`;
    lavaSecondary.style.top = `calc(((${o.row} - 1) * 100%) / var(--grid-cells))`;
    root.appendChild(lavaSecondary);
    
    setTimeout(() => lavaSecondary.remove(), 1800);
  }, 300); // Start much sooner to follow the dust ring
  
  // Create 3 concentric heat rings with organic wobble (following the dust wave)
  for (let ring = 0; ring < 3; ring++) {
    setTimeout(() => {
      const heatRing = document.createElement("div");
      heatRing.className = "hellfire-heat-ring";
      heatRing.style.left = `calc(((${o.col} - 1) * 100%) / var(--grid-cells))`;
      heatRing.style.top = `calc(((${o.row} - 1) * 100%) / var(--grid-cells))`;
      heatRing.style.setProperty('--ring-index', ring);
      root.appendChild(heatRing);
      
      // Create ember spray for this ring - optimized for performance
      for (let i = 0; i < 16; i++) {
        const ember = document.createElement("div");
        ember.className = Math.random() > 0.7 ? "hellfire-ember-battlefield" : "hellfire-ember-long";
        ember.style.left = `calc(((${o.col} - 0.5) * 100%) / var(--grid-cells))`;
        ember.style.top = `calc(((${o.row} - 0.5) * 100%) / var(--grid-cells))`;
        ember.style.setProperty("--angle", `${(i * 22.5) + Math.random() * 15}deg`);
        ember.style.animationDelay = `${100 + ring * 120 + Math.random() * 100}ms`; // Start after dust wave begins
        root.appendChild(ember);
        
        const emberLife = ember.className.includes('battlefield') ? 1600 : 1000;
        setTimeout(() => ember.remove(), emberLife);
      }
      
      setTimeout(() => heatRing.remove(), 1000);
    }, 100 + ring * 120); // Slight delay after dust wave starts
  }
  
  // Clean up core flash, dust ring, lava ground, and scorch
  setTimeout(() => coreFlash.remove(), 200);
  setTimeout(() => dustRing.remove(), 1500);
  setTimeout(() => lavaGround.remove(), 1500); // Sync with dust ring
  setTimeout(() => scorch.remove(), 4000);
}

/**
 * Creates an intense inferno pulse animation at a specific location.
 * This is a more focused, powerful pulse effect than the expanding ring.
 */
export function runInfernoPulse(origin, opts = {}) {
  const root = ensureFxRoot();
  if (!root) return;
  
  const gridN = state.grid?.cells ?? 15;
  const o = origin || { col: Math.ceil(gridN/2), row: Math.ceil(gridN/2) };
  const duration = opts.duration || 2000;
  
  // Create energy waves (3 concentric pulses)
  for (let wave = 0; wave < 3; wave++) {
    setTimeout(() => {
      const energyWave = document.createElement("div");
      energyWave.className = `inferno-pulse-wave wave-${wave + 1}`;
      energyWave.style.left = `calc(((${o.col} - 1) * 100%) / var(--grid-cells))`;
      energyWave.style.top = `calc(((${o.row} - 1) * 100%) / var(--grid-cells))`;
      root.appendChild(energyWave);
      
      setTimeout(() => energyWave.remove(), 1500);
    }, wave * 200);
  }
  
  // Create heat distortion effect
  const heatDistortion = document.createElement("div");
  heatDistortion.className = "inferno-pulse-distortion";
  heatDistortion.style.left = `calc(((${o.col} - 1) * 100%) / var(--grid-cells))`;
  heatDistortion.style.top = `calc(((${o.row} - 1) * 100%) / var(--grid-cells))`;
  root.appendChild(heatDistortion);
  
  // Create flame jets around the pulse (fixed number, no intensity scaling)
  const jetCount = 8;
  for (let i = 0; i < jetCount; i++) {
    setTimeout(() => {
      const flameJet = document.createElement("div");
      flameJet.className = "inferno-pulse-jet";
      flameJet.style.left = `calc(((${o.col} - 0.5) * 100%) / var(--grid-cells))`;
      flameJet.style.top = `calc(((${o.row} - 0.5) * 100%) / var(--grid-cells))`;
      flameJet.style.setProperty("--angle", `${(i * (360 / jetCount)) + Math.random() * 30}deg`);
      flameJet.style.setProperty("--delay", `${Math.random() * 200}ms`);
      root.appendChild(flameJet);
      
      setTimeout(() => flameJet.remove(), 1200);
    }, Math.random() * 300);
  }
  
  // Screen flash effect
  const flash = document.createElement("div");
  flash.className = "inferno-pulse-flash";
  flash.style.position = "fixed";
  flash.style.inset = "0";
  flash.style.zIndex = "1000";
  flash.style.pointerEvents = "none";
  document.body.appendChild(flash);
  
  setTimeout(() => flash.remove(), 300);
  
  // Cleanup
  setTimeout(() => {
    heatDistortion.remove();
  }, duration);
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
