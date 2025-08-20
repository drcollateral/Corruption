// /spell_select.js
// Modal logic: grant base + attribute passives; allow choosing 3 eligible spells.
// Now eligibility uses all attributes (POW/DEF/SUP).
import { spellsFor, passivesFor } from "./spells_registry.js";

const modal = document.getElementById("spell-select-modal");
const passiveP = document.getElementById("ss-passive");
const affNote = document.getElementById("ss-affinity-note");
const listEl = document.getElementById("ss-list");
const counterEl = document.getElementById("ss-counter");
const confirmBtn = document.getElementById("ss-confirm");

/**
 * Open modal for a single draft character.
 * @param {{classId:string,className:string,affinity:string,attrs:{POW:number,DEF:number,SUP:number}}} draft
 * @param {(result:{spells:Array<{id:string,name:string}>, passives:Array<{id:string,name:string}>})=>void} onDone
 */
export function openSpellSelection(draft, onDone){
  // Compute passives (base + attribute unlocks)
  const passives = passivesFor(draft.classId, draft.affinity, draft.attrs);
  if (passives.length){
    // Show all granted passives in one line
    const names = passives.map(p => `"${p.name}"`).join(", ");
    passiveP.textContent = `You selected ${draft.affinity}. Granted: ${names}.`;
  } else {
    passiveP.textContent = `You selected ${draft.affinity}.`;
  }

  // Helper note
  affNote.textContent = `Eligible spells are based on ${draft.affinity} + your attributes (POW/DEF/SUP). Pick exactly 3.`;

  // Build list of eligible spells
  const spells = spellsFor(draft.classId, draft.affinity, draft.attrs);
  listEl.innerHTML = "";
  const selected = new Set();

  spells.forEach(sp => {
    const li = document.createElement("li");
    li.className = "deck-item";
    li.innerHTML = `
      <div class="spell-item">
        <input type="checkbox" aria-label="select ${sp.name}"/>
        <div>
          <div class="name">${sp.name}</div>
          <div class="meta">${sp.desc}${sp.tags?` — ${sp.tags.join(", ")}`:""}</div>
        </div>
        <div class="meta">${sp.range?`Range ${sp.range}`:""}</div>
      </div>`;
    const cb = li.querySelector("input[type=checkbox]");
    cb.addEventListener("change", () => {
      if (cb.checked){
        if (selected.size >= 3){ cb.checked = false; return; }
        selected.add(sp.id);
      } else {
        selected.delete(sp.id);
      }
      updateCounter();
    });
    listEl.appendChild(li);
  });

  function updateCounter(){
    const n = selected.size;
    confirmBtn.disabled = (n !== 3);
    counterEl.textContent = `Selected ${n}/3`;
  }
  updateCounter();

  const onConfirm = () => {
    if (selected.size !== 3) return;
    const chosen = spells.filter(s => selected.has(s.id)).map(s => ({ id:s.id, name:s.name }));
    close();
    // Return granted passives too
    onDone?.({ spells: chosen, passives: passives.map(p => ({ id:p.id, name:p.name })) });
  };
  confirmBtn.addEventListener("click", onConfirm);

  function close(){
    modal.hidden = true;
    confirmBtn.removeEventListener("click", onConfirm);
  }

  modal.hidden = false;
}

// Prevent accidental backdrop close (force selection)
/* document.getElementById("spell-select-modal").addEventListener("click", (e)=>{
  if (e.target === e.currentTarget){ }
}); */

