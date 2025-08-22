// /boss_panel.js
// Boss dock panel with anchored tooltip bar for statuses.
import { state } from "../core/GameState.js";
import { probWithReshuffle } from "../utils/probability.js";

function el(sel){ return document.querySelector(sel); }
function esc(s){ return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

export function renderBossPanel(){
  // Hide/clear boss panel outside combat so it doesn't linger in overworld
  if (state.mode !== 'combat') {
    const content = el('#dock-content');
    if (content && content.querySelector('.boss-panel')) {
      content.innerHTML = '';
    }
    return; // do not render boss panel unless in combat mode
  }

  const panel = el("#dock-panel");
  if (!panel) return;
  el("#dock-title").textContent = "Boss";
  const kv = panel.querySelector(".kv");
  const c  = el("#dock-content");

  const b = state.boss || { name:"—", hp:0, hpMax:0 };
  const hpPct = b.hpMax ? Math.max(0, Math.min(100, Math.round((b.hp/b.hpMax)*100))) : 0;

  kv.innerHTML = `
    <div>Name</div><div>${esc(b.name)}</div>
    <div>HP</div><div>${b.hp}/${b.hpMax}</div>
    <div>Round</div><div>${state.round ?? 1}</div>
  `;

  // Render combat log from state (persisted across re-renders)
  const log = Array.isArray(state.combatLog) ? state.combatLog : [];
  const logHtml = log.map(line => `<div class="log-line">${esc(line)}</div>`).join("");

  // Boss deck (probability tracker)
  const boss = state.boss;
  // Auto-link legacy deck structure if missing (self-heal each render)
  if (boss && (!boss.deck || (!boss.deck.drawPile && state.bossDeck && state.bossDeck.drawPile))) {
    boss.deck = state.bossDeck; // assign full object (has drawPile/discardPile)
    console.debug('[BossPanel] Auto-linked legacy state.bossDeck to boss.deck');
  }
  const deckSize = boss?.deckSize ? boss.deckSize() : (boss?.deck?.drawPile?.length || 0);
  const discardSize = boss?.discardSize ? boss.discardSize() : (boss?.deck?.discardPile?.length || 0);
  const drawPerTurn = boss?.getDrawCount ? boss.getDrawCount() : 1;
  if (boss && (!boss.deck || !boss.deck.drawPile)) {
    console.debug('[BossPanel] Boss deck missing or uninitialized:', {
      hasBoss: !!boss,
      bossType: boss.type,
      bossDeckRef: boss.deck,
      stateBossDeck: state.bossDeck,
      note: 'If state.bossDeck exists (legacy), need to assign it to state.boss.deck for new tracker.'
    });
  }

  c.innerHTML = `
    <div class="boss-panel">
      <div class="hpbar" aria-label="Boss HP">
        <div class="hpfill" style="width:${hpPct}%"></div>
      </div>
      <h3 style="margin:8px 0 4px 0;">Statuses</h3>
      <div class="status-list" id="boss-status-list">${renderStatuses()}</div>
      <div id="boss-tip" class="tip-bar empty" aria-live="polite">(hover a status for details)</div>

      <h3 style="margin:10px 0 6px 0;">Boss Deck Odds</h3>
      <div id="boss-deck-tracker" class="deck-tracker" aria-label="Boss deck probability tracker">
        ${renderDeckTracker(boss, deckSize, discardSize, drawPerTurn)}
      </div>

      <h3 style="margin:12px 0 4px 0;">Combat Log</h3>
      <div id="combat-log" class="combat-log" aria-live="polite">${logHtml}</div>
    </div>
  `;

  wireTips();
}

export function syncBossPanel(){
  // Only refresh boss panel if it's the active right-dock view
  if (state.ui && state.ui.rightDock && state.ui.rightDock !== 'boss') return;
  renderBossPanel();
}

function renderStatuses(){
  const sts = state.boss?.statuses || [];
  if (!sts.length) return `<span class="dim-line">(none)</span>`;
  let idx = 0;
  return sts.map(s => {
    const name = s.kind === "burn" ? "Burn" : s.kind;
    const tip = makeStatusTip(s, ++idx);
    const cls = s.kind === "burn" ? "status-chip burn tip nofloat" : "status-chip tip nofloat";
    return `<span class="${cls}" tabindex="0" data-tip="${esc(tip)}">${esc(name)} (${s.remaining ?? 0})</span>`;
  }).join("");
}

function makeStatusTip(st, n){
  if (st.kind === "burn"){
    return `Burn (stack #${n})
On application: 1 fire damage.
At start of boss turn: 1 fire damage.
Duration: ${1 + (st.remaining ?? 0)} total turns (including the initial hit).
Source: ${st.source ?? "unknown"}`;
  }
  return `${st.kind} — turns left: ${st.remaining ?? 0}`;
}

function wireTips(){
  const root = el("#boss-status-list");
  const bar  = el("#boss-tip");
  if (!root || !bar) return;
  const set = (s) => {
    const txt = String(s||"").trim();
    bar.textContent = txt || "(hover a status for details)";
    bar.classList.toggle("empty", !txt);
  };
  root.addEventListener("mouseover", (e) => {
    const t = e.target.closest(".tip.nofloat"); if (!t || !root.contains(t)) return;
    set(t.getAttribute("data-tip"));
  });
  root.addEventListener("mouseout", (e) => {
    const to = e.relatedTarget && root.contains(e.relatedTarget) ? e.relatedTarget.closest(".tip.nofloat") : null;
    if (!to) set("");
  });
  root.addEventListener("focusin", (e) => {
    const t = e.target.closest(".tip.nofloat"); if (!t || !root.contains(t)) return;
    set(t.getAttribute("data-tip"));
  });
  root.addEventListener("focusout", (e) => {
    const to = e.relatedTarget && root.contains(e.relatedTarget) ? e.relatedTarget.closest(".tip.nofloat") : null;
    if (!to) set("");
  });
}

function renderDeckTracker(boss, deckSize, discardSize, drawPerTurn){
  if (!boss) return `<div class="dim-line">(no boss)</div>`;
  const breakdown = boss.getDeckBreakdown ? boss.getDeckBreakdown() : [];
  if (!breakdown.length){
    console.debug('[BossPanel] Empty breakdown', {
      deckSize, discardSize,
      bossHasDeckObj: !!boss.deck,
      drawPileLen: boss.deck?.drawPile?.length,
      discardPileLen: boss.deck?.discardPile?.length,
      legacyStateBossDeck: state.bossDeck,
      suggestion: 'Assign state.boss.deck = state.bossDeck for compatibility.'
    });
    // Differentiate between truly empty vs not yet linked
    if (boss.deck && boss.deck.drawPile && boss.deck.drawPile.length === 0) {
      return `<div class="dim-line">(empty deck)</div>`;
    }
    if (!boss.deck || !boss.deck.drawPile) {
      return `<div class="dim-line">(deck initializing…)</div>`;
    }
  }
  if (!breakdown.length) return `<div class="dim-line">(empty deck)</div>`;
  const rows = breakdown.map(card => {
    if (card.total === 0) return '';
    const p = probWithReshuffle(deckSize, card.inDeck, discardSize, card.inDiscard, drawPerTurn);
    let cls = 'prob-low';
    if (p >= 0.5) cls = 'prob-high'; else if (p >= 0.25) cls = 'prob-medium';
    return `<div class="deck-row" title="${esc(card.name)}: ${card.inDeck} in deck${card.inDiscard?`, ${card.inDiscard} in discard`:''}\nChance in next draw (≥1): ${(p*100).toFixed(1)}%">`+
           `<div class="deck-name">${esc(card.name)}</div>`+
           `<div class="deck-meta"><small>${card.inDeck}${card.inDiscard?` (+${card.inDiscard})`:''}</small></div>`+
           `<div class="deck-odds ${cls}">${(p*100).toFixed(1)}%</div>`+
           `</div>`;
  }).join("");
  const reshuffle = deckSize < drawPerTurn && discardSize > 0;
  return `<div class="deck-header"><span>${deckSize} draw • ${discardSize} discard • drawing ${drawPerTurn}</span>${reshuffle?'<span class="reshuffle-note">Reshuffle</span>':''}</div>`+
         `<div class="deck-rows">${rows}</div>`;
}

// Public API: append a line to the combat log under boss panel
export function bossLog(line){
  if (!Array.isArray(state.combatLog)) state.combatLog = [];
  
  // Add timestamp (accurate to 1/10th of a second)
  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  }) + '.' + Math.floor(now.getMilliseconds() / 100);
  
  const logEntry = `[${timestamp}] ${String(line ?? "")}`;
  state.combatLog.push(logEntry);
  
  // Only log to browser console if boss logging is enabled
  if (state?.debug?.logBoss) {
    console.log(`🎮 COMBAT [${timestamp}]: ${String(line ?? "")}`);
  }
  
  // Trim to a reasonable length
  if (state.combatLog.length > 200) state.combatLog.splice(0, state.combatLog.length - 200);

  // If the element exists, append and auto-scroll; otherwise, it'll render on next panel draw
  const elLog = document.querySelector('#combat-log');
  if (elLog){
    const div = document.createElement('div');
    div.className = 'log-line';
    div.textContent = logEntry;
    elLog.appendChild(div);
    elLog.scrollTop = elLog.scrollHeight;
  }
}

