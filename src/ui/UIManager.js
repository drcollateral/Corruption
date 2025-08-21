/**
 * UI Manager - Clean interface between game systems and DOM
 * Handles all UI updates, messages, and user interactions
 */
import { cueService } from '../utils/CueService.js';

export class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.elements = {};
    this.setupEventHandlers();
  }

  async initialize() {
    this.cacheElements();
    this.setupClickHandlers();
  }

  cacheElements() {
    this.elements = {
      board: document.getElementById('board'),
      combatLog: document.getElementById('combat-log'),
      actionBar: document.getElementById('action-bar'),
      partyPanel: document.getElementById('party-panel'),
      bossPanel: document.getElementById('boss-panel')
    };
  }

  setupEventHandlers() {
    // Listen for game events
    this.eventBus.on('spell:cast', this.handleSpellCast.bind(this));
    this.eventBus.on('effect:triggered', this.handleEffectTriggered.bind(this));
    this.eventBus.on('targeting:started', this.handleTargetingStarted.bind(this));
    this.eventBus.on('targeting:cancelled', this.handleTargetingCancelled.bind(this));
    this.eventBus.on('targeting:invalid', this.handleTargetingInvalid.bind(this));
    this.eventBus.on('turn:start', this.handleTurnStart.bind(this));
    this.eventBus.on('turn:end', this.handleTurnEnd.bind(this));
    this.eventBus.on('board:highlightTile', this.handleTileHighlight.bind(this));
  }

  setupClickHandlers() {
    // Board click handling for targeting and movement
    if (this.elements.board) {
      this.elements.board.addEventListener('click', (e) => {
        const tile = e.target.closest('.tile');
        if (tile) {
          const col = parseInt(tile.dataset.col);
          const row = parseInt(tile.dataset.row);
          this.eventBus.emit('board:clicked', { col, row, element: tile });
        }
      });
    }

    // Action button handling
    document.addEventListener('click', (e) => {
      if (e.target.matches('.action-btn')) {
        const actionId = e.target.dataset.action;
        this.eventBus.emit('action:requested', { actionId, type: 'action' });
      }
      
      if (e.target.matches('.bonus-btn')) {
        const actionId = e.target.dataset.action;
        this.eventBus.emit('action:requested', { actionId, type: 'bonus' });
      }
    });
  }

  // Message display methods
  showMessage(text, options = {}) {
    const { duration, sticky = false, type = 'info' } = options;
    
    if (sticky) {
      return cueService.sticky(text, { className: `${type}-cue` });
    } else if (duration) {
      return cueService.announce(text, { duration, className: `${type}-cue` });
    } else {
      return cueService.clickToContinue(text, { className: `${type}-cue` });
    }
  }

  showError(message) {
    return this.showMessage(message, { sticky: true, type: 'error' });
  }

  showSuccess(message) {
    return this.showMessage(message, { duration: 1500, type: 'success' });
  }

  // Event handlers
  handleSpellCast(data) {
    const { caster, spell, targets, message } = data;
    this.showMessage(message, { duration: 1500, type: 'spell-cast' });
    this.logCombatEvent(message);
  }

  handleEffectTriggered(data) {
    const { type, message } = data;
    this.showMessage(message, { duration: 1000, type: 'effect' });
    this.logCombatEvent(message);
  }

  handleTargetingStarted(data) {
    const { instruction } = data;
    this.showMessage(instruction, { duration: 800, type: 'targeting' });
  }

  handleTargetingCancelled() {
    this.showMessage('Targeting cancelled.', { duration: 800, type: 'quick-feedback' });
  }

  handleTargetingInvalid(message) {
    this.showError(message);
  }

  handleTurnStart(entity) {
    this.showMessage(`${entity.name}'s turn begins.`, { duration: 1200, type: 'turn-start' });
    this.logCombatEvent(`${entity.name}'s turn begins.`);
    this.updateActiveEntity(entity);
  }

  handleTurnEnd(entity) {
    this.logCombatEvent(`${entity.name}'s turn ends.`);
    this.clearActiveEntity();
  }

  handleTileHighlight(data) {
    const { col, row, type, active } = data;
    const tile = this.elements.board?.querySelector(`[data-col="${col}"][data-row="${row}"]`);
    
    if (tile) {
      if (active) {
        tile.classList.add(`highlight-${type}`);
      } else {
        tile.classList.remove(`highlight-${type}`);
      }
    }
  }

  // UI update methods
  updateActiveEntity(entity) {
    // Clear existing active states
    this.clearActiveEntity();
    
    // Set active state for current entity
    if (entity.type === 'player') {
      const playerToken = this.elements.board?.querySelector(`[data-player-id="${entity.id}"]`);
      if (playerToken) {
        playerToken.classList.add('active');
      }
    }
  }

  clearActiveEntity() {
    const activeTokens = this.elements.board?.querySelectorAll('.token.active');
    activeTokens?.forEach(token => token.classList.remove('active'));
  }

  logCombatEvent(message) {
    if (!this.elements.combatLog) return;
    
    const logLine = document.createElement('div');
    logLine.className = 'log-line';
    logLine.textContent = message;
    
    this.elements.combatLog.appendChild(logLine);
    this.elements.combatLog.scrollTop = this.elements.combatLog.scrollHeight;
  }

  updateActionBar(entity) {
    if (!this.elements.actionBar || entity.type !== 'player') return;
    
    // Update action buttons based on available actions
    const actionButtons = this.elements.actionBar.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
      const actionId = btn.dataset.action;
      const canUse = this.canEntityUseAction(entity, actionId);
      btn.disabled = !canUse;
      btn.classList.toggle('disabled', !canUse);
    });
  }

  canEntityUseAction(entity, actionId) {
    // This would check with the ActionSystem to see if the entity can use this action
    return this.eventBus.emit('action:canUse', { entity, actionId }) !== false;
  }

  updateEntityDisplay(entity) {
    // Update health bars, status effects, etc.
    if (entity.type === 'player') {
      this.updatePlayerDisplay(entity);
    } else if (entity.type === 'boss') {
      this.updateBossDisplay(entity);
    }
  }

  updatePlayerDisplay(player) {
    const playerPanel = document.querySelector(`[data-player-id="${player.id}"]`);
    if (!playerPanel) return;
    
    // Update health, mana, status effects, etc.
    const healthBar = playerPanel.querySelector('.health-bar');
    if (healthBar) {
      const healthPercent = (player.currentHP / player.maxHP) * 100;
      healthBar.style.width = `${healthPercent}%`;
    }
  }

  updateBossDisplay(boss) {
    if (!this.elements.bossPanel) return;
    
    // Update boss health, effects, etc.
    const healthBar = this.elements.bossPanel.querySelector('.boss-health-bar');
    if (healthBar) {
      const healthPercent = (boss.currentHP / boss.maxHP) * 100;
      healthBar.style.width = `${healthPercent}%`;
    }
  }

  // Utility methods
  refresh() {
    // Force a full UI refresh
    this.eventBus.emit('ui:refreshRequested');
  }

  showBossAction(boss, action) {
    return cueService.bossDraw(action.name, {
      key: 'boss-action',
      message: `Boss uses: ${action.name}`
    });
  }
}
