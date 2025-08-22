/**
 * Main Game Entry Point
 * Professional indie game architecture
 */
import { Config } from "./data/Config.js";
import { setBoard, setScene, setPlayers, state } from "./core/GameState.js";
import { Board } from "./game/Board.js";
import { setupOverworld } from "./game/Overworld.js";
import { wireSetupFlow } from "./ui/SetupFlow.js";
import { wireCharacterCreate } from "./ui/CharacterCreation.js";
import { renderParty } from "./ui/PartyPanel.js";
import { wireControls } from "./game/InputHandler.js";
import { wireBossDeckModal } from "./ui/ModalSystem.js";
import { renderCharacterSheet } from "./ui/CharacterSheet.js";
import { initCombatHooks } from "./game/CombatManager.js";
import "./utils/CueConfigLoader.js"; // Initialize cue configuration system

window.addEventListener("DOMContentLoaded", () => {
  console.log("Starting Corruption RPG - Professional Architecture");
  
  const boardEl = document.getElementById("board");
  const board = new Board(boardEl, Config.GRID);
  setBoard(board);

  // Setup party size selection
  wireSetupFlow((count) => {
    console.log("Party size selected:", count);
    const players = Array.from({ length: count }, (_, i) => ({
      id: `P${i + 1}`, name: `P${i + 1}`, col: 1, row: 1,
    }));
    setPlayers(players);
    
    // Character creation flow
    wireCharacterCreate(count, () => {
      document.getElementById("app-root").hidden = false;
      const skipToCave = !!(state?.debug?.skipToCaveAfterCreate);
      
      if (skipToCave) {
        // Jump directly to cave for testing
        import("./game/Cave.js").then(mod => {
          console.log("Debug: Entering cave directly");
          try { mod.enterCave(); } catch (e) { console.error("enterCave failed:", e); }
        });
      } else {
        setScene("overworld");
        setupOverworld();
      }
      
      renderParty();
      renderCharacterSheet();
    });
  });

  // Initialize UI systems
  wireControls();
  wireBossDeckModal();
  
  // Initialize combat system
  initCombatHooks();

  // Scene change watcher for fallback cave entry
  let lastScene = state.scene;
  setInterval(() => {
    if (state.scene !== lastScene) {
      if (state.scene === "cave" && state.mode !== "combat") {
        document.dispatchEvent(new CustomEvent("cave:entered"));
      }
      lastScene = state.scene;
    }
  }, 200);
});
