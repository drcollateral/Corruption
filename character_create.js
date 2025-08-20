// /character_create.js
// No spell selection UI. On submit, auto-grant all spells/passives unlocked by attributes.
// Live unlock preview (right column) still shows spells + passives.
import { setPlayers } from "./state.js";
import { CLASSES, CLASS_LIST, getClassByName } from "./classes.js";
import { spellsWithMeta, passivesFor, spellsFor } from "./spells_registry.js";

const BASE = 8;
const MIN = 8, MAX = 16;

export function wireCharacterCreate(onAllDone){
  const cc = document.getElementById("char-create");
  const card = cc.querySelector(".cc-card");
  const title = card.querySelector("h1");
  const form = document.getElementById("cc-form");
  const classSel = document.getElementById("cc-class");
  const affinitySel = document.getElementById("cc-affinity");
  const nameInput = document.getElementById("cc-name");
  const ptsOut = document.getElementById("points-remaining");

  // Layout: two columns
  let layout = card.querySelector(".cc-layout");
  if (!layout){
    layout = document.createElement("div");
    layout.className = "cc-layout";
    title.after(layout);
    layout.appendChild(form);
  }

  // Class options from registry
  classSel.innerHTML = CLASS_LIST.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
  classSel.value = "Elementalist"; // default

  // Preset select (depends on affinity)
  let presetRow = document.createElement("div");
  presetRow.className = "cc-row";
  presetRow.innerHTML = `<label for="cc-preset">Preset</label><select id="cc-preset"></select>`;
  affinitySel.closest(".cc-row").after(presetRow);
  const presetSel = presetRow.querySelector("#cc-preset");

  // Unlock preview (spells + passives) in right column
  let unlockPanel = document.getElementById("cc-unlocks");
  if (!unlockPanel){
    unlockPanel = document.createElement("div");
    unlockPanel.id = "cc-unlocks";
    unlockPanel.className = "panel";
    unlockPanel.innerHTML = `
      <h2 style="margin-bottom:6px;">Currently Unlockable</h2>
      <h3 style="margin:8px 0 4px 0;">Spells</h3>
      <ul id="cc-unlocks-spells" class="deck-list"></ul>
      <h3 style="margin:10px 0 4px 0;">Passives</h3>
      <ul id="cc-unlocks-passives" class="deck-list"></ul>
      <div class="dim-line" id="cc-unlocks-note" style="margin-top:6px">Adjust attributes to reveal more unlocks.</div>
    `;
    layout.appendChild(unlockPanel);
  }
  const unlockSpells  = unlockPanel.querySelector("#cc-unlocks-spells");
  const unlockPass    = unlockPanel.querySelector("#cc-unlocks-passives");

  // Cache attribute rows
  const rows = [
    form.querySelector('[data-attr="A1"]'),
    form.querySelector('[data-attr="A2"]'),
    form.querySelector('[data-attr="A3"]'),
  ];
  function setRowValue(rowEl, v){
    const val = Math.max(MIN, Math.min(MAX, v));
    rowEl.querySelector(".attr-value").textContent = String(val);
    const m = (val<=9)?-1:(val<=11)?0:(val<=13)?1:(val<=15)?2:3;
    rowEl.querySelector(".attr-mod-val").textContent = String(m);
  }
  function getRowValue(rowEl){ return Number(rowEl.querySelector(".attr-value").textContent); }
  function currentAttrs(){ const o = {}; rows.forEach(r => { o[r.dataset.key] = getRowValue(r); }); return o; }

  let currentClass = getClassByName(classSel.value) || CLASSES.ELEMENTALIST;
  let budget = currentClass.budget;

  function relabelAttrRows(){
    currentClass.attrs.forEach((a, idx) => {
      rows[idx].querySelector(".attr-name").textContent = a.name;
      rows[idx].dataset.key = a.key; // POW/DEF/SUP
    });
  }
  function rebuildAffinities(){
    affinitySel.innerHTML = (currentClass.affinities||[]).map(a=>`<option value="${a}">${a}</option>`).join("");
  }
  function rebuildPresets(){
    const presetsObj = currentClass.presets?.[affinitySel.value] || {};
    const names = ["Custom", ...Object.keys(presetsObj)];
    presetSel.innerHTML = names.map(n=> `<option value="${n}">${n}</option>`).join("");
    presetSel.value = "Custom";
  }
  function updatePoints(){
    const spent = rows.reduce((acc,r)=> acc + (getRowValue(r)-BASE), 0);
    const rem = Math.max(0, budget - spent);
    ptsOut.textContent = String(rem);
    return rem;
  }
  function resetAttributesUI(){
    rows.forEach(r => setRowValue(r, BASE));
    updatePoints();
    rebuildUnlockPreview();
  }
  function applyPreset(){
    const name = presetSel.value;
    if (name === "Custom"){ resetAttributesUI(); return; }
    const p = currentClass.presets?.[affinitySel.value]?.[name];
    if (!p){ resetAttributesUI(); return; }
    rows.forEach(r => { const key = r.dataset.key; setRowValue(r, p[key] ?? BASE); });
    updatePoints(); rebuildUnlockPreview();
  }

  function renderSpellsWithMeta(ul, items){
    ul.innerHTML = "";
    if (!items.length){
      const li = document.createElement("li"); li.className = "deck-item"; li.innerHTML = `<div>(none yet)</div>`; ul.appendChild(li); return;
    }
    items.forEach(it=>{
      const li = document.createElement("li"); li.className = "deck-item";
      li.innerHTML = `
        <div style="display:grid; gap:2px">
          <div class="name" style="font-weight:600">${it.name}</div>
          ${it.desc ? `<div class="dim-line" style="font-size:11px">${it.desc}</div>` : ``}
          ${it.tags ? `<div class="dim-line" style="font-size:11px">${it.tags.join(", ")}</div>` : ``}
        </div>
        <small>[${it.unlockAttr} ${it.unlockAt}]</small>
      `;
      ul.appendChild(li);
    });
  }
  function renderList(ul, items){
    ul.innerHTML = "";
    if (!items.length){
      const li = document.createElement("li"); li.className = "deck-item"; li.innerHTML = `<div>(none yet)</div>`; ul.appendChild(li); return;
    }
    items.forEach(it=>{
      const li = document.createElement("li"); li.className = "deck-item";
      li.innerHTML = `
        <div style="display:grid; gap:2px">
          <div class="name" style="font-weight:600">${it.name}</div>
          ${it.desc ? `<div class="dim-line" style="font-size:11px">${it.desc}</div>` : ``}
        </div>
      `;
      ul.appendChild(li);
    });
  }

  function rebuildUnlockPreview(){
    const attrs = currentAttrs();
    const aff = affinitySel.value;
    renderSpellsWithMeta(unlockSpells, spellsWithMeta(currentClass.id, aff, attrs));
    renderList(unlockPass,   passivesFor(currentClass.id, aff, attrs));
  }

  // Init
  relabelAttrRows(); rebuildAffinities(); rebuildPresets(); resetAttributesUI();

  // React to changes
  classSel.addEventListener("change", () => {
    currentClass = getClassByName(classSel.value) || currentClass;
    budget = currentClass.budget;
    relabelAttrRows(); rebuildAffinities(); rebuildPresets(); resetAttributesUI();
  });
  affinitySel.addEventListener("change", () => { rebuildPresets(); resetAttributesUI(); });
  presetSel.addEventListener("change", applyPreset);

  // +/- with budget; live preview
  form.addEventListener("click", (e) => {
    const btn = e.target.closest("button"); if (!btn) return;
    if (!btn.classList.contains("attr-inc") && !btn.classList.contains("attr-dec")) return;
    const row = btn.closest(".attr-row"); const cur = getRowValue(row);
    if (btn.classList.contains("attr-inc")){
      if (updatePoints() <= 0 || cur >= MAX) return; setRowValue(row, cur + 1);
    } else {
      if (cur <= MIN) return; setRowValue(row, cur - 1);
    }
    presetSel.value = "Custom"; updatePoints(); rebuildUnlockPreview();
  });

  // Submit → auto-grant spells & passives; no selection modal
  const built = [];
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (updatePoints() !== 0) return;
    const attrs = currentAttrs();
    const draft = {
      name: nameInput.value.trim() || `P${built.length+1}`,
      classId: currentClass.id, className: currentClass.name,
      affinity: affinitySel.value, attrs,
      moveDie: currentClass.moveDie, hitDie: currentClass.hitDie,
    };
    const autoSpells   = spellsFor(draft.classId, draft.affinity, draft.attrs);
    const autoPassives = passivesFor(draft.classId, draft.affinity, draft.attrs);

    built.push({
      id:`P${built.length+1}`, name:draft.name, col:1, row:1,
      classId:draft.classId, class:draft.className, affinity:draft.affinity,
      preset:(presetSel.value==="Custom"?null:presetSel.value),
      attrs:draft.attrs, moveDie:draft.moveDie, hitDie:draft.hitDie,
      // store snapshots (spellbook can also recompute live)
      spells: autoSpells.map(s => ({ id:s.id, name:s.name })),
      passives: autoPassives.map(p => ({ id:p.id, name:p.name })),
    });

    const targetCount = Number((/** @type {HTMLSelectElement} */(document.getElementById("player-count"))).value);
    if (built.length >= targetCount){
      setPlayers(built);
      cc.hidden = true;
      onAllDone?.();
    } else {
      nameInput.value = "";
      presetSel.value = "Custom";
      resetAttributesUI();
    }
  });
}










