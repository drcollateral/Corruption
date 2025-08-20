// /cave.js
// Enter cave and start COMBAT mode; combat loop (combat.js) owns boss turns.
// UPDATED: sets state.mode="combat" immediately and dispatches "cave:entered".
import { state, setScene, resetTurnFlags, isPlayerAt } from "./state.js";
import { BossDeck } from "./boss_deck.js";
import { flashBossDraw } from "./flash.js";
import { renderDeckModal } from "./modal.js";
import { BOSS_DECKS } from "./boss_cards.js";

export function enterCave(){
  setScene("cave");
  state.mode = "combat";                           // ⬅ immediately mark combat mode
  const board = state.board;
  board.clear();

  // Place players in small cluster
  const startCol = 3, startRow = 3;
  state.players.forEach((p,i)=>{
    const col = startCol + (i%2);
    const row = startRow + Math.floor(i/2);
    p.col = col; p.row = row;
    const el = board.placeToken(p.id, { col, row, w:1, h:1, cls:"player", label:p.name });
    el.classList.toggle("active", i===state.activeIdx);
  });

  // Bear boss (1x2) near bottom center
  const bossCol = Math.ceil(board.size/2), bossRow = board.size - 3;
  state.boss = { id:"B:Bear", name:"Bear", col:bossCol, row:bossRow, w:1, h:2 };
  board.placeToken(state.boss.id, { col:bossCol, row:bossRow, w:1, h:2, cls:"boss", label:"Bear" });

  // Boss deck via registry (legacy viewer only; combat.js runs the real deck)
  const bearDeck = BOSS_DECKS.BEAR?.cards ?? [{ id:"advance1", name:"Advance 1", desc:"Move 1 tile toward nearest player", count:5 }];
  state.bossDeck = new BossDeck(state.rng, bearDeck);

  state.entrances = [];
  document.getElementById("btn-boss-deck").hidden = false;
  document.getElementById("context-text").textContent = "Cave: press R to roll movement.";

  // Reset legacy flags (harmless)
  const tiebreaks = new Map();
  state.players.forEach(p => tiebreaks.set(p.id, state.rng.int(1, p.moveDie ?? 4)));
  state.players.sort((a,b)=>{
    const dieCmp = (a.moveDie??4) - (b.moveDie??4);
    if (dieCmp !== 0) return dieCmp;
    return (tiebreaks.get(b.id) - tiebreaks.get(a.id));
  });
  state.activeIdx = 0;
  resetTurnFlags();

  renderDeckModal();

  // 🔔 Notify combat system to boot its loop/UI now that we're in cave.
  document.dispatchEvent(new CustomEvent("cave:entered"));
}

function nearestPlayerToBoss(){
  const b = state.boss; if (!b) return null;
  let best = null, bestDist = Infinity;
  for (const p of state.players){
    const d = Math.abs(p.col - b.col) + Math.abs(p.row - b.row);
    if (d < bestDist){ bestDist = d; best = p; }
  }
  return best;
}

export function bossStepToward(target, steps){
  const b = state.boss; if(!b || !target) return;
  for (let s=0;s<steps;s++){
    let nc=b.col, nr=b.row;
    const dc = target.col - b.col, dr = target.row - b.row;
    if (Math.abs(dc) >= Math.abs(dr)) nc += Math.sign(dc); else nr += Math.sign(dr);

    // bound
    nc = Math.max(1, Math.min(state.board.size, nc));
    nr = Math.max(1, Math.min(state.board.size-1, nr)); // -1 for 1x2 height

    // collision vs players: check both occupied cells
    if (isPlayerAt(nc,nr) || isPlayerAt(nc,nr+1)) continue;

    b.col = nc; b.row = nr;
    state.board.moveToken(b.id, nc, nr);
  }
}

// Legacy bossTurn kept for overworld experiments; hard-guarded during combat.
export function bossTurn(){
  if (state.mode === "combat") return;             // ⬅ never run during combat
  // (rest unchanged if you still use this elsewhere)
  const card = state.bossDeck?.draw?.(); if (!card) return;
  flashBossDraw(`Boss draws: ${card.name}`);
  if (card.id === "advance1"){
    const t = nearestPlayerToBoss();
    bossStepToward(t, 1);
  }
  renderDeckModal();
}





