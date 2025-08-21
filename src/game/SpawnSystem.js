// /spawn.js
// Remove noisy spawn text; keep entrance placement logic.
import { state } from "../core/GameState.js";
import { getPlayerSpriteForClass } from "../data/PlayerSprites.js";

export function spawnPartyLine(board, count){
  const edge = state.rng.choice(["top","bottom","left","right"]);
  const N = board.size;
  let positions = [];
  if (edge === "top" || edge === "bottom") {
    const row = edge === "top" ? 1 : N;
    const startCol = state.rng.int(1, Math.max(1, N - count + 1));
    for (let i=0;i<count;i++) positions.push({ col:startCol + i, row });
  } else {
    const col = edge === "left" ? 1 : N;
    const startRow = state.rng.int(1, Math.max(1, N - count + 1));
    for (let i=0;i<count;i++) positions.push({ col, row:startRow + i });
  }

  state.players.forEach((p,i)=>{
    p.col = positions[i].col; p.row = positions[i].row;
    
    // Get player sprite based on class and affinity
    const playerSprite = getPlayerSpriteForClass(p, 'south'); // Default facing south
    
    const el = board.placeToken(p.id, { 
      col:p.col, 
      row:p.row, 
      cls:"player", 
      w:1, 
      h:1, 
      label: playerSprite ? "" : (p.name || ""), // Only show label if no sprite
      sprite: playerSprite
    });
    
  // Sprite handled via Board.applyTokenSprite using child sprite-layer
    
    if (i===state.activeIdx) el.classList.add("active");
  });

  // Opposite entrance
  let entrancePos;
  if (edge === "top") entrancePos = { col: Math.ceil(N/2), row: N };
  else if (edge === "bottom") entrancePos = { col: Math.ceil(N/2), row: 1 };
  else if (edge === "left") entrancePos = { col: N, row: Math.ceil(N/2) };
  else entrancePos = { col: 1, row: Math.ceil(N/2) };

  const eid = "entrance:overworld->cave";
  const eEl = board.placeToken(eid, { col:entrancePos.col, row:entrancePos.row, cls:"entrance", w:1, h:1, label:"Cave" });
  const badge = document.createElement("div");
  badge.className = "entrance-badge"; badge.textContent = "Cave Entrance";
  eEl.appendChild(badge);
  state.entrances = [{ id:eid, col:entrancePos.col, row:entrancePos.row, sceneTarget:"cave" }];

  // Context prompt kept minimal:
  document.getElementById("context-text").textContent = `Press R to roll movement. Use WASD to move.`;
}


