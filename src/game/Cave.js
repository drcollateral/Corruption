// /cave.js
// Enter cave and start COMBAT mode; combat loop (combat.js) owns boss turns.
// UPDATED: sets state.mode="combat" immediately and dispatches "cave:entered".
import { state, setScene, resetTurnFlags, isPlayerAt, setPlayers } from "../core/GameState.js";
import { BossDeck } from "../entities/BossDeck.js";
import { flashBossDraw } from "../utils/FlashEffects.js";
import { renderDeckModal } from "../ui/ModalSystem.js";
import { BossEntity } from "../entities/BossEntity.js";
import { getPlayerSpriteForClass } from "../data/PlayerSprites.js";
import { BossCreator } from "../factories/BossCreator.js";

let startCaveCombat = null;

async function initCombat() {
  if (!startCaveCombat) {
    try {
      const combatModule = await import("./CombatManager.js");
      startCaveCombat = combatModule.startCaveCombat;
    } catch (error) {
      console.error("Failed to load combat module:", error);
    }
  }
  return startCaveCombat;
}

export function enterCave(){
  console.error('[Cave] !! ENTERING CAVE - TIMESTAMP:', Date.now());
  console.error('[Cave] !! Current state:', {
    players: state.players?.length || 'undefined',
    activeIdx: state.activeIdx,
    mode: state.mode,
    playersArray: state.players
  });
  
  if (!state.players || state.players.length === 0) {
    console.error('[Cave] !! NO PLAYERS FOUND! Creating emergency fallback');
    const fallbackPlayers = [{ id: 'P1', name: 'Player 1', col: 3, row: 3 }];
    setPlayers(fallbackPlayers);
    console.error('[Cave] !! Set fallback players, activeIdx now:', state.activeIdx);
  }

  setScene("cave");
  state.mode = "combat";                           // ⬅ immediately mark combat mode
  const board = state.board;
  board.clear();

  // Place players in small cluster
  const startCol = 3, startRow = 3;
  state.players.forEach((p,i)=>{
    const col = startCol + (i%2);
    const row = startRow + Math.floor(i/2);
    p.col = col; p.row = row;
    
    // Get player sprite based on class and affinity
    const playerSprite = getPlayerSpriteForClass(p, 'south'); // Default facing south
    
    const el = board.placeToken(p.id, { 
      col, 
      row, 
      w:1, 
      h:1, 
      cls:"player", 
      label: playerSprite ? "" : p.name, // Only show label if no sprite
      sprite: playerSprite
    });
    
    // Sprite now handled via Board.applyTokenSprite with child sprite-layer
  });

  // Bear boss (1x2) near bottom center
  const bossCol = Math.ceil(board.size/2), bossRow = board.size - 3;
  
  // Create boss using modular system
  console.debug('[Cave] Creating bear boss using modular BossCreator');
  state.boss = BossCreator.createBoss('BEAR', {
    col: bossCol,
    row: bossRow,
    rng: state.rng,
    id: `bear_${Date.now()}`
  });
  
  // Set up deck references for compatibility
  state.bossDeck = state.boss.deck;
  
  console.debug('[Cave] Boss created successfully:', {
    name: state.boss.name,
    position: `${state.boss.col},${state.boss.row}`,
    deckSize: state.boss.deck.drawPile.length
  });
  
  // Place on board with sprite
  const bossSprite = state.boss.getSprite();
  board.placeToken(state.boss.id, { 
    col: bossCol, 
    row: bossRow, 
    w: state.boss.w, 
    h: state.boss.h, 
    cls: "boss", 
    label: bossSprite && bossSprite.hideLabel ? "" : state.boss.name,
    sprite: bossSprite 
  });

  state.entrances = [];
  const btn = document.getElementById("btn-boss-deck"); if (btn) btn.hidden = true;
  const ctx = document.getElementById("context-text"); if (ctx) ctx.textContent = "Entering cave… combat UI will appear.";

  // Reset legacy flags (harmless)
  const tiebreaks = new Map();
  state.players.forEach(p => tiebreaks.set(p.id, state.rng.int(1, p.moveDie ?? 4)));
  state.players.sort((a,b)=>{
    const dieCmp = (a.moveDie??4) - (b.moveDie??4);
    if (dieCmp !== 0) return dieCmp;
    return (tiebreaks.get(b.id) - tiebreaks.get(a.id));
  });

  // Collect items by type (legacy)
  for (const p of state.players) {
    p.weapons = (p.items || []).filter(item => item.type === "weapon");
    p.armor = (p.items || []).filter(item => item.type === "armor");
    p.consumables = (p.items || []).filter(item => item.type === "consumable");
  }

  console.debug(`Players sorted by initiative: ${state.players.map(p => p.name).join(', ')}`);
  
  // Boss deck modal for debugging (temporary)
  renderDeckModal(state.bossDeck);
  
  // Dispatch event to start combat
  document.dispatchEvent(new CustomEvent("cave:entered"));
}

export function exitCave(){
  console.log("Exiting cave");
  // Clear any combat timers
  if (window.combatTimer) {
    clearTimeout(window.combatTimer);
    window.combatTimer = null;
  }
  
  // Reset state
  state.mode = "overworld";
  state.boss = null;
  state.bossDeck = null;
  state.round = 0;
  state.turnIdx = 0;
  
  setScene("overworld");
  
  // Restore players to overworld positions
  const board = state.board;
  board.clear();
  
  // Place players in a safe formation
  const safeCol = 5, safeRow = 5;
  state.players.forEach((p, i) => {
    p.col = safeCol + (i % 3);
    p.row = safeRow + Math.floor(i / 3);
    
    const playerSprite = getPlayerSpriteForClass(p, 'south');
    board.placeToken(p.id, {
      col: p.col,
      row: p.row,
      w: 1,
      h: 1,
      cls: "player",
      label: playerSprite ? "" : p.name,
      sprite: playerSprite
    });
  });
  
  console.log("Cave exited, returned to overworld");
}

// Cave interaction check (legacy)
export function checkCaveEntrance(player) {
  if (!state.entrances) return false;
  
  for (const entrance of state.entrances) {
    if (entrance.sceneTarget === "cave" && 
        player.col === entrance.col && 
        player.row === entrance.row) {
      return true;
    }
  }
  return false;
}
