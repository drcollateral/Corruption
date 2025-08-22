/**
 * Modern Combat Bridge - Professional Architecture
 * Connects new OOP systems with legacy game state
 */
import { ActionSystem } from './systems/ActionSystem.js';
import { TargetingSystem } from './systems/TargetingSystem.js';
import { UIManager } from './ui/UIManager.js';
import { BossSystem } from './systems/BossSystem.js';
import { EventBus } from './core/EventBus.js';
import { state } from './core/GameState.js'; // Import state directly

// Global instances
let actionSystem = null;
let targetingSystem = null;
let uiManager = null;
let bossSystem = null;
let eventBus = null;

// Initialize the modern combat system
export async function initializeModernCombat() {
  console.log('Initializing modern combat system...');
  
  eventBus = new EventBus();
  actionSystem = new ActionSystem(eventBus);
  targetingSystem = new TargetingSystem(eventBus);
  uiManager = new UIManager(eventBus);
  bossSystem = new BossSystem(eventBus);
  
  setupSystemIntegration();
  await uiManager.initialize();
  
  console.log('Modern combat system ready');
}

function setupSystemIntegration() {
  // Handle boss actions
  eventBus.on('boss:actionDrawn', (data) => {
    uiManager.showMessage(`Boss draws: ${data.action}`, { duration: 1500, type: 'boss-draw' });
    uiManager.logCombatEvent(`Boss draws: ${data.action}`);
  });

  eventBus.on('boss:actionExecuted', (data) => {
    const { result } = data;
    uiManager.showMessage(result.message, { duration: 1500, type: 'boss-action' });
    uiManager.logCombatEvent(result.message);
  });

  // Handle action requests from UI - DISABLED: Legacy ActionBar handles spells directly
  /*
  eventBus.on('action:requested', async (data) => {
    const { actionId } = data;
    const player = getCurrentPlayer();
    
    if (!player) {
  console.warn('[MCB] No active player. state.activeIdx:', state?.activeIdx, 'players length:', state?.players?.length, 'state.mode:', state?.mode);
      // Attempt auto-heal: pick index 0 if available
      if (state?.players?.length) {
        state.activeIdx = 0;
        const healed = getCurrentPlayer();
        if (healed) {
          console.info('[MCB] Auto-selected player index 0 (', healed.name, ')');
        } else {
          uiManager.showError("No active player");
          return;
        }
      } else {
        uiManager.showError("No active player");
        return;
      }
    }

    // Execute the action through the ActionSystem
    const result = await actionSystem.executeAction(player, actionId);
    if (result.success) {
      uiManager.showSuccess(`${player.name} uses ${actionId}`);
    } else {
      uiManager.showError(result.message);
    }
  });
  */

  // Handle targeting events
  eventBus.on('targeting:started', (data) => {
    const { spell } = data;
    targetingSystem.beginTargeting(spell);
  });

  eventBus.on('board:clicked', (data) => {
    const { col, row } = data;
    targetingSystem.handleTargetClick(col, row);
  });
}

// Bridge functions to interface with legacy code
function getCurrentPlayer() {
  // Use the imported state directly
  const s = state;
  console.error('[MCB] !! getCurrentPlayer() - TIMESTAMP:', Date.now());
  console.error('[MCB] !! State object:', s);
  console.error('[MCB] !! s.players:', s?.players);
  console.error('[MCB] !! s.playersArray:', s?.playersArray);
  console.error('[MCB] !! s.activeIdx:', s?.activeIdx);
  console.error('[MCB] !! s.mode:', s?.mode);
  if (!s) return null;
  
  // In combat mode, use the combat turn system
  if (s.mode === 'combat' && s.turnOrder && s.turnOrder.length > 0) {
    const currentSlot = s.turnOrder[s.turnPtr];
    if (currentSlot && currentSlot.kind === 'player' && typeof currentSlot.idx === 'number') {
      return s.players?.[currentSlot.idx] || null;
    }
  }
  
  // Fallback to activeIdx for non-combat situations
  if (typeof s.activeIdx === 'number' && s.players && s.players[s.activeIdx]) {
    console.error('[MCB] !! Using s.players[activeIdx]:', s.players[s.activeIdx]);
    return s.players[s.activeIdx];
  }
  
  // Try playersArray fallback (in case there's a structure mismatch)
  if (typeof s.activeIdx === 'number' && s.playersArray && s.playersArray[s.activeIdx]) {
    console.error('[MCB] !! Using s.playersArray[activeIdx]:', s.playersArray[s.activeIdx]);
    return s.playersArray[s.activeIdx];
  }
  
  // Legacy fallback
  if (s.activePlayer) return s.players?.find(p => p.id === s.activePlayer) || null;
  return null;
}

// Legacy function replacements
export function replaceLegacyCombat() {
  // Override legacy combat functions with modern implementations
  window.executeBossTurn = async function() {
    const boss = getCurrentBoss();
    if (boss && bossSystem) {
      await bossSystem.executeBossTurn(boss);
    }
  };

  window.castSpell = async function(spellId, caster) {
    if (actionSystem) {
      return await actionSystem.executeAction(caster, spellId);
    }
  };

  window.beginTargeting = function(spell) {
    if (targetingSystem) {
      targetingSystem.beginTargeting(spell);
    }
  };

  window.cancelTargeting = function() {
    if (targetingSystem) {
      targetingSystem.cancelTargeting();
    }
  };
}

function getCurrentBoss() {
  return state?.boss;
}

// Auto-initialize when loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAndReplace);
} else {
  initializeAndReplace();
}

async function initializeAndReplace() {
  await initializeModernCombat();
  replaceLegacyCombat();
  console.log('Modern combat bridge initialized');
  // Expose quick debug setter
  window.setActivePlayerIndex = (i)=>{ if(state && state.players && state.players[i]) { state.activeIdx = i; console.log('[MCB] Active player index set to', i, state.players[i]); } else { console.warn('[MCB] Invalid active player index', i); } };
}
