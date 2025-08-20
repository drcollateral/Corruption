// /state.js
// Adds per-turn flags and collision helpers.
// Updated: introduce `mode` to coordinate overworld vs combat systems.
import { RNG } from "./rng.js";

export const state = {
  scene: "setup",
  mode: "setup",         // "setup" | "overworld" | "combat" (set by combat.js on cave entry)
  players: [],            // {id,name,col,row,class,affinity,attrs:{A1,A2,A3},moveDie}
  activeIdx: 0,
  board: null,
  entrances: [],
  boss: null,             // {id,name,col,row,w,h}
  bossDeck: null,
  rng: new RNG(Date.now() & 0xffffffff),

  // turn control (legacy movement turns / overworld)
  pendingSteps: 0,        // remaining movement this turn
  rolledThisTurn: false,  // has the player pressed R this turn?
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

// --- collision helpers ---
export function isPlayerAt(col,row, excludeId=null){
  return state.players.some(p => p.id!==excludeId && p.col===col && p.row===row);
}
export function isBossAt(col,row){
  if (!state.boss) return false;
  // Boss is 1x2 vertical: occupies (col,row) and (col,row+1)
  return (col===state.boss.col && (row===state.boss.row || row===state.boss.row+1));
}
export function isCellBlocked(col,row, excludeId=null){
  // entrances are not blocking; players and boss are
  if (isPlayerAt(col,row, excludeId)) return true;
  if (excludeId !== state.boss?.id && isBossAt(col,row)) return true;
  return false;
}

