// /party.js
// Replace "Center" with Sheet/Bag/Spellbook buttons.
import { state } from "../core/GameState.js";
import { renderCharacterSheet, renderBag, renderSpellbook } from "./CharacterSheet.js";
import { renderBossPanel } from "./BossPanel.js";

export function renderParty(){
  const left = document.getElementById("left-party");
  left.innerHTML = "";
  state.players.forEach((p, idx) => {
    // Ensure player has HP values (combat system should handle this, but fallback)
    const hp = p.hp ?? p.hpMax ?? (p.hitDie ? p.hitDie * 2 : 12);
    const hpMax = p.hpMax ?? (p.hitDie ? p.hitDie * 2 : 12);
    const hpPercent = Math.round((hp / hpMax) * 100);
    
    // Color coding for HP
    let hpColor = "#3aa657"; // green (OK)
    if (hpPercent <= 25) hpColor = "#a33030"; // red (danger)
    else if (hpPercent <= 50) hpColor = "#d29b2e"; // yellow (warn)
    
    const div = document.createElement("div");
    div.className = "party-card";
    div.innerHTML = `
      <div class="card-title">${p.name} ${idx===state.activeIdx ? "• (active)" : ""}</div>
      <div class="hp-bar">
        <span class="hp-text" style="color: ${hpColor}">${hp}/${hpMax} HP</span>
        <div class="hp-bar-bg">
          <div class="hp-bar-fill" style="width: ${hpPercent}%; background-color: ${hpColor}"></div>
        </div>
      </div>
      <div class="button-row">
        <button class="icon-button" data-act="sheet" data-id="${p.id}">📜 Sheet</button>
        <button class="icon-button" data-act="bag" data-id="${p.id}">🎒 Bag</button>
        <button class="icon-button" data-act="spells" data-id="${p.id}">📖 Spellbook</button>
      </div>`;
    left.appendChild(div);
  });
  left.querySelectorAll("[data-act=sheet]").forEach(btn=>{
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (!state.ui) state.ui = {};
      if (state.ui.rightDock === 'sheet'){
        state.ui.rightDock = 'boss';
        renderBossPanel();
      } else {
        state.ui.rightDock = 'sheet';
        renderCharacterSheet(id);
      }
    });
  });
  left.querySelectorAll("[data-act=bag]").forEach(btn=>{
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (!state.ui) state.ui = {};
      if (state.ui.rightDock === 'bag'){
        state.ui.rightDock = 'boss';
        renderBossPanel();
      } else {
        state.ui.rightDock = 'bag';
        renderBag(id);
      }
    });
  });
  left.querySelectorAll("[data-act=spells]").forEach(btn=>{
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (!state.ui) state.ui = {};
      if (state.ui.rightDock === 'spells'){
        state.ui.rightDock = 'boss';
        renderBossPanel();
      } else {
        state.ui.rightDock = 'spells';
        renderSpellbook(id);
      }
    });
  });
}


