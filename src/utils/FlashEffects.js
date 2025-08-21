// /src/ui/flash.js
// Tiny helper to show transient visual cues (e.g., boss draw).
export function flashBossDraw(text){
  const cue = document.createElement("div");
  cue.className = "boss-draw-cue";
  cue.textContent = text;
  document.body.appendChild(cue);
  setTimeout(()=>cue.remove(), 2000);
}
