// /state.js
// Adds per-turn flags and collision helpers.
// Updated: introduce `mode` to coordinate overworld vs combat systems.
import { RNG } from "../utils/RNG.js";

export const state = {
  scene: "setup",
  mode: "setup",         // "setup" | "overworld" | "combat" (set by combat.js on cave entry)
  players: [],            // {id,name,col,row,class,affinity,attrs:{A1,A2,A3},moveDie}
  activeIdx: 0,
  board: null,
  entrances: [],
  boss: null,             // BossEntity instance
  bossDeck: null,
  rng: new RNG(Date.now() & 0xffffffff),
  debug: {
    skipToCaveAfterCreate: false,
  },

  // turn control (legacy movement turns / overworld)
  pendingSteps: 0,        // remaining movement this turn
  rolledThisTurn: false,  // has the player pressed R this turn?

  // combat turn order (initiative-style): array of { kind: 'player'|'boss', idx?: number }
  turnOrder: [],
  turnPtr: 0,
  isPlayerTurn: false,
};

export function setBoard(board){
  state.board = board;
  document.documentElement.style.setProperty("--grid-cells", String(board.size));
}
export function setScene(scene){ state.scene = scene; }
export function setPlayers(players){ state.players = players; state.activeIdx = 0; resetTurnFlags(); }
export function activePlayer(){ return state.players[state.activeIdx] ?? null; }
export function nextPlayer(){ state.activeIdx = (state.activeIdx + 1) % state.players.length; resetTurnFlags(); }
export function resetTurnFlags(){ state.pendingSteps = 0; state.rolledThisTurn = false; }

// Debug helpers
export function setDebugFlag(key, value){
  if (!state.debug) state.debug = {};
  state.debug[key] = value;
}

// --- collision helpers ---
export function isPlayerAt(col,row, excludeId=null){
  return state.players.some(p => p.id!==excludeId && p.col===col && p.row===row);
}
export function isBossAt(col,row){
  if (!state.boss) return false;
  return state.boss.intersects(col, row);
}
export function isCellBlocked(col,row, excludeId=null){
  // entrances are not blocking; players and boss are
  if (isPlayerAt(col,row, excludeId)) return true;
  if (excludeId !== state.boss?.id && isBossAt(col,row)) return true;
  return false;
}

