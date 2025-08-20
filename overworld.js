// /overworld.js
// Hide Boss Deck button in overworld; spawn and prompt roll.
import { state, setScene } from "./state.js";
import { spawnPartyLine } from "./spawn.js";

export function setupOverworld(){
  setScene("overworld");
  state.board.clear();
  state.boss = null;
  state.bossDeck = null;
  document.getElementById("btn-boss-deck").hidden = true; // only visible in cave
  spawnPartyLine(state.board, state.players.length || 2);
}

