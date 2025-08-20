// /combat.js
// Boss only acts in boss phase; manual end-turn gate; d3 Advance; Burn scales with POW mod.
import { state } from "./state.js";
import { spellsFor, passivesFor } from "./spells_registry.js";
import { mountActionBar, updateActionBar } from "./action_bar.js";
import { renderBossPanel, syncBossPanel } from "./boss_panel.js";
import { beginTargeting, cancelTargeting, isTargeting } from "./targeting.js";

/* ------------------------ Helpers ------------------------ */
const MANUAL_TOKEN = Symbol("manual-end");       // prevents legacy auto-advance from firing boss

function ensurePlayerVitals(p){
  if (typeof p.hitDie !== "number") p.hitDie = 6;
  if (typeof p.hpMax !== "number") p.hpMax = p.hitDie * 2;
  if (typeof p.hp !== "number") p.hp = p.hpMax;
  if (!p.turn) p.turn = { action: 1, bonus: 1, moved: 0 };
}

function hasSpell(p, id){
  const list = spellsFor(p.classId, p.affinity, p.attrs);
  return list.some(s => s.id === id);
}

function hasPassive(p, id){
  const list = passivesFor(p.classId, p.affinity, p.attrs);
  return list.some(ps => ps.id === id);
}

function currentPlayer(){ return state.players[state.turnIdx % state.players.length]; }
function abilityMod(score){ return Math.floor((Number(score || 0) - 10) / 2); }

/* ------------------------ Cue stack ------------------------ */
let cueStack = null;
function ensureCueStack(){
  if (!cueStack){
    cueStack = document.getElementById("cue-stack");
    if (!cueStack){
      cueStack = document.createElement("div");
      cueStack.id = "cue-stack";
      document.body.appendChild(cueStack);
    }
  }
}
function cue(text){
  ensureCueStack();
  const n = document.createElement("div");
  n.className = "cue-item";
  n.textContent = text;
  cueStack.appendChild(n);
  setTimeout(()=> n.remove(), 2200);
}

/* ------------------------ UI Sync ------------------------ */
function syncUI(){
  const p = currentPlayer();
  updateActionBar({
    inCombat: state.mode === "combat",
    player: {
      name: p.name, hp: p.hp, hpMax: p.hpMax,
      action: p.turn.action, bonus: p.turn.bonus,
      canBurn: hasSpell(p, "burn_dot") && p.turn.action > 0 && !isTargeting(),
      canInferno: hasPassive(p, "inferno") && p.turn.bonus > 0 && !isTargeting(),
    },
    boss: {
      name: state.boss?.name ?? "—",
      hp: state.boss?.hp ?? 0, hpMax: state.boss?.hpMax ?? 0,
    },
  });
  syncBossPanel();
}

/* ------------------------ Spells ------------------------ */
function targetAndCastBurn(){
  const p = currentPlayer();
  if (!hasSpell(p, "burn_dot")) { cue(`${p.name} cannot cast Burn.`); return; }
  if (p.turn.action <= 0) { cue(`${p.name} has no actions left.`); return; }

  // Toggle: second click cancels targeting
  if (isTargeting()){
    cancelTargeting(); cue("Targeting cancelled."); syncUI(); return;
  }

  const origin = { col: p.col, row: p.row };
  const okTile = (c,r) => intersectsBoss(c,r);
  beginTargeting({
    range: 7,
    origin,
    canTarget: okTile,
    onSelect: ({col,row}) => {
      if (!okTile(col,row)){ cue("No valid target."); return; }
      applyBurnFrom(p);
      p.turn.action -= 1;
      cue(`${p.name} casts Burn on ${state.boss.name}.`);
      syncUI();
    },
    onCancel: () => { syncUI(); }
  });
}

function castInferno(){
  const p = currentPlayer();
  if (!hasPassive(p, "inferno")) { cue(`${p.name} cannot use Inferno.`); return; }
  if (p.turn.bonus <= 0) { cue(`${p.name} has no bonus actions left.`); return; }

  // Apply Inferno effect - enhance next fire spell
  if (!p.effects) p.effects = [];
  p.effects.push({ kind: "inferno_next", remaining: 1 });
  p.turn.bonus -= 1;
  
  cue(`${p.name} channels Inferno! Next fire spell will be enhanced.`);
  syncUI();
}

function intersectsBoss(col,row){
  const b = state.boss; if (!b) return false;
  const w = b.w || 1, h = b.h || 2;
  const c0 = b.col ?? 1, r0 = b.row ?? 1;
  return (col >= c0 && col < c0 + w && row >= r0 && row < r0 + h);
}

function applyBurnFrom(p){
  // Check for Inferno enhancement
  const infernoEffect = p.effects?.find(eff => eff.kind === "inferno_next");
  const isInfernoEnhanced = !!infernoEffect;
  
  // Immediate application damage (does not consume duration)
  let baseDamage = 1;
  if (isInfernoEnhanced) {
    baseDamage = 3; // Enhanced by Inferno
    cue(`Inferno enhancement: Burn deals extra damage!`);
  }
  
  state.boss.hp = Math.max(0, (state.boss.hp ?? 0) - baseDamage);
  const pow = p.attrs?.POW ?? 8;
  const dur = Math.max(0, abilityMod(pow)); // duration = POW mod; countdown begins next boss turn
  const s = state.boss.statuses || (state.boss.statuses = []);
  
  let burnAmount = 1;
  if (isInfernoEnhanced) {
    burnAmount = 2; // Enhanced DoT amount
  }
  
  s.push({ kind: "burn", amount: burnAmount, remaining: dur, source: p.name ?? p.id });
  syncBossPanel();
  cue(`Boss takes ${baseDamage} burn damage (application).`);
  
  // Consume Inferno effect
  if (isInfernoEnhanced) {
    p.effects = p.effects.filter(eff => eff.kind !== "inferno_next");
    cue(`Inferno effect consumed.`);
    
    // Inferno radiates damage to nearby enemies (and potentially allies)
    cue(`Inferno radiates fire damage around ${p.name}!`);
  }
}

/* ------------------------ Turn & Boss Phase ------------------------ */
function endTurnInternal(){
  // rotate to next player; boss phase only after last player
  state.turnIdx = (state.turnIdx + 1) % state.players.length;
  const wrapped = state.turnIdx === 0;
  if (wrapped){
    bossPhase();
    state.round += 1;
    cue(`Round ${state.round} begins.`);
  }
  const p = currentPlayer();
  p.turn = { action: 1, bonus: 1, moved: 0 };
  syncUI();
}

/** Public manual end-turn; only this path is allowed to run boss phase. */
export function manualEndTurn(){
  if (state.mode !== "combat") return;
  endTurn({ token: MANUAL_TOKEN });
}

/** Legacy-friendly facade: if someone else calls endTurn() without the token (e.g., on movement=0), ignore. */
export function endTurn(opts = {}){
  if (state.mode !== "combat") return;
  if (opts.token !== MANUAL_TOKEN) {
    // Ignore auto-advance attempts during combat.
    cue("(ignored auto end-turn)");
    return;
  }
  endTurnInternal();
}

function bossPhase(){
  // Start-of-boss-turn ticks
  let totalBurn = 0;
  if (Array.isArray(state.boss.statuses)){
    for (const st of state.boss.statuses){
      if (st.kind === "burn" && st.remaining > 0){
        totalBurn += st.amount;
        st.remaining -= 1;
      }
    }
    state.boss.statuses = state.boss.statuses.filter(st => st.remaining > 0);
  }
  if (totalBurn > 0){
    state.boss.hp = Math.max(0, state.boss.hp - totalBurn);
    cue(`Boss takes ${totalBurn} burn damage.`);
  }

  // Draw/resolve boss card
  const card = drawBossCard();
  if (card){
    cue(`Boss draws: ${card.name}.`);
    resolveBossCard(card);
  }
}

/* ------------------------ Boss Deck & Movement ------------------------ */
function drawBossCard(){
  const deck = state.boss.deck;
  if (!deck) return null;
  if (deck.draw.length === 0){
    deck.draw = shuffle(deck.discard);
    deck.discard = [];
  }
  const card = deck.draw.shift() || null;
  if (card) deck.current = card;
  return card;
}

function resolveBossCard(card){
  switch(card.id){
    case "advance": {
      const steps = rollDie(state.boss.movementDie || "d3"); // roll d3
      moveBossTowardNearest(steps);
      cue(`Boss moves ${steps} tile${steps===1?"":"s"} toward the nearest player.`);
      state.boss.deck.discard.push(card);
      break;
    }
    default:
      state.boss.deck.discard.push(card);
  }
}

function rollDie(spec){
  const m = /^d(\d+)$/i.exec(String(spec || ""));
  const sides = m ? Math.max(1, parseInt(m[1], 10)) : 3;
  return 1 + Math.floor(Math.random() * sides);
}

function moveBossTowardNearest(steps){
  const boss = state.boss;
  const gridN = state.grid?.cells ?? 15;
  const target = nearestPlayerToBoss(); if (!target) return;

  for (let s=0; s<steps; s++){
    const dx = target.col - boss.col;
    const dy = target.row - boss.row;
    if (dx === 0 && dy === 0) break;

    let nextCol = boss.col, nextRow = boss.row;
    if (Math.abs(dx) >= Math.abs(dy)) nextCol += Math.sign(dx);
    else nextRow += Math.sign(dy);

    if (!isBossStepBlocked(nextCol, nextRow, gridN)){
      boss.col = nextCol; boss.row = nextRow;
    } else {
      // try the other axis
      const altCol = boss.col + Math.sign(dx);
      const altRow = boss.row + Math.sign(dy);
      const tryCol = (Math.abs(dx) < Math.abs(dy)) ? altCol : boss.col;
      const tryRow = (Math.abs(dx) < Math.abs(dy)) ? boss.row : altRow;
      if (!isBossStepBlocked(tryCol, tryRow, gridN)){
        boss.col = tryCol; boss.row = tryRow;
      } else {
        break; // stuck
      }
    }
  }
}

function isBossStepBlocked(col, row, gridN){
  const b = state.boss;
  const w = b.w || 1, h = b.h || 2;
  if (col < 1 || row < 1 || (col + w - 1) > gridN || (row + h - 1) > gridN) return true;
  for (const p of state.players){
    if (rectsOverlap(col, row, w, h, p.col, p.row, 1, 1)) return true;
  }
  return false;
}
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh){
  return (ax < bx + bw) && (ax + aw > bx) && (ay < by + bh);
}
function nearestPlayerToBoss(){
  const b = state.boss; if (!b) return null;
  let best = null, bestDist = Infinity;
  for (const p of state.players){
    const d = Math.abs(b.col - p.col) + Math.abs(b.row - p.row);
    if (d < bestDist){ best = p; bestDist = d; }
  }
  return best;
}

/* ------------------------ Boot ------------------------ */
function startCaveCombat(){
  if (state.mode === "combat") return;
  state.mode = "combat";
  state.round = 1;
  state.turnIdx = 0;

  // Ensure boss defaults; keep placement if already set
  state.boss = Object.assign(
    { id:"bear", name:"Bear", hp:100, hpMax:100, statuses:[], w:1, h:2, col: state.boss?.col ?? 8, row: state.boss?.row ?? 8 },
    state.boss || {}
  );
  // Boss deck: single Advance; d3 movement
  state.boss.movementDie = "d3";
  state.boss.deck = { draw:[{ id:"advance", name:"Advance toward nearest" }], discard:[], current:null };

  for (const p of state.players) ensurePlayerVitals(p);
  renderBossPanel();

  mountActionBar({
    onBurn: targetAndCastBurn,
    onInferno: castInferno,
    onEndTurn: manualEndTurn, // IMPORTANT: manual path only
  });

  cue("Combat started. Round 1.");
  syncUI();
}

export function initCombatHooks(){
  document.addEventListener("cave:entered", startCaveCombat);
  // @ts-ignore for quick manual testing
  window.__startCaveCombat = startCaveCombat;
  // Optional: allow manual end-turn via keyboard "E"
  window.addEventListener("keydown", (e) => {
    if (state.mode === "combat" && (e.key === "e" || e.key === "E")){
      manualEndTurn();
    }
  });
}



