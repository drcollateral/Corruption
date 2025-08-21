// /combat.js
// Boss only acts in boss phase; manual end-turn gate; d3 Advance; Burn scales with POW mod.
import { state, isCellBlocked } from "../core/GameState.js";
import { spellsFor, passivesFor, ATTRIBUTE_SPELLS, SPELL_ID_ALIASES } from "../data/SpellRegistry.js";
import { mountActionBar, updateActionBar } from "../ui/ActionBar.js";
import { renderBossPanel, syncBossPanel, bossLog } from "../ui/BossPanel.js";
import { beginTargeting, cancelTargeting, isTargeting, beginTileSelection } from "../systems/TargetingSystem.js?v=24";
import { runInfernoRing, playBurnApplication, addBurnDebuffOverlay, playBurnTick, removeBurnDebuffOverlay, updateBurnOverlayPositions } from "../systems/EffectSystem.js";
import { addBuff, hasBuff, consumeBuff, getBuff, tickBuffs } from "../systems/BuffSystem.js";
import { BossFactory, BossEntity } from "../entities/BossEntity.js";
import { updatePlayerSpriteDirection } from "../data/PlayerSprites.js";
import { setupBossObservers } from "../systems/BossObservers.js";
import { ensureCueStack, removeCue, dieSides, fadeRemoveCue } from "../utils/CueService.js";
import { cueService } from "../utils/CueService.js";
import { events, store } from "../core/EventBus.js";
import { animationScheduler } from "../utils/AnimationScheduler.js";
import { renderParty } from "../ui/PartyPanel.js";

/* ------------------------ Combat Event Queue ------------------------ */
let combatEventQueue = [];
let isProcessingEvents = false;
let combatEventClickHandler = null;

function queueCombatEvent(eventFn, delay = 800, description = "", autoAdvance = false) {
  combatEventQueue.push({ eventFn, delay, description, autoAdvance });
  if (!isProcessingEvents) {
    processCombatEventQueue();
  }
}

async function processCombatEventQueue() {
  if (isProcessingEvents || combatEventQueue.length === 0) return;
  
  isProcessingEvents = true;
  
  while (combatEventQueue.length > 0) {
    const event = combatEventQueue.shift();
    
    if (event.description) {
      console.log(`Processing combat event: ${event.description}`);
    }
    
    // Execute the event
    await event.eventFn();
    
    // Between events: either auto-advance (optional delay) or require a click
    if (combatEventQueue.length > 0) {
      if (event.autoAdvance) {
        if (event.delay && event.delay > 0) {
          await new Promise(r => setTimeout(r, event.delay));
        }
      } else {
        await waitForClick();
      }
    }
  }
  
  isProcessingEvents = false;
}

function waitForClick() {
  if (state.mode !== 'combat') return Promise.resolve();
  return new Promise(resolve => {
    const handler = () => {
      document.removeEventListener('click', handler, true);
      if (lastInfoCue) lastInfoCue.classList.remove('click-to-advance');
      resolve();
    };
    // Capture so any click advances
    setTimeout(() => document.addEventListener('click', handler, true), 0);
    // Add hint to current info cue if present
    if (lastInfoCue) {
      lastInfoCue.classList.add('click-to-advance');
      lastInfoCue.style.cursor = 'pointer';
      lastInfoCue.addEventListener('click', (e) => { e.stopPropagation(); handler(); }, { once: true });
    }
  });
}

function clearCombatEventQueue() {
  combatEventQueue = [];
  isProcessingEvents = false;
  if (combatEventClickHandler) {
    document.removeEventListener('click', combatEventClickHandler);
    combatEventClickHandler = null;
  }
}

/* ------------------------ Helpers ------------------------ */
const MANUAL_TOKEN = Symbol("manual-end");       // prevents legacy auto-advance from firing boss

function ensurePlayerVitals(p){
  if (typeof p.hitDie !== "number") p.hitDie = 6;
  if (typeof p.hpMax !== "number") p.hpMax = p.hitDie * 2;
  if (typeof p.hp !== "number") p.hp = p.hpMax;
  if (!p.turn) p.turn = { action: 1, bonus: 1, moved: 0 };
}

function resolveSpellId(id){
  return (SPELL_ID_ALIASES && SPELL_ID_ALIASES[id]) || id;
}
function hasSpell(p, id){
  const canon = resolveSpellId(id);
  const all = spellsFor(p.classId, p.affinity, p.attrs);
  return all.some(s => s.id === canon);
}

function hasPassive(p, id){
  const list = passivesFor(p.classId, p.affinity, p.attrs);
  return list.some(ps => ps.id === id);
}

function currentPlayer(){ return state.players[state.turnIdx % state.players.length]; }
function abilityMod(score){ return Math.floor((Number(score || 0) - 10) / 2); }

/* ------------------------ Cue stack ------------------------ */
// Set up cue service with boss logging
cueService.setLogHandler(bossLog);

// Smart automatic cue system - categorizes by context and applies appropriate timing
let lastInfoCue = null; // Keep for compatibility but deprecate usage
function cue(text, className=""){
  // Categorize cue type based on content patterns
  const cueType = categorizeCueByContent(text);
  
  switch(cueType) {
    case 'error':
      // Errors need user acknowledgment
      const { el: errorEl } = cueService.sticky(text, { className });
      lastInfoCue = errorEl;
      break;
    case 'quick-feedback':
      // Quick feedback should disappear fast (0.8s)
      const { el: quickEl } = cueService.announce(text, { className, duration: 800 });
      lastInfoCue = quickEl;
      break;
    case 'spell-cast':
      // Spell casts should auto-advance quickly (1.5s)
      const { el: spellEl } = cueService.announce(text, { className, duration: 1500 });
      lastInfoCue = spellEl;
      break;
    case 'damage':
      // Damage numbers should be brief (1s)
      const { el: damageEl } = cueService.announce(text, { className, duration: 1000 });
      lastInfoCue = damageEl;
      break;
    case 'status-effect':
      // Status effects should display medium duration (2s)
      const { el: statusEl } = cueService.announce(text, { className, duration: 2000 });
      lastInfoCue = statusEl;
      break;
    case 'not-implemented':
      // Development messages need attention
      const { el: devEl } = cueService.sticky(text, { className });
      lastInfoCue = devEl;
      break;
    default:
      // General info should auto-advance (1.5s)
      const { el: infoEl } = cueService.announce(text, { className, duration: 1500 });
      lastInfoCue = infoEl;
  }
}

// Content-based cue categorization for automatic timing
function categorizeCueByContent(text) {
  const lowerText = text.toLowerCase();
  
  // Error conditions that need user attention
  if (lowerText.includes('not your turn') || 
      lowerText.includes('no actions left') || 
      lowerText.includes('no valid target') || 
      lowerText.includes('cannot use') ||
      lowerText.includes('has no attack spells') ||
      lowerText.includes('already primed')) {
    return 'error';
  }
  
  // Quick feedback messages (shorter than general)
  if (lowerText.includes('cancelled') || 
      lowerText.includes('targeting')) {
    return 'quick-feedback';
  }
  
  // Spell casting actions
  if (lowerText.includes('casts') || 
      lowerText.includes('primes')) {
    return 'spell-cast';
  }
  
  // Damage and combat results
  if (lowerText.includes('hits') && (lowerText.includes('for') || lowerText.includes('damage')) ||
      lowerText.includes('detonates') ||
      lowerText.includes('pulse')) {
    return 'damage';
  }
  
  // Status effects and burning
  if (lowerText.includes('burning') && lowerText.includes('turns')) {
    return 'status-effect';
  }
  
  // Development placeholders
  if (lowerText.includes('not yet implemented')) {
    return 'not-implemented';
  }
  
  return 'general';
}

// Toggle the white outline on the active player's tile (combat mode)
function setActiveTokenOutlineForPlayerId(idOrNull){
  if (!state.board) return;
  for (const [id, el] of state.board.tokens.entries()){
    if (!el.classList.contains('player')) continue;
    el.classList.toggle('active', Boolean(idOrNull) && id === idOrNull);
  }
}

// Helper for explicit click-anywhere gating cues when needed in-flow
async function cueClickAnywhere(text){
  const { wait } = cueService.clickToContinue(text);
  await wait;
}

// Boss card sequence cues centralized in cues.js via createCueSequence

/* ------------------------ UI Sync ------------------------ */
function syncUI(){
  const p = currentPlayer();
  const hasInfernoActive = hasBuff(p, 'inferno_primed');
  const allSpells = spellsFor(p.classId, p.affinity, p.attrs);
  const actions = allSpells.filter(s => !s.actionType || s.actionType === 'action');
  const bonusSpells = allSpells.filter(s => s.actionType === 'bonus');
  const bonuses = [...bonusSpells];
  const canCastBurn = state.isPlayerTurn && hasSpell(p, "burn") && p.turn.action > 0 && !isTargeting();
  const canMove = state.isPlayerTurn && (p.turn.moved === 0);
  updateActionBar({
    inCombat: state.mode === "combat",
    player: {
      name: p.name, hp: p.hp, hpMax: p.hpMax,
      action: p.turn.action, bonus: p.turn.bonus,
      canMove,
      canBurn: canCastBurn,
      canInferno: state.isPlayerTurn && hasSpell(p, "inferno") && p.turn.bonus > 0 && !isTargeting() && !hasInfernoActive,
      canEndTurn: state.isPlayerTurn,
      hasInferno: hasInfernoActive,
    },
    actions: actions.map(s => ({ id:s.id, name:s.name, enabled: state.isPlayerTurn && p.turn.action>0 && !isTargeting() })),
    bonuses: bonuses.map(bs => ({ id:bs.id, name:bs.name, enabled: state.isPlayerTurn && p.turn.bonus>0 && !isTargeting() && (bs.id!=="inferno" || !hasInfernoActive) })),
    boss: { name: state.boss?.name ?? "—", hp: state.boss?.hp ?? 0, hpMax: state.boss?.hpMax ?? 0 },
  });
  syncBossPanel();
  // Keep the white outline in sync with the current turn
  try {
    setActiveTokenOutlineForPlayerId(state.isPlayerTurn ? p.id : null);
  } catch {}
}

function targetAndCastBurn(){
  const p = currentPlayer();
  if (!state.isPlayerTurn) { cue("Not your turn."); return; }
  const hasBurn = hasSpell(p, "burn");
  if (!hasBurn) { 
    cue(`${p.name} has no attack spells available.`); 
    return; 
  }
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
      
      // Burn only (no immediate pulse - will pulse at turn start if Inferno stacks exist)
      applyBurnFrom(p);
      cue(`${p.name} casts Burn on ${state.boss.name}.`);
      
      p.turn.action -= 1;
      syncUI();
    },
    onCancel: () => { syncUI(); }
  });
}

function castInferno(){
  const p = currentPlayer();
  if (!state.isPlayerTurn) { cue("Not your turn."); return; }
  if (!hasSpell(p, "inferno")) { cue(`${p.name} cannot use Inferno.`); return; }
  if (p.turn.bonus <= 0) { cue(`${p.name} has no bonus actions left.`); return; }
  if (hasBuff(p, 'inferno_primed')) { cue(`Inferno already primed.`); return; }

  addBuff(p, 'inferno_primed', { stacks: 1 });
  p.turn.bonus -= 1;

  cue(`${p.name} primes Inferno: Burn will detonate immediately and pulse for 2.`);
  syncUI();
}

function handleActionButton(id){
  if (!state.isPlayerTurn) { cue("Not your turn."); return; }
  // For now, only Burn is implemented with targeting; others cue placeholder
  if (id === 'burn') {
    targetAndCastBurn();
    return;
  }
  const p = currentPlayer();
  if (p.turn.action <= 0) { cue(`${p.name} has no actions left.`); return; }
  cue(`Action '${id}' is not yet implemented.`);
}

function handleBonusButton(id){
  if (!state.isPlayerTurn) { cue("Not your turn."); return; }
  if (id === 'inferno') { castInferno(); return; }
  const p = currentPlayer();
  if (p.turn.bonus <= 0) { cue(`${p.name} has no bonus actions left.`); return; }
  cue(`Bonus '${id}' is not yet implemented.`);
}

function intersectsBoss(col,row){
  if (!state.boss) return false;
  return state.boss.intersects(col, row);
}

function triggerInfernoPulse(caster){
  const infernoBuff = getBuff(caster, 'inferno');
  if (!infernoBuff || !infernoBuff.stacks) return; // No Inferno stacks
  
  // Escalating pulse damage
  if (typeof state.infernoPulse !== 'number') state.infernoPulse = 2;
  const pulse = state.infernoPulse;
  const dealt = [];
  
  // Damage boss
  if (state.boss) { 
    state.boss.hp = Math.max(0, (state.boss.hp ?? 0) - pulse); 
    dealt.push(state.boss.name || "Boss"); 
  }
  
  // Damage other players (not the caster)
  for (const pl of state.players || []){
    if (pl === caster) continue; // exclude caster
    ensurePlayerVitals(pl);
    pl.hp = Math.max(0, (pl.hp ?? pl.hpMax ?? 0) - pulse);
    dealt.push(pl.name || pl.id || "Ally");
  }
  
  if (dealt.length) {
    cue(`Inferno pulse hits ${dealt.join(", ")} for ${pulse}.`);
    runInfernoRing({ col: caster.col, row: caster.row });
  }
  
  state.infernoPulse = pulse + 1; // Escalate for next pulse
  syncBossPanel();
  try { renderParty(); } catch {}
}

function applyBurnFrom(p){
  const infernoPrimed = hasBuff(p, 'inferno_primed');
  
  if (!state.boss) return;
  
  // Debug: Check boss position
  console.log('Boss position:', state.boss.col, state.boss.row);
  
  // Play burn application animation on boss
  playBurnApplication(state.boss.col, state.boss.row, state.boss.w, state.boss.h);
  
  // Immediate application damage (always 1 on application)
  const baseDamage = 1;
  state.boss.takeDamage(baseDamage, p);
  // Visual feedback from damage number, no cue needed

  const pow = p.attrs?.POW ?? 8;
  const dur = Math.max(0, abilityMod(pow));
  const tickAmount = 1;

  if (infernoPrimed) {
    // Detonate the freshly-applied Burn immediately
    const detonate = tickAmount * dur;
    if (detonate > 0) {
      state.boss.takeDamage(detonate, p);
      cue(`Inferno detonates Burn for ${detonate} immediate damage.`);
    } else {
      cue(`Inferno detonates, but there was no pending Burn damage to convert.`);
    }

    // Consume the primed buff and add a persistent Inferno stack
    consumeBuff(p, 'inferno_primed', 1);
    addBuff(p, 'inferno', { stacks: 1 });

    // Trigger Inferno pulse (detonation effect)
    triggerInfernoPulse(p);
  } else {
    // Normal Burn DoT using boss entity
    state.boss.addStatus({ 
      kind: "burn", 
      amount: tickAmount, 
      remaining: dur, 
      source: p.name ?? p.id 
    });
    
    cue(`Boss is burning! (${dur} turns)`);
  }
  syncBossPanel();
}

/* ------------------------ Turn & Boss Phase ------------------------ */
function endTurnInternal(){
  // Advance pointer and begin next turn; increment round on wrap
  const len = state.turnOrder.length || 1;
  state.turnPtr = (state.turnPtr + 1) % len;
  if (state.turnPtr === 0) {
    state.round += 1;
    const { wait } = cueService.clickToContinue(`Round ${state.round} begins.`);
    // Note: Don't await here as this should be non-blocking
    // Removed incorrect Inferno animation at round start.
  }
  beginTurnAtCurrentPtr();
}

function beginTurnAtCurrentPtr(){
  const slot = state.turnOrder[state.turnPtr];
  if (!slot) return;
  if (slot.kind === 'boss'){
    state.isPlayerTurn = false;
  // Remove active outline from players during boss turn
  setActiveTokenOutlineForPlayerId(null);
    bossPhase();
    return;
  }
  // Player turn setup
  state.turnIdx = slot.idx;
  const p = currentPlayer();
  p.turn = { action: 1, bonus: 1, moved: 0 };
  // Clear any remaining turn-based effects at start of player's turn
  if (p.effects) p.effects = p.effects.filter(eff => eff.kind !== "inferno_next");
  
  // Inferno pulse at start of turn
  triggerInfernoPulse(p);
  
  state.isPlayerTurn = true;
  // Replace any previous cue (e.g., boss turn) with player turn cue
  const { wait } = cueService.clickToContinue(`${p.name}'s turn begins.`);
  // Show white highlight around the active player's tile in combat
  setActiveTokenOutlineForPlayerId(p.id);
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
  clearCombatEventQueue();
  
  // Simple boss turn start
  queueCombatEvent(async () => {
    const { wait } = cueService.clickToContinue(`${state.boss.name}'s turn begins.`, { className: 'boss-card-cue' });
    await wait;
    
    // Reset per-turn flags  
    state.__bossFirstDrawShown = false;
    state.__bossMovedThisTurn = false;
    state.__bossDamageMult = (state.boss?.enrageNext ? 2 : 1);
    if (state.boss) state.boss.enrageNext = false;
  }, 800, "Boss turn start", true);
  
  // Process burn damage
  queueCombatEvent(async () => {
    if (!state.boss) return;
    
    const expiredStatuses = state.boss.tickStatuses();
    let totalBurn = 0;
    for (const status of state.boss.statuses) {
      if (status.kind === "burn") {
        totalBurn += status.amount || 0;
      }
    }
    
    if (totalBurn > 0) {
      state.boss.takeDamage(totalBurn, { name: "Burn" });
    }
  }, 1000, "Process burn damage");
  
  // Draw and resolve boss cards - SIMPLIFIED
  queueCombatEvent(async () => {
    let safety = 10;
    let next = drawBossCard();
    
    while (next && safety-- > 0) {
      // 1. Show what card was drawn - CLICK TO CONTINUE
      const { wait: waitDraw } = cueService.clickToContinue(`Boss draws: ${next.name}`, { className: 'boss-card-cue' });
      await waitDraw;
      
      // 2. Handle advance keyword first if present
      if (next.advance) {
        const { wait: waitAdvance } = cueService.clickToContinue("Advance!", { className: 'boss-card-cue' });
        await waitAdvance;
        await performAdvance();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // 3. Resolve the main card action with simple cues
      const cycle = await resolveBossCardSimple(next);
      
      // 4. Show cycle if needed
      if (cycle === 'cycle') {
        const { wait: waitCycle } = cueService.clickToContinue("Cycle!", { className: 'boss-card-cue' });
        await waitCycle;
      }
      
      // 5. Discard and check for next card
      state.boss.deck.discard.push(next);
      next = (cycle === 'cycle') ? drawBossCard() : null;
      
      if (next) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Boss turn end - AUTO ADVANCE to next turn
    const { wait: waitEnd } = cueService.clickToContinue(`${state.boss.name}'s turn ends.`, { className: 'boss-card-cue' });
    await waitEnd;
    endTurnInternal();
  }, 1200, "Draw and resolve boss cards");
}/* ------------------------ Boss Deck & Movement ------------------------ */
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

// ---- Boss helpers (keywords and attacks) ----
function bossAdjacentTo(p){
  const b = state.boss; if (!b || !p) return false;
  const bx1 = b.col, by1 = b.row;
  const bw = b.w || 1, bh = b.h || 1;
  const bx2 = bx1 + bw - 1, by2 = by1 + bh - 1;
  const px = p.col, py = p.row;
  // Manhattan distance from point to rectangle (grid)
  const dx = px < bx1 ? (bx1 - px) : (px > bx2 ? (px - bx2) : 0);
  const dy = py < by1 ? (by1 - py) : (py > by2 ? (py - by2) : 0);
  return (dx + dy) === 1;
}

function dealDamageToPlayer(p, amount, { reason = "" } = {}){
  ensurePlayerVitals(p);
  const mult = (state.__bossDamageMult || 1);
  const dmg = Math.max(0, Math.floor(amount * mult));
  p.hp = Math.max(0, (p.hp ?? p.hpMax ?? 0) - dmg);
  // Red damage cue and quick fade so it doesn't linger over boss cues
  cue(`Boss deals ${dmg} to ${p.name}. ${reason}`.trim(), 'damage-cue');
  const thisCue = lastInfoCue; // capture
  setTimeout(() => fadeRemoveCue(thisCue), 600);
  // Floating damage on the player token + shake
  try { showPlayerDamage(p, dmg); } catch {}
  try { renderParty(); } catch {}
}

// Visual feedback for player damage
function showPlayerDamage(player, amount){
  if (!state.board) return;
  const token = state.board.getToken(player.id);
  if (!token) return;
  const dn = document.createElement('div');
  dn.className = 'damage-number';
  dn.textContent = `-${amount}`;
  token.appendChild(dn);
  // shake
  token.classList.remove('damage-shake');
  token.offsetHeight; // reflow
  token.classList.add('damage-shake');
  setTimeout(()=> token.classList.remove('damage-shake'), 500);
  setTimeout(()=> dn.remove(), 1200);
}

async function performAdvance(){
  const steps = rollDie(state.boss.movementDie || "d3");
  await animatedMoveBossTowardNearest(steps);
  state.__bossMovedThisTurn = true;
}

async function animatedMoveBossTowardNearest(steps) {
  const boss = state.boss;
  if (!boss) return 0;
  
  const gridN = state.grid?.cells ?? 15;
  const target = nearestPlayerToBoss(); 
  if (!target) return 0;
  
  let moved = 0;

  // Slide in one go like a charge/advance (not step-by-step)
  let destCol = boss.col;
  let destRow = boss.row;
  for (let s = 0; s < steps; s++) {
    const dx = target.col - destCol;
    const dy = target.row - destRow;
    if (dx === 0 && dy === 0) break;
    let nextCol = destCol, nextRow = destRow;
    if (Math.abs(dx) >= Math.abs(dy)) nextCol += Math.sign(dx);
    else nextRow += Math.sign(dy);
    if (!isBossStepBlocked(nextCol, nextRow, gridN)) {
      destCol = nextCol; destRow = nextRow; moved += 1;
    } else {
      const altCol = destCol + Math.sign(dx);
      const altRow = destRow + Math.sign(dy);
      const tryCol = (Math.abs(dx) < Math.abs(dy)) ? altCol : destCol;
      const tryRow = (Math.abs(dx) < Math.abs(dy)) ? destRow : altRow;
      if (!isBossStepBlocked(tryCol, tryRow, gridN)) { destCol = tryCol; destRow = tryRow; moved += 1; }
      else break;
    }
  }
  if (moved > 0) {
    boss.moveTo(destCol, destRow, true);
    state.__bossMovedThisTurn = true;
    // Let the CSS transition complete; duration scales slightly by distance
    const dur = Math.min(700, 250 + moved * 150);
    await new Promise(r => setTimeout(r, dur));
  }
  return moved;
}

async function tryCharge(maxSteps){
  const target = nearestPlayerToBoss(); if (!target) return false;
  const gridN = state.grid?.cells ?? 15;
  let destCol = state.boss.col;
  let destRow = state.boss.row;
  let steps = maxSteps;
  while (steps-- > 0){
    const dx = Math.sign(target.col - destCol);
    const dy = Math.sign(target.row - destRow);
    const horiz = Math.abs(target.col - destCol) >= Math.abs(target.row - destRow);
    const nextCol = destCol + (horiz ? dx : 0);
    const nextRow = destRow + (horiz ? 0 : dy);
    if (!isBossStepBlocked(nextCol, nextRow, gridN)){
      destCol = nextCol; destRow = nextRow;
      if (Math.max(Math.abs(target.col - destCol), Math.abs(target.row - destRow)) <= 1) break;
    } else break;
  }
  if (destCol !== state.boss.col || destRow !== state.boss.row){
    state.boss.moveTo(destCol, destRow, true);
    state.__bossMovedThisTurn = true;
    const d = Math.abs(destCol - state.boss.col) + Math.abs(destRow - state.boss.row);
    const dur = Math.min(700, 200 + d * 140);
    await new Promise(r => setTimeout(r, dur));
  }
  return bossAdjacentTo(target);
}

// Simple boss card resolver with clean cue flow
async function resolveBossCardSimple(card) {
  const target = nearestPlayerToBoss();
  let doCycle = false;
  
  switch(card.id) {
    case 'swipe': {
      const { wait: waitAttack } = cueService.clickToContinue("Swipe attack!", { className: 'boss-card-cue' });
      await waitAttack;
      
      if (target && state.boss.isAdjacentTo(target)) {
        dealDamageToPlayer(target, 4, { reason: '(Swipe)' });
      } else {
        const { wait: waitMiss } = cueService.clickToContinue("Swipe misses!", { className: 'boss-card-cue' });
        await waitMiss;
      }
      break;
    }
    
    case 'charge': {
      const { wait: waitCharge } = cueService.clickToContinue("Charge attack!", { className: 'boss-card-cue' });
      await waitCharge;
      
      const inRange = await tryCharge(4);
      
      if (inRange && target) {
        const { wait: waitConnect } = cueService.clickToContinue("Charge connects!", { className: 'boss-card-cue' });
        await waitConnect;
        dealDamageToPlayer(target, 2, { reason: '(Charge)' });
      } else {
        const { wait: waitFail } = cueService.clickToContinue("Charge fails!", { className: 'boss-card-cue' });
        await waitFail;
      }
      break;
    }
    
    case 'enrage': {
      if (state.__bossMovedThisTurn) {
        const { wait: waitFizzle } = cueService.clickToContinue("Enrage fizzles!", { className: 'boss-card-cue' });
        await waitFizzle;
        doCycle = true;
      } else {
        const { wait: waitEnrage } = cueService.clickToContinue("Boss becomes Enraged!", { className: 'boss-card-cue' });
        await waitEnrage;
        if (state.boss) state.boss.enrageNext = true;
      }
      break;
    }
    
    case 'roar': {
      const { wait: waitRoar } = cueService.clickToContinue("Terrifying Roar!", { className: 'boss-card-cue' });
      await waitRoar;
      
      // Apply movement penalty to players within 20 tiles
      for (const pl of state.players || []) {
        const d = Math.abs((state.boss?.col||0) - pl.col) + Math.abs((state.boss?.row||0) - pl.row);
        if (d <= 20) {
          pl.nextMovePenalty = (pl.nextMovePenalty || 0) + 2;
        }
      }
      
      const { wait: waitPenalty } = cueService.clickToContinue("Movement penalty applied!", { className: 'boss-card-cue' });
      await waitPenalty;
      doCycle = true;
      break;
    }
    
    default: {
      // Unknown card - no action
      break;
    }
  }
  
  if (card.cycle) doCycle = true;
  return doCycle ? 'cycle' : undefined;
}

async function resolveBossCardWithCues(card) {
  const target = nearestPlayerToBoss();
  
  let doCycle = false;
  switch(card.id){
    case 'swipe': {
      await cueService.clickToContinue("Swipe attack!", { className: 'boss-card-cue' });
      
      if (target && state.boss.isAdjacentTo(target)) {
        dealDamageToPlayer(target, 4, { reason: '(Swipe)' });
      } else {
  await cueService.clickToContinue("Swipe misses!", { className: 'boss-card-cue' });
      }
      break;
    }
    case 'charge': {
      await cueService.clickToContinue("Charge attack!", { className: 'boss-card-cue' });
      
      const inRange = await tryCharge(4); // slide like charging
      
      if (inRange && target) {
  await cueService.clickToContinue("Charge connects!", { className: 'boss-card-cue' });
        dealDamageToPlayer(target, 2, { reason: '(Charge)' });
      } else {
  await cueService.clickToContinue("Charge fails!", { className: 'boss-card-cue' });
      }
      break;
    }
  case 'enrage': {
      if (state.__bossMovedThisTurn) {
    await cueService.announce(["Enrage fizzles!"], { scope: 'boss-turn' });
        doCycle = true;
      } else {
    await cueService.clickToContinue("Boss becomes Enraged!", { className: 'boss-card-cue' });
        if (state.boss) state.boss.enrageNext = true;
      }
      break;
    }
  case 'roar': {
    await cueService.clickToContinue("Terrifying Roar!", { className: 'boss-card-cue' });
      
      // Apply movement penalty to players within 20 tiles
      for (const pl of state.players || []){
        const d = Math.abs((state.boss?.col||0) - pl.col) + Math.abs((state.boss?.row||0) - pl.row);
        if (d <= 20){
          pl.nextMovePenalty = (pl.nextMovePenalty || 0) + 2;
        }
      }
      
  await cueService.announce(["Movement penalty applied!"], { scope: 'boss-turn' });
      doCycle = true;
      break;
    }
    default: {
      // unknown/no-op
      break;
    }
  }
  
  if (card.cycle) doCycle = true;
  return doCycle ? 'cycle' : undefined;
}

async function resolveBossCard(card){
  const target = nearestPlayerToBoss();
  
  // If the card has the advance keyword, move first
  if (card.advance) {
    cue(`${card.name} includes Advance - boss will move first.`);
    await new Promise(resolve => setTimeout(resolve, 600));
    performAdvance();
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  let doCycle = false;
  switch(card.id){
    case 'swipe': {
      if (target && state.boss.isAdjacentTo(target)) {
        dealDamageToPlayer(target, 4, { reason: '(Swipe)' });
      }
      break;
    }
    case 'charge': {
      const inRange = tryCharge(4);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      if (inRange && target) {
        await new Promise(resolve => setTimeout(resolve, 300));
        dealDamageToPlayer(target, 2, { reason: '(Charge)' });
      }
      break;
    }
    case 'enrage': {
      if (state.__bossMovedThisTurn) {
        doCycle = true;
      } else {
        if (state.boss) state.boss.enrageNext = true;
      }
      break;
    }
    case 'roar': {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Apply movement penalty to players within 20 tiles
      for (const pl of state.players || []){
        const d = Math.abs((state.boss?.col||0) - pl.col) + Math.abs((state.boss?.row||0) - pl.row);
        if (d <= 20){
          pl.nextMovePenalty = (pl.nextMovePenalty || 0) + 2;
        }
      }
      doCycle = true;
      break;
    }
    default: {
      // unknown/no-op
      break;
    }
  }
  if (card.cycle) doCycle = true;
  return doCycle ? 'cycle' : undefined;
}

function rollDie(spec){
  const m = /^d(\d+)$/i.exec(String(spec || ""));
  const sides = m ? Math.max(1, parseInt(m[1], 10)) : 3;
  return 1 + Math.floor(Math.random() * sides);
}

function shuffle(arr){
  const a = Array.from(arr);
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function moveBossTowardNearest(steps){
  const boss = state.boss;
  if (!boss) return 0;
  
  const gridN = state.grid?.cells ?? 15;
  const target = nearestPlayerToBoss(); if (!target) return 0;
  let moved = 0;

  for (let s=0; s<steps; s++){
    const dx = target.col - boss.col;
    const dy = target.row - boss.row;
    if (dx === 0 && dy === 0) break;

    let nextCol = boss.col, nextRow = boss.row;
    if (Math.abs(dx) >= Math.abs(dy)) nextCol += Math.sign(dx);
    else nextRow += Math.sign(dy);

  if (!isBossStepBlocked(nextCol, nextRow, gridN)){
    boss.moveTo(nextCol, nextRow);
    moved += 1;
    } else {
      // try the other axis
      const altCol = boss.col + Math.sign(dx);
      const altRow = boss.row + Math.sign(dy);
      const tryCol = (Math.abs(dx) < Math.abs(dy)) ? altCol : boss.col;
      const tryRow = (Math.abs(dx) < Math.abs(dy)) ? boss.row : altRow;
    if (!isBossStepBlocked(tryCol, tryRow, gridN)){
      boss.moveTo(tryCol, tryRow);
      moved += 1;
      } else {
        break; // stuck
      }
    }
  }
  return moved;
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
  for (const p of state.players || []) {
    const d = Math.abs(b.col - p.col) + Math.abs(b.row - p.row);
    if (d < bestDist){ best = p; bestDist = d; }
  }
  return best;
}

/* ------------------------ Boot ------------------------ */
let combatBooted = false;
let combatBootStarted = false; // guard to prevent duplicate initiative enqueues
export function startCaveCombat(){
  // Always ensure combat UI is mounted and synced, even if mode was already set.
  if (state.mode !== "combat") state.mode = "combat";
  if (typeof state.round !== "number" || state.round < 1) state.round = 1;
  if (typeof state.turnIdx !== "number") state.turnIdx = 0;
  if (!state.ui) state.ui = {};
  // Mark boss panel as the active right-dock view in combat
  state.ui.rightDock = 'boss';

  // Ensure boss is a proper entity or create one
  if (!(state.boss instanceof BossEntity)) {
    const oldBoss = state.boss;
    state.boss = BossFactory.createBear(
      oldBoss?.col ?? 8, 
      oldBoss?.row ?? 8
    );
    // Preserve any existing state
    if (oldBoss) {
      if (oldBoss.hp !== undefined) state.boss.hp = oldBoss.hp;
      if (oldBoss.hpMax !== undefined) state.boss.hpMax = oldBoss.hpMax;
      if (oldBoss.statuses) {
        state.boss.statuses = [...oldBoss.statuses];
      }
    }
  }
  
  // Set up observers for the boss
  setupBossObservers(state.boss);
  // Boss deck: build with keywords; d3 movement
  if (!state.boss.movementDie) state.boss.movementDie = "d3";
  if (!state.boss.deck) {
    const cards = [];
    // 5 Swipes (advance)
    for (let i=0;i<5;i++) cards.push({ id:'swipe', name:'Swipe', advance:true });
    // 2 Charges (advance)
    for (let i=0;i<2;i++) cards.push({ id:'charge', name:'Charge', advance:true });
    // 1 Enrage
    cards.push({ id:'enrage', name:'Enrage' });
  // 1 Roar (cycle)
  cards.push({ id:'roar', name:'Roar', cycle:true });
    state.boss.deck = { draw: shuffle(cards), discard: [], current: null };
  }
  // Reset Inferno pulse escalation at combat start
  state.infernoPulse = 2;

  for (const p of state.players) ensurePlayerVitals(p);
  renderBossPanel();

  mountActionBar({
    onMove: startPlayerMovement,
  onAction: handleActionButton,
  onBonus: handleBonusButton,
    onEndTurn: manualEndTurn, // IMPORTANT: manual path only
  });

  // Hide the old Boss Deck button; deck is now integrated into the boss panel
  const deckBtn = document.getElementById('btn-boss-deck');
  if (deckBtn) deckBtn.hidden = true;
  // Update context text for combat
  const ctx = document.getElementById('context-text');
  if (ctx) ctx.textContent = 'Your turn: Move (once), cast an action or bonus, then End Turn.';

  // Build turn order by initiative: roll movement die for each participant (players + boss)
  if (!combatBooted){
    if (combatBootStarted) {
      console.warn("Combat boot already in progress; skipping duplicate startCaveCombat enqueue.");
      return;
    }
    combatBootStarted = true;
    clearCombatEventQueue();
    
    // Shared state for initiative sequence
    const entries = [];
    const rollingCues = [];
    let headerEl = null;

    // Header: sticky and immediate
    queueCombatEvent(async () => {
      // Clean up any stray initiative elements from a prior partial boot
      try {
        document.querySelectorAll('#cue-stack .initiative-header, #cue-stack .initiative-rolling').forEach(el => el.remove());
      } catch {}
      // Auto-advancing info cue, not requiring clicks
      const { el } = cueService.info("Rolling for initiative…", { className: "initiative-header", key: "initiative-header" });
      headerEl = el;
    }, 0, "Initiative header", true);

  // Players: two-step per actor: transient 'rolling…' (removed when result shows), then result cue requiring click
  const rollingMap = new Map();
  for (let i=0;i<state.players.length;i++){
      const playerIndex = i; // Capture for closure
      queueCombatEvent(async () => {
        const p = state.players[playerIndex];
    // Auto-advancing rolling indicator
    const { el } = cueService.info(`${p.name} rolling…`, { className: "initiative-rolling", key: `player-${playerIndex}-rolling` });
    rollingCues.push(el);
    rollingMap.set(`player-${playerIndex}`, el);
      }, 2000, `Player ${i+1} rolling`, true);

      queueCombatEvent(async () => {
        const p = state.players[playerIndex];
  const sides = Math.max(1, Number(p.moveDie ?? 4));
  const roll = state.rng.int(1, sides);
  entries.push({ kind:'player', idx:playerIndex, roll, tb: state.rng.int(1, 1000) });
    // Remove that player's 'rolling…' cue now; show result briefly then auto-advance
    const rollingEl = rollingMap.get(`player-${playerIndex}`);
    if (rollingEl) { fadeRemoveCue(rollingEl); rollingMap.delete(`player-${playerIndex}`); }
    
    // Brief auto-advancing result display
    const { el } = cueService.info(`${p.name} rolls d${sides}… ${roll}!`, { key: `player-${playerIndex}-result` });
    // Auto-clear after 1.5 seconds
    setTimeout(() => { if (el.parentNode) fadeRemoveCue(el); }, 1500);
      }, 0, `Player ${i+1} result`, true);
    }

    // Boss: same two-step
    queueCombatEvent(async () => {
      // Auto-advancing boss rolling indicator
      const { el } = cueService.info(`${state.boss.name} rolling…`, { className: "initiative-rolling", key: "boss-rolling" });
      rollingCues.push(el);
      rollingMap.set('boss', el);
    }, 2000, "Boss rolling", true);

    queueCombatEvent(async () => {
  const sides = Math.max(1, Number(state.boss.movementDie === 'd3' ? 3 : state.boss.movementDie || 3));
  const bossRoll = state.rng.int(1, sides);
      entries.push({ kind:'boss', roll: bossRoll, tb: state.rng.int(1,1000) });
      const rollingEl = rollingMap.get('boss');
      if (rollingEl) { fadeRemoveCue(rollingEl); rollingMap.delete('boss'); }
      
      // Brief auto-advancing boss result
      const { el } = cueService.info(`${state.boss.name} rolls d${sides}… ${bossRoll}!`, { key: "boss-result" });
      // Auto-clear after 1.5 seconds
      setTimeout(() => { if (el.parentNode) fadeRemoveCue(el); }, 1500);
    }, 0, "Boss result", true);
    
    // Resolve order and cleanup rolling stickies
    queueCombatEvent(async () => {
      // Sort descending by roll, then tiebreak
      entries.sort((a,b)=> (b.roll - a.roll) || (b.tb - a.tb));
      state.turnOrder = entries.map(e=> e.kind==='player' ? { kind:'player', idx:e.idx } : { kind:'boss' });
      state.turnPtr = 0; // first in order

  // Cleanup any stragglers and header
  rollingCues.forEach(el => { try { removeCue(el); } catch {} });
      if (headerEl) { try { removeCue(headerEl); } catch {} }
      
      // Clear any remaining result cues
      try {
        document.querySelectorAll('#cue-stack .info-cue').forEach(el => {
          if (el.textContent.includes('rolls d')) fadeRemoveCue(el);
        });
      } catch {}

      // Show turn order - this should require acknowledgment
      const orderText = state.turnOrder.map((entry, i) => {
        if (entry.kind === 'player') {
          const p = state.players[entry.idx];
          return `${i+1}. ${p.name}`;
        } else {
          return `${i+1}. ${state.boss.name}`;
        }
      }).join(', ');
      const { wait: waitTurnOrder } = cueService.clickToContinue(`Turn order: ${orderText}`);
      await waitTurnOrder;
    }, 2000, "Resolve turn order", true); // Give time for results to display

    // Start combat automatically
    queueCombatEvent(async () => {
      if (typeof state.round !== 'number' || state.round < 1) state.round = 1;
      const { wait } = cueService.clickToContinue("Combat started. Round 1.");
      await wait;
      combatBooted = true;
      combatBootStarted = false;
      beginTurnAtCurrentPtr();
    }, 600, "Start combat", true);
    
  } else {
    syncUI();
  }
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

/* ------------------------ Player Movement (combat) ------------------------ */
function startPlayerMovement(){
  const p = currentPlayer();
  if (!state.isPlayerTurn) { cue("Not your turn."); return; }
  if (p.turn.moved > 0) { cue("Already moved this turn."); return; }
  // Prevent reroll spam while a movement roll is pending
  if (Number(state.pendingSteps || 0) > 0) { cue("Movement already rolled—pick a tile or cancel."); return; }
  const die = p.moveDie ?? 4;
  let steps = 1 + Math.floor(Math.random() * die);
  // Apply any movement penalty (e.g., from Roar) once, then clear
  const penalty = Math.max(0, Number(p.nextMovePenalty || 0));
  if (penalty > 0) {
    const before = steps;
    steps = Math.max(0, steps - penalty);
    p.nextMovePenalty = 0;
    cue(`Movement penalty applied: ${before} → ${steps}.`);
  }
  state.pendingSteps = steps;
  cueService.info(`Movement: rolled d${die} = ${steps}. Click a highlighted tile to move.`, { key: 'movement-prompt' });

  // Compute 8-directional BFS with no corner-cutting
  const max = state.grid?.cells ?? 15;
  const key = (c,r) => `${c},${r}`;
  const passable = (c,r) => c>=1 && r>=1 && c<=max && r<=max && !isCellBlocked(c,r,p.id);
  const dirs8 = [ [1,0],[-1,0],[0,1],[0,-1], [1,1],[1,-1],[-1,1],[-1,-1] ];
  const visited = new Map();
  const q = [];
  visited.set(key(p.col,p.row), { col:p.col,row:p.row, dist:0, prev:null });
  q.push({ col:p.col, row:p.row });
  while(q.length){
    const cur = q.shift();
    const curNode = visited.get(key(cur.col,cur.row));
    if (curNode.dist === steps) continue;
    for (const [dx,dy] of dirs8){
      const nc = cur.col + dx, nr = cur.row + dy;
      const k = key(nc,nr);
      if (visited.has(k)) continue;
      if (!passable(nc,nr)) continue;
      // no corner cutting for diagonals
      if (dx!==0 && dy!==0){
        if (!passable(cur.col+dx, cur.row) || !passable(cur.col, cur.row+dy)) continue;
      }
      visited.set(k, { col:nc,row:nr, dist:curNode.dist+1, prev:key(cur.col,cur.row) });
      q.push({ col:nc, row:nr });
    }
  }
  // Build tiles list excluding origin
  const tiles = Array.from(visited.values()).filter(n => !(n.col===p.col && n.row===p.row)).map(n => ({ col:n.col, row:n.row }));
  beginTileSelection({
    tiles,
    canTarget: (c,r) => visited.has(key(c,r)),
    eventBus: events, // use central event bus for tile highlighting
    onSelect: ({col,row}) => {
      // Reconstruct path and move instantly along it
      let k = key(col,row); const path=[];
      while(k){ const n = visited.get(k); path.push({col:n.col,row:n.row}); k = n.prev; }
      path.reverse(); // includes origin
      for (let i=1;i<path.length;i++){
        const step = path[i];
        const prevStep = path[i-1];
        const dx = step.col - prevStep.col;
        const dy = step.row - prevStep.row;
        
        state.board.moveToken(p.id, step.col, step.row);
        p.col = step.col; p.row = step.row;
        
        // Update player sprite direction based on movement
        updatePlayerSpriteDirection(p, dx, dy);
      }
      p.turn.moved = 1;
      state.pendingSteps = 0;
      // Clear movement prompt and show brief result
      cueService.remove('movement-prompt');
      const { wait } = cueService.clickToContinue(`Movement finished (${path.length-1} step${path.length-1===1?'':'s'}).`);
      syncUI();
    },
  onCancel: () => { 
    state.pendingSteps = 0; 
    cueService.remove('movement-prompt');
    cueService.clickToContinue("Movement cancelled.");
    syncUI(); 
  }
  });
}



