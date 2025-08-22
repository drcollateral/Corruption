// /overworld.js
// Hide Boss Deck button in overworld; spawn and prompt roll.
import { state, setScene } from "../core/GameState.js";
import { spawnPartyLine } from "./SpawnSystem.js";

export function setupOverworld(){
  setScene("overworld");
  state.mode = "overworld";
  
  // Clear any remaining combat targeting when returning to overworld
  try {
    // Clear tile highlights that might be left over from combat
    document.querySelectorAll('.tile').forEach(tile => {
      tile.classList.remove('highlight-target', 'highlight-move');
    });
    console.log('🏠 Overworld setup: cleared any remaining combat highlights');
  } catch (error) {
    console.warn('Error clearing combat highlights in overworld setup:', error);
  }
  
  state.board.clear();
  state.boss = null;
  state.bossDeck = null;
  document.getElementById("btn-boss-deck").hidden = true; // only visible in cave
  spawnPartyLine(state.board, state.players.length || 2);
}

