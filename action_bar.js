// /action_bar.js
// Calls manual end turn (gated), not a generic endTurn to avoid legacy auto hooks.
let wired = false;
let refs = null;
let handlers = { onBurn: ()=>{}, onInferno: ()=>{}, onEndTurn: ()=>{} };

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
        <button id="ab-burn" class="primary">Cast: Burn</button>
        <button id="ab-inferno" class="ghost" disabled>Bonus: Inferno</button>
        <button id="ab-end" class="primary">End Turn</button>
      </div>
    `;
    bottom.appendChild(root);
  }

  const burnBtn = /** @type {HTMLButtonElement} */(root.querySelector("#ab-burn"));
  const infernoBtn = /** @type {HTMLButtonElement} */(root.querySelector("#ab-inferno"));
  const endBtn = /** @type {HTMLButtonElement} */(root.querySelector("#ab-end"));
  const playerHp = /** @type {HTMLElement} */(root.querySelector("#ab-player-hp"));
  const bossHp = /** @type {HTMLElement} */(root.querySelector("#ab-boss-hp"));
  const dotAction = /** @type {HTMLElement} */(root.querySelector("#dot-action"));
  const dotBonus  = /** @type {HTMLElement} */(root.querySelector("#dot-bonus"));

  if (!wired){
    burnBtn.addEventListener("click", () => handlers.onBurn?.());
    infernoBtn.addEventListener("click", () => handlers.onInferno?.());
    endBtn.addEventListener("click", () => handlers.onEndTurn?.()); // manual-only
    wired = true;
  }

  refs = { root, playerHp, bossHp, burnBtn, infernoBtn, endBtn, dotAction, dotBonus };
  root.classList.remove("hidden");
}

export function updateActionBar(model){
  if (!refs) return;
  refs.root.classList.toggle("hidden", !model.inCombat);
  refs.playerHp.textContent = `${model.player.name} ${model.player.hp}/${model.player.hpMax}`;
  refs.bossHp.textContent = `${model.boss.name} ${model.boss.hp}/${model.boss.hpMax}`;
  refs.burnBtn.disabled = !model.player.canBurn;
  refs.infernoBtn.disabled = true;

  refs.dotAction.classList.toggle("empty", !(model.player.action > 0));
  refs.dotBonus.classList.toggle("empty",  !(model.player.bonus > 0));
}



