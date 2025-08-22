/**
 * TurnTracker.js - Manages turn counter display in the top bar
 */

export class TurnTracker {
  constructor() {
    this.turnCounterElement = null;
    this.roundElement = null;
    this.turnQueueElement = null;
    this.turnOrder = [];
    this.currentTurnIndex = 0;
    this.currentRound = 1;
    
    console.log('TurnTracker: Initializing...');
    this.initializeElements();
    this.bindEvents();
    console.log('TurnTracker: Ready');
  }
  
  /**
   * Get CSS class for player affinity
   * @param {Object} player - Player object with affinity info
   * @returns {string} CSS class name
   */
  getAffinityClass(player) {
    if (!player || !player.isPlayer) return '';
    
    const affinity = player.affinity || player.class || '';
    const normalized = affinity.toLowerCase().replace(/[^a-z]/g, '-').replace(/^-+|-+$/g, '');
    
    // Map "Nature's Aid" to "natures-aid" for CSS compatibility
    if (normalized === 'nature-s-aid') return 'affinity-natures-aid';
    
    return normalized ? `affinity-${normalized}` : '';
  }
  
  initializeElements() {
    this.turnCounterElement = document.getElementById('turn-counter');
    this.roundElement = document.getElementById('round-number');
    this.turnQueueElement = document.getElementById('turn-queue');
    
    if (!this.turnCounterElement) {
      console.warn('TurnTracker: turn-counter element not found');
    } else {
      // Initialize with default values
      this.updateDisplay();
    }
  }
  
  bindEvents() {
    // Listen for combat state changes
    window.addEventListener('combatStateChanged', (event) => {
      this.handleCombatStateChange(event.detail);
    });
    
    // Listen for turn changes
    window.addEventListener('turnChanged', (event) => {
      this.handleTurnChange(event.detail);
    });
    
    // Listen for round changes
    window.addEventListener('roundChanged', (event) => {
      this.handleRoundChange(event.detail);
    });
  }
  
  /**
   * Set the turn order for the current combat
   * @param {Array} entities - Array of entities in turn order
   */
  setTurnOrder(entities) {
    this.turnOrder = entities.map(entity => ({
      id: entity.id || entity.name,
      name: entity.name || entity.type || 'Unknown',
      type: entity.type || 'entity',
      isPlayer: entity.isPlayer || false,
      affinity: entity.affinity || entity.class || null
    }));
    
    this.currentTurnIndex = 0;
    this.updateDisplay();
  }
  
  /**
   * Advance to the next turn
   */
  nextTurn() {
    if (this.turnOrder.length === 0) return;
    
    this.currentTurnIndex++;
    
    // If we've gone through all entities, start a new round
    if (this.currentTurnIndex >= this.turnOrder.length) {
      this.currentTurnIndex = 0;
      this.nextRound();
    }
    
    this.updateDisplay();
    
    // Dispatch turn change event
    window.dispatchEvent(new CustomEvent('turnChanged', {
      detail: {
        currentEntity: this.getCurrentEntity(),
        turnIndex: this.currentTurnIndex,
        round: this.currentRound
      }
    }));
  }
  
  /**
   * Advance to the next round
   */
  nextRound() {
    this.currentRound++;
    this.updateDisplay();
    
    // Dispatch round change event
    window.dispatchEvent(new CustomEvent('roundChanged', {
      detail: {
        round: this.currentRound,
        turnOrder: this.turnOrder
      }
    }));
  }
  
  /**
   * Set the current round number
   * @param {number} round - The round number
   */
  setRound(round) {
    this.currentRound = Math.max(1, Math.floor(round));
    this.updateDisplay();
  }
  
  /**
   * Get the current active entity
   * @returns {Object|null} Current entity or null
   */
  getCurrentEntity() {
    if (this.turnOrder.length === 0) return null;
    return this.turnOrder[this.currentTurnIndex];
  }
  
  /**
   * Update the visual display
   */
  updateDisplay() {
    if (this.roundElement) {
      this.roundElement.textContent = this.currentRound;
    }
    
    if (this.turnQueueElement && this.turnOrder.length > 0) {
      this.updateTurnQueue();
    }
    
    // Update turn counter visibility
    if (this.turnCounterElement) {
      this.turnCounterElement.style.visibility = 'visible';
    }
  }
  
  /**
   * Update the turn queue display showing current and upcoming turns
   */
  updateTurnQueue() {
    if (!this.turnQueueElement) return;
    if (this.turnOrder.length === 0) return;
    
    // Clear existing turn items
    this.turnQueueElement.innerHTML = '';
    
    // Generate turn items for full cycle starting from current turn
    const totalTurns = this.turnOrder.length;
    for (let i = 0; i < totalTurns; i++) {
      const entityIndex = (this.currentTurnIndex + i) % totalTurns;
      const entity = this.turnOrder[entityIndex];
      
      // Determine turn type and label
      let turnType, turnLabel;
      if (i === 0) {
        turnType = 'current';
        turnLabel = 'Current:';
      } else if (i === 1) {
        turnType = 'next';
        turnLabel = 'Next:';
      } else {
        turnType = 'upcoming';
        turnLabel = `${this.getOrdinalLabel(i)}:`;
      }
      
      // Create turn item element
      const turnItem = document.createElement('div');
      turnItem.className = `turn-item ${turnType}`;
      
      const labelSpan = document.createElement('span');
      labelSpan.className = 'turn-label';
      labelSpan.textContent = turnLabel;
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = entity.name;
      
      if (entity.isPlayer) {
        // Apply affinity coloring for players
        const affinityClass = this.getAffinityClass(entity);
        nameSpan.className = `turn-name player-name ${affinityClass} ${i === 0 ? 'active' : 'inactive'}`;
      } else {
        // Keep red for enemies/bosses
        nameSpan.className = 'turn-name enemy-turn';
      }
      
      turnItem.appendChild(labelSpan);
      turnItem.appendChild(nameSpan);
      this.turnQueueElement.appendChild(turnItem);
    }
  }
  
  /**
   * Get ordinal label for turn position
   * @param {number} position - Turn position (0-based)
   * @returns {string} Ordinal label
   */
  getOrdinalLabel(position) {
    const labels = ['Current', 'Next', 'Then', '4th', '5th', '6th', '7th', '8th'];
    return labels[position] || `${position + 1}th`;
  }
  
  /**
   * Handle combat state changes
   * @param {Object} detail - Combat state details
   */
  handleCombatStateChange(detail) {
    if (detail.round !== undefined) {
      this.setRound(detail.round);
    }
    
    if (detail.turnOrder) {
      this.setTurnOrder(detail.turnOrder);
    }
  }
  
  /**
   * Handle turn changes
   * @param {Object} detail - Turn change details
   */
  handleTurnChange(detail) {
    if (detail.turnIndex !== undefined) {
      this.currentTurnIndex = detail.turnIndex;
      this.updateDisplay();
    }
  }
  
  /**
   * Handle round changes
   * @param {Object} detail - Round change details
   */
  handleRoundChange(detail) {
    if (detail.round !== undefined) {
      this.setRound(detail.round);
    }
  }
  
  /**
   * Reset the turn tracker
   */
  reset() {
    this.turnOrder = [];
    this.currentTurnIndex = 0;
    this.currentRound = 1;
    this.updateDisplay();
  }
  
  /**
   * Show/hide the turn counter
   * @param {boolean} visible - Whether to show the counter
   */
  setVisible(visible) {
    if (this.turnCounterElement) {
      this.turnCounterElement.style.display = visible ? 'flex' : 'none';
    }
  }
}

// Create global instance
export const turnTracker = new TurnTracker();
