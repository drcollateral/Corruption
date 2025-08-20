// /boss_panel.js
// Boss dock panel with anchored tooltip bar for statuses.
import { state } from "./state.js";

function el(sel){ return document.querySelector(sel); }
function esc(s){ return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

export function renderBossPanel(){
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

  c.innerHTML = `
    <div class="boss-panel">
      <div class="hpbar" aria-label="Boss HP">
        <div class="hpfill" style="width:${hpPct}%"></div>
      </div>
      <h3 style="margin:8px 0 4px 0;">Statuses</h3>
      <div class="status-list" id="boss-status-list">${renderStatuses()}</div>
      <div id="boss-tip" class="tip-bar empty" aria-live="polite">(hover a status for details)</div>
    </div>
  `;

  wireTips();
}

export function syncBossPanel(){ renderBossPanel(); }

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

