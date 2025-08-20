// /party.js
// Replace "Center" with Sheet/Bag/Spellbook buttons.
import { state } from "./state.js";
import { renderCharacterSheet, renderBag, renderSpellbook } from "./character_sheet.js";

export function renderParty(){
  const left = document.getElementById("left-party");
  left.innerHTML = "";
  state.players.forEach((p, idx) => {
    const div = document.createElement("div");
    div.className = "party-card";
    div.innerHTML = `
      <div class="card-title">${p.name} ${idx===state.activeIdx ? "• (active)" : ""}</div>
      <div class="button-row">
        <button class="icon-button" data-act="sheet" data-id="${p.id}">📜 Sheet</button>
        <button class="icon-button" data-act="bag" data-id="${p.id}">🎒 Bag</button>
        <button class="icon-button" data-act="spells" data-id="${p.id}">📖 Spellbook</button>
      </div>`;
    left.appendChild(div);
  });
  left.querySelectorAll("[data-act=sheet]").forEach(btn=>{
    btn.addEventListener("click", () => renderCharacterSheet(btn.getAttribute("data-id")));
  });
  left.querySelectorAll("[data-act=bag]").forEach(btn=>{
    btn.addEventListener("click", () => renderBag(btn.getAttribute("data-id")));
  });
  left.querySelectorAll("[data-act=spells]").forEach(btn=>{
    btn.addEventListener("click", () => renderSpellbook(btn.getAttribute("data-id")));
  });
}


