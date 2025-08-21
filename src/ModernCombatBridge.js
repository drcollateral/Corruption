/**
 * Modern Combat Bridge - Professional Architecture
 * Connects new OOP systems with legacy game state
 */
import { ActionSystem } from './systems/ActionSystem.js';
import { TargetingSystem } from './systems/TargetingSystem.js';
import { UIManager } from './ui/UIManager.js';
import { BossSystem } from './systems/BossSystem.js';
import { EventBus } from './core/EventBus.js';

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

  // Handle action requests from UI
  eventBus.on('action:requested', async (data) => {
    const { actionId } = data;
    const player = getCurrentPlayer();
    
    if (!player) {
      uiManager.showError("No active player");
      return;
    }

    // Execute the action through the ActionSystem
    const result = await actionSystem.executeAction(player, actionId);
    if (result.success) {
      uiManager.showSuccess(`${player.name} uses ${actionId}`);
    } else {
      uiManager.showError(result.message);
    }
  });

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
  // Import state dynamically to avoid circular dependencies
  return window.state?.players?.find(p => p.id === window.state?.activePlayer);
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
  return window.state?.boss;
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
}
