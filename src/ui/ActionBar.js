// /action_bar.js
// Modular action bar: renders Move, dynamic Actions (spells), dynamic Bonuses (passives), End Turn.
// Calls manual end turn (gated), not a generic endTurn to avoid legacy auto hooks.
let wired = false;
let refs = null;
let handlers = { onMove: ()=>{}, onAction: (id)=>{}, onBonus: (id)=>{}, onEndTurn: ()=>{} };

export function mountActionBar(h){
  handlers = h || handlers;
  const bottom = document.getElementById("bottom-bar");
  if (!bottom) return;

  let root = document.getElementById("action-bar");
  if (!root){
    root = document.createElement("div");
    root.id = "action-bar";
    root.innerHTML = `
      <div class="ab-left">
        <div class="group"><span id="ab-player-hp">HP 0/0</span></div>
        <div class="group boss"><span id="ab-boss-hp">Boss 0/0</span></div>
        <div class="dots" aria-label="Action economy">
          <div class="dot action" id="dot-action" title="Action available"></div>
          <div class="dot bonus" id="dot-bonus" title="Bonus action available"></div>
        </div>
      </div>
  <div class="ab-right">
        <button id="ab-move" class="ghost">Move</button>
        <div id="ab-dyn" class="ab-dyn"></div>
        <button id="ab-end" class="primary">End Turn</button>
      </div>
    `;
    bottom.appendChild(root);
  }

  const moveBtn = /** @type {HTMLButtonElement} */(root.querySelector("#ab-move"));
  const dyn = /** @type {HTMLElement} */(root.querySelector("#ab-dyn"));
  const endBtn = /** @type {HTMLButtonElement} */(root.querySelector("#ab-end"));
  const playerHp = /** @type {HTMLElement} */(root.querySelector("#ab-player-hp"));
  const bossHp = /** @type {HTMLElement} */(root.querySelector("#ab-boss-hp"));
  const dotAction = /** @type {HTMLElement} */(root.querySelector("#dot-action"));
  const dotBonus  = /** @type {HTMLElement} */(root.querySelector("#dot-bonus"));

  if (!wired){
    moveBtn.addEventListener("click", () => handlers.onMove?.());
    endBtn.addEventListener("click", () => handlers.onEndTurn?.()); // manual-only
    wired = true;
  }

  refs = { root, playerHp, bossHp, moveBtn, dyn, endBtn, dotAction, dotBonus };
  root.classList.remove("hidden");
}

export function updateActionBar(model){
  if (!refs) return;
  refs.root.classList.toggle("hidden", !model.inCombat);
  refs.playerHp.textContent = `${model.player.name} ${model.player.hp}/${model.player.hpMax}`;
  refs.bossHp.textContent = `${model.boss.name} ${model.boss.hp}/${model.boss.hpMax}`;
  // Buttons
  refs.moveBtn.disabled = !model.player.canMove;
  refs.endBtn.disabled = !model.player.canEndTurn;

  // Rebuild dynamic actions/bonuses
  refs.dyn.innerHTML = "";
  const addBtn = (id, label, enabled, kind, enhanced=false) => {
    const b = document.createElement("button");
    b.className = kind === 'action' ? "primary" : "ghost";
    b.textContent = label + (enhanced ? " 🔥" : "");
    b.disabled = !enabled;
    if (enhanced) b.classList.add("enhanced");
    // Basic tooltip via title; could evolve into richer hover card later
    if (kind === 'action') {
      b.title = spellTooltip(id, model.player);
    } else if (kind === 'bonus') {
      b.title = bonusTooltip(id, model.player);
    }
    b.addEventListener("click", () => {
      if (kind === 'action') handlers.onAction?.(id);
      else handlers.onBonus?.(id);
    });
    refs.dyn.appendChild(b);
  };

  // Actions (spells)
  for (const a of (model.actions || [])){
    const enhanced = a.id === 'burn' && model.player.hasInferno;
    addBtn(a.id, `Cast: ${a.name}` , !!a.enabled, 'action', enhanced);
  }
  // Bonuses (passives)
  for (const b of (model.bonuses || [])){
    addBtn(b.id, `Bonus: ${b.name}`, !!b.enabled, 'bonus', false);
  }

  refs.dotAction.classList.toggle("empty", !(model.player.action > 0));
  refs.dotBonus.classList.toggle("empty",  !(model.player.bonus > 0));

  // Movement button tooltip with rolled/remaining info
  if (model.player.movementInfo){
    const mi = model.player.movementInfo;
    let parts = [];
    if (mi.rolled != null) parts.push(`Rolled: ${mi.rolled}`);
    parts.push(`Used: ${mi.used}`);
    parts.push(`Remaining: ${mi.remaining}`);
    refs.moveBtn.title = parts.join(" | ");
  } else {
    refs.moveBtn.title = "Roll movement (once) or spend remaining steps.";
  }
}

// Simple tooltip text helpers (lightweight; real data could come from SpellRegistry)
function spellTooltip(id, playerModel){
  switch(id){
    case 'burn': return 'Burn: Action. Apply a 3-tick 1 dmg DoT (stacks). If Inferno primed: detonate immediately.';
    case 'inferno': return 'Inferno: Bonus. Prime to convert next Burn into instant damage + pulse. Click again to cancel.';
    default: return id;
  }
}
function bonusTooltip(id, playerModel){
  switch(id){
    case 'inferno': return spellTooltip(id, playerModel);
    default: return id;
  }
}



