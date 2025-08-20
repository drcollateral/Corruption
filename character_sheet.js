// /character_sheet.js
// Spellbook lists ALL spells unlocked by attributes (no manual picks).
// Passives are computed from registry each render.
import { state } from "./state.js";
import { getClassById } from "./classes.js";
import { spellsWithMeta, passivesFor } from "./spells_registry.js";

function findById(id){ return state.players.find(p=>p.id===id) ?? state.players[state.activeIdx]; }
function esc(s){ return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

export function renderCharacterSheet(id){
  const p = findById(id);
  const kv = document.querySelector("#dock-panel .kv");
  const content = document.getElementById("dock-content");
  document.getElementById("dock-title").textContent = "Character Sheet";
  if (!p){ kv.innerHTML=""; content.innerHTML=""; return; }

  const cls = p.classId ? getClassById(p.classId) : null;
  kv.innerHTML = `
    <div>Name</div><div>${p.name}</div>
    <div>Class</div><div>${p.class ?? "—"}</div>
    <div>Affinity</div><div>${p.affinity ?? "—"}</div>
    <div>Preset</div><div>${p.preset ?? "Custom"}</div>
    <div>Move Die</div><div>d${p.moveDie ?? 4}</div>
    <div>Hit Die</div><div>d${p.hitDie ?? 6}</div>
    <div>Position</div><div>${p.col}, ${p.row}</div>
  `;
  content.innerHTML = `
    <h3 style="margin:0 0 6px 0;">Attributes</h3>
    <div class="kv">
      <div>Power</div><div>${p.attrs?.POW ?? 8}</div>
      <div>Defense</div><div>${p.attrs?.DEF ?? 8}</div>
      <div>Support</div><div>${p.attrs?.SUP ?? 8}</div>
    </div>
  `;
}

export function renderBag(id){
  const p = findById(id);
  document.getElementById("dock-title").textContent = "Bag";
  const kv = document.querySelector("#dock-panel .kv");
  kv.innerHTML = `<div>Owner</div><div>${p?.name ?? "—"}</div>`;
  document.getElementById("dock-content").innerHTML = `<p>(placeholder) Empty bag.</p>`;
}

export function renderSpellbook(id){
  const p = findById(id);
  document.getElementById("dock-title").textContent = "Spellbook";
  const kv = document.querySelector("#dock-panel .kv");
  kv.innerHTML = `<div>Owner</div><div>${p?.name ?? "—"}</div>`;

  if (!p){
    document.getElementById("dock-content").innerHTML = `<p>(no character)</p>`;
    return;
  }

  // Compute ALL unlocked spells from attributes (no manual selection).
  const metaList = spellsWithMeta(p.classId, p.affinity, p.attrs);
  const spellLis = metaList.map(m => {
    const badge = `[${m.unlockAttr} ${m.unlockAt}]`;
    const tip = `${m.name}\n${m.desc || ""}${m.tags ? `\nTags: ${m.tags.join(", ")}` : ""}${m.range ? `\nRange: ${m.range}` : ""}\nUnlock: ${badge}`;
    return `<li class="deck-item tip nofloat" tabindex="0" data-tip="${esc(tip)}"><div>${esc(m.name)}</div><small>${esc(badge)}</small></li>`;
  }).join("") || `<li class="deck-item"><div>(no spells unlocked)</div></li>`;

  // Compute passives live from registry
  const passives = passivesFor(p.classId, p.affinity, p.attrs);
  const passiveLis = passives.map(ps => {
    const tip = `${ps.name}\n${ps.desc || ""}`;
    return `<li class="deck-item tip nofloat" tabindex="0" data-tip="${esc(tip)}"><div>${esc(ps.name)}</div></li>`;
  }).join("") || `<li class="deck-item"><div>(no passives)</div></li>`;

  const content = document.getElementById("dock-content");
  content.innerHTML = `
    <h3 style="margin:0 0 6px 0;">Spells</h3>
    <ul class="deck-list" id="spellbook-spell-list">${spellLis}</ul>
    <h3 style="margin:10px 0 6px 0;">Passives</h3>
    <ul class="deck-list" id="spellbook-passive-list">${passiveLis}</ul>
    <div id="spellbook-tip" class="tip-bar empty" aria-live="polite">(hover a spell or passive for details)</div>
  `;

  // Anchored tooltip bar behavior
  const tipBar = document.getElementById("spellbook-tip");
  const setTip = (txt) => {
    const s = String(txt||"").trim();
    tipBar.textContent = s || "(hover a spell or passive for details)";
    tipBar.classList.toggle("empty", s.length === 0);
  };
  content.addEventListener("mouseover", (e) => {
    const el = e.target.closest(".tip.nofloat");
    if (!el || !content.contains(el)) return;
    setTip(el.getAttribute("data-tip"));
  });
  content.addEventListener("mouseout", (e) => {
    const to = e.relatedTarget && content.contains(e.relatedTarget) ? e.relatedTarget.closest(".tip.nofloat") : null;
    if (!to) setTip("");
  });
  content.addEventListener("focusin", (e) => {
    const el = e.target.closest(".tip.nofloat");
    if (!el || !content.contains(el)) return;
    setTip(el.getAttribute("data-tip"));
  });
  content.addEventListener("focusout", (e) => {
    const to = e.relatedTarget && content.contains(e.relatedTarget) ? e.relatedTarget.closest(".tip.nofloat") : null;
    if (!to) setTip("");
  });
}







