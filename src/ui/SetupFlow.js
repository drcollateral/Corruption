// /setup_flow.js
// Players setup modal -> capture party size; show character creation.
import { setDebugFlag } from "../core/GameState.js";

export function wireSetupFlow(onCountReady) {
  console.log("wireSetupFlow called");
  
  // Wait for DOM to be ready
  setTimeout(() => {
    const playersSetup = document.getElementById("players-setup");
    const continueBtn = document.querySelector('#players-setup button[type="submit"]');
    const playersForm = document.getElementById("players-form");
    
    console.log("Found elements:", { playersSetup, continueBtn, playersForm });
    
    if (continueBtn && playersForm) {
      // Handle form submission
      playersForm.addEventListener("submit", (e) => {
        e.preventDefault();
        console.log("Form submit triggered - HIDING PARTY SIZE MODAL PERMANENTLY");
        
        const sel = document.getElementById("player-count");
        const count = Number(sel?.value || 2);
        const skipCave = !!document.getElementById("debug-skip-cave")?.checked;
        console.log("Selected count:", count, "skipToCave:", skipCave);
        setDebugFlag("skipToCaveAfterCreate", skipCave);
        
        // Hide setup AGGRESSIVELY
        if (playersSetup) {
          playersSetup.hidden = true;
          playersSetup.style.display = 'none';
          playersSetup.remove(); // NUCLEAR OPTION - completely remove from DOM
          console.log("PARTY SIZE MODAL REMOVED FROM DOM");
        }
        const charCreate = document.getElementById("char-create");
        if (charCreate) charCreate.hidden = false;
        
        onCountReady?.(count);
      });
      
      console.log("Event listeners attached");
    } else {
      console.error("Required elements not found");
    }
  }, 100);
}

