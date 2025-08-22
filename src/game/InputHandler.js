// /controls.js
// One roll per turn + collision + cleaner prompts.
// UPDATED: Never trigger legacy bossTurn/nextPlayer when in cave (combat is authoritative).
import { state, activePlayer, nextPlayer, isCellBlocked } from "../core/GameState.js";
import { enterCave } from "./Cave.js";                 // ⬅ bossTurn removed
import { renderParty } from "../ui/PartyPanel.js";
import { renderCharacterSheet } from "../ui/CharacterSheet.js";
import { updatePlayerSpriteDirection } from "../data/PlayerSprites.js";
import { simpleCue } from "../utils/SimpleCue.js";

let moveKeyHandler = null;

export function wireControls(){
  const contextText = document.getElementById("context-text");

  function tryMove(dx, dy){
    const p = activePlayer(); if (!p) return;
    const nc = p.col + dx, nr = p.row + dy;
    if (!state.board.within(nc,nr)) return;
    if (isCellBlocked(nc,nr, p.id)) return; // collision: block move
    p.col = nc; p.row = nr;
    state.board.moveToken(p.id, nc, nr);
    
    // Update player sprite direction based on movement
    updatePlayerSpriteDirection(p, dx, dy);

    // check entrance (allowed to share cell)
    for (const e of state.entrances){
      if (nc===e.col && nr===e.row && e.sceneTarget==="cave"){ 
        try {
          enterCave(); 
        } catch (error) {
          console.error('Failed to enter cave:', error);
        }
      }
    }
    renderCharacterSheet();
  }

  function startMovementTurn(){
    // Consume movement steps via WASD/arrow keys
    moveKeyHandler = (ev) => {
      if (state.pendingSteps <= 0) return;
      let dx=0, dy=0;
      if (ev.key === "w" || ev.key === "ArrowUp") dy = -1;
      else if (ev.key === "s" || ev.key === "ArrowDown") dy = 1;
      else if (ev.key === "a" || ev.key === "ArrowLeft") dx = -1;
      else if (ev.key === "d" || ev.key === "ArrowRight") dx = 1;
      else return;
      ev.preventDefault();

      tryMove(dx,dy);
      if (state.pendingSteps > 0) {
        state.pendingSteps -= 1;
        contextText.textContent = `Movement: ${state.pendingSteps} step(s) remaining.`;
      }
      if (state.pendingSteps <= 0){
        // stop listening for this roll's movement
        window.removeEventListener("keydown", moveKeyHandler, true);
        moveKeyHandler = null;

        // ---------- KEY CHANGE ----------
        // In cave (combat), DO NOT auto-advance boss or player here.
        if (state.scene === "cave"){
          contextText.textContent = `Movement finished. Take actions or press End Turn.`;
          renderCharacterSheet();
          return; // boss acts only in combat boss phase
        }

        // Legacy overworld flow (non-cave)
        nextPlayer();
        for (const [id, el] of state.board.tokens.entries()){
          el.classList.toggle("active", id === state.players[state.activeIdx]?.id);
        }
        renderParty();
        renderCharacterSheet();
        contextText.textContent = `Press R to roll movement.`;
      }
    };
    window.addEventListener("keydown", moveKeyHandler, true);
  }

  window.addEventListener("keydown", (e) => {
    if (document.activeElement && ["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName)) return;

    if (e.key === "r" || e.key === "R"){
  // In combat, movement is handled by the combat action bar. Ignore R.
  if (state.mode === "combat") return;
      // enforce one roll per turn
      if (state.rolledThisTurn || state.pendingSteps > 0) return;

      const p = activePlayer(); if (!p) return;
      const die = p.moveDie ?? 4;
      const roll = state.rng.int(1, die);
      state.pendingSteps = roll;
      state.rolledThisTurn = true;
      simpleCue(`Movement rolled: d${die} = ${roll}.`);
      document.getElementById("context-text").textContent = `Use WASD to move.`;
      startMovementTurn();
    }
  });
}


