// /main.js
// Entry: flat-folder imports + boot wiring.
import { Config } from "./config.js";
import { setBoard, setScene, setPlayers, state } from "./state.js";
import { Board } from "./board.js";
import { setupOverworld } from "./overworld.js";
import { wireSetupFlow } from "./setup_flow.js";
import { wireCharacterCreate } from "./character_create.js";
import { renderParty } from "./party.js";
import { wireControls } from "./controls.js";
import { wireBossDeckModal } from "./modal.js";
import { renderCharacterSheet } from "./character_sheet.js";
import { initCombatHooks } from "./combat.js"; // NEW

window.addEventListener("DOMContentLoaded", () => {
  const boardEl = document.getElementById("board");
  const board = new Board(boardEl, Config.GRID);
  setBoard(board);

  // Setup (party count)
  wireSetupFlow((count) => {
    const players = Array.from({ length: count }, (_, i) => ({
      id: `P${i + 1}`, name: `P${i + 1}`, col: 1, row: 1,
    }));
    setPlayers(players);
  });

  // Character creation -> show app & start overworld
  wireCharacterCreate(() => {
    document.getElementById("app-root").hidden = false;
    setScene("overworld");
    setupOverworld();
    renderParty();
    renderCharacterSheet();
  });

  wireControls();
  wireBossDeckModal();

  // --- Combat auto-start wiring ---
  // 1) Enable combat module listeners (responds to `cave:entered`)
  initCombatHooks();

  // 2) Fallback watcher: if any code flips state.scene to "cave", dispatch event.
  //    This avoids having to modify your cave-transition code right now.
  let lastScene = state.scene;
  setInterval(() => {
    if (state.scene !== lastScene) {
      if (state.scene === "cave") {
        document.dispatchEvent(new CustomEvent("cave:entered"));
      }
      lastScene = state.scene;
    }
  }, 200);
});








