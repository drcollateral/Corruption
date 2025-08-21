// /boss_panel.js
// Boss dock panel with anchored tooltip bar for statuses.
import { state } from "../core/GameState.js";

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

  // Boss deck info — integrated into the boss panel
  const deck = state.boss?.deck;
  const drawCount = deck?.draw?.length ?? 0;
  const discardCount = deck?.discard?.length ?? 0;
  const currentCard = deck?.current?.name || "(none)";

  c.innerHTML = `
    <div class="boss-panel">
      <div class="hpbar" aria-label="Boss HP">
        <div class="hpfill" style="width:${hpPct}%"></div>
      </div>
      <h3 style="margin:8px 0 4px 0;">Statuses</h3>
      <div class="status-list" id="boss-status-list">${renderStatuses()}</div>
      <div id="boss-tip" class="tip-bar empty" aria-live="polite">(hover a status for details)</div>

      <h3 style="margin:10px 0 6px 0;">Boss Deck</h3>
      <div class="kv" style="margin-bottom:6px;">
        <div>Current</div><div>${esc(currentCard)}</div>
        <div>Draw</div><div>${drawCount}</div>
        <div>Discard</div><div>${discardCount}</div>
      </div>
      <details>
        <summary>Show piles</summary>
        <div style="display:flex; gap:12px; margin-top:6px;">
          <div style="flex:1;">
            <h4 style="margin:4px 0;">Draw Pile</h4>
            <ul class="deck-list">${(deck?.draw||[]).map(c=>`<li class="deck-item"><div>${esc(c.name||c.id||"?")}</div></li>`).join("")}</ul>
          </div>
          <div style="flex:1;">
            <h4 style="margin:4px 0;">Discard</h4>
            <ul class="deck-list">${(deck?.discard||[]).map(c=>`<li class="deck-item"><div>${esc(c.name||c.id||"?")}</div></li>`).join("")}</ul>
          </div>
        </div>
      </details>

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

// Public API: append a line to the combat log under boss panel
export function bossLog(line){
  if (!Array.isArray(state.combatLog)) state.combatLog = [];
  state.combatLog.push(String(line ?? ""));
  // Trim to a reasonable length
  if (state.combatLog.length > 200) state.combatLog.splice(0, state.combatLog.length - 200);

  // If the element exists, append and auto-scroll; otherwise, it'll render on next panel draw
  const elLog = document.querySelector('#combat-log');
  if (elLog){
    const div = document.createElement('div');
    div.className = 'log-line';
    div.textContent = String(line ?? '');
    elLog.appendChild(div);
    elLog.scrollTop = elLog.scrollHeight;
  }
}

