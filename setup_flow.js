// /setup_flow.js
// Players setup modal -> capture party size; show character creation.
export function wireSetupFlow(onCountReady) {
  const playersSetup = document.getElementById("players-setup");
  const playersForm = document.getElementById("players-form");
  playersForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const sel = /** @type {HTMLSelectElement} */ (document.getElementById("player-count"));
    const count = Number(sel.value);
    onCountReady?.(count);
    playersSetup.hidden = true;
    document.getElementById("char-create").hidden = false;
  });
}

