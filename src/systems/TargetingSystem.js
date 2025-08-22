/**
 * Targeting System - Handles all targeting mechanics cleanly
 * Supports different targeting modes and validation
 */

export class TargetingSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.activeTargeting = null;
    this.highlightedTiles = new Set();
  }

  // Start targeting mode for a specific action
  beginTargeting(caster, action, options = {}) {
    if (this.activeTargeting) {
      this.cancelTargeting();
    }

    this.activeTargeting = {
      caster,
      action,
      range: action.range,
      targetType: action.targetType,
      validTargets: [],
      onComplete: options.onComplete,
      onCancel: options.onCancel
    };

    // Calculate and highlight valid targets
    this.calculateValidTargets();
    this.highlightTargets();
    
    // Show targeting UI
    this.eventBus.emit('targeting:started', {
      caster: caster.name,
      action: action.name,
      instruction: this.getTargetingInstruction()
    });

    return true;
  }

  cancelTargeting() {
    if (!this.activeTargeting) return;

    this.clearHighlights();
    
    const onCancel = this.activeTargeting.onCancel;
    this.activeTargeting = null;
    
    this.eventBus.emit('targeting:cancelled');
    
    if (onCancel) {
      onCancel();
    }
  }

  // Handle a click during targeting
  handleTargetClick(position) {
    if (!this.activeTargeting) return false;

    const { col, row } = position;
    
    // Check if this is a valid target
    if (!this.isValidTarget(col, row)) {
      this.eventBus.emit('targeting:invalid', 'No valid target at that location.');
      return false;
    }

    // Get the target at this position
    const target = this.getTargetAt(col, row);
    
    // Complete targeting
    this.completeTargeting([target]);
    return true;
  }

  completeTargeting(targets) {
    if (!this.activeTargeting) return;

    const { caster, action, onComplete } = this.activeTargeting;
    
    this.clearHighlights();
    this.activeTargeting = null;
    
    this.eventBus.emit('targeting:completed', { caster, action, targets });
    
    if (onComplete) {
      onComplete(targets);
    }
  }

  calculateValidTargets() {
    if (!this.activeTargeting) return;

    const { caster, range, targetType } = this.activeTargeting;
    const validTargets = [];

    // Calculate tiles within range
    const tilesInRange = this.getTilesInRange(caster.position, range);
    
    tilesInRange.forEach(pos => {
      const target = this.getTargetAt(pos.col, pos.row);
      
      if (this.isTargetTypeValid(target, targetType, caster)) {
        validTargets.push(pos);
      }
    });

    this.activeTargeting.validTargets = validTargets;
  }

  getTilesInRange(origin, range) {
    const tiles = [];
    
    for (let col = origin.col - range; col <= origin.col + range; col++) {
      for (let row = origin.row - range; row <= origin.row + range; row++) {
        const distance = Math.max(Math.abs(col - origin.col), Math.abs(row - origin.row));
        
        if (distance <= range && this.isValidTile(col, row)) {
          tiles.push({ col, row });
        }
      }
    }
    
    return tiles;
  }

  isTargetTypeValid(target, targetType, caster) {
    switch (targetType) {
      case 'none':
        return true;
      case 'self':
        return target === caster;
      case 'ally':
        return target && target.type === caster.type && target !== caster;
      case 'enemy':
        return target && target.type !== caster.type;
      case 'any':
        return target && target !== caster;
      default:
        return false;
    }
  }

  isValidTarget(col, row) {
    if (!this.activeTargeting) return false;
    
    return this.activeTargeting.validTargets.some(pos => 
      pos.col === col && pos.row === row
    );
  }

  isValidTile(col, row) {
    // Check bounds and tile validity
    return col >= 0 && col < 15 && row >= 0 && row < 15;
  }

  getTargetAt(col, row) {
    // This should interface with the board system to get entities at position.
    // Replace with a direct query method or callback.
    if (typeof this.eventBus.getEntityAt === 'function') {
      return this.eventBus.getEntityAt(col, row);
    }
    // If not available, return null.
    return null;
  }

  highlightTargets() {
    if (!this.activeTargeting) return;

    // Clear existing highlights
    this.clearHighlights();

    // Add new highlights
    this.activeTargeting.validTargets.forEach(pos => {
      this.highlightTile(pos.col, pos.row);
    });
  }

  highlightTile(col, row) {
    const tileId = `${col},${row}`;
    this.highlightedTiles.add(tileId);
    
    this.eventBus.emit('board:highlightTile', { 
      col, 
      row, 
      type: 'target',
      active: true 
    });
  }

  clearHighlights() {
    this.highlightedTiles.forEach(tileId => {
      const [col, row] = tileId.split(',').map(Number);
      this.eventBus.emit('board:highlightTile', { 
        col, 
        row, 
        type: 'target',
        active: false 
      });
    });
    
    this.highlightedTiles.clear();
  }

  getTargetingInstruction() {
    if (!this.activeTargeting) return '';

    const { action, targetType } = this.activeTargeting;
    
    switch (targetType) {
      case 'enemy':
        return `Select an enemy to target with ${action.name}`;
      case 'ally':
        return `Select an ally to target with ${action.name}`;
      case 'any':
        return `Select a target for ${action.name}`;
      default:
        return `Click to use ${action.name}`;
    }
  }

  isTargeting() {
    return this.activeTargeting !== null;
  }

  getCurrentTargeting() {
    return this.activeTargeting;
  }
}

// Convenience functional exports (legacy compatibility)
export function createTargetingSystem(eventBus){ return new TargetingSystem(eventBus); }
export function isTargeting(ts){ return ts?.isTargeting(); }
export function beginTargeting(ts, caster, action, opts){ return ts?.beginTargeting(caster, action, opts); }
export function cancelTargeting(ts){ return ts?.cancelTargeting(); }
// Direct DOM targeting for simple spell/movement targeting
export function beginSimpleTargeting({ range, origin, canTarget, onSelect, onCancel, onInvalidTarget, highlightClass = 'highlight-target', distanceMetric = 'chebyshev' }) {
  console.log('beginSimpleTargeting called with:', { range, origin, canTarget: !!canTarget, highlightClass });
  console.log('All tiles on page:', document.querySelectorAll('.tile').length);
  
  if (!origin) {
    console.error('No origin provided for targeting');
    return;
  }

  // Clear any existing highlights
  const existingHighlights = document.querySelectorAll('.tile.highlight-target, .tile.highlight-move');
  console.log('Clearing', existingHighlights.length, 'existing highlights');
  existingHighlights.forEach(tile => {
    tile.classList.remove('highlight-target', 'highlight-move');
  });

  const tiles = [];
  const gridSize = 15; // Assuming 15x15 grid
  let highlightedCount = 0;
  
  // Calculate tiles in range using selected distance metric
  for (let col = 1; col <= gridSize; col++) {
    for (let row = 1; row <= gridSize; row++) {
      const dx = Math.abs(col - origin.col);
      const dy = Math.abs(row - origin.row);
      let distance;
      if (distanceMetric === 'chebyshev') {
        distance = Math.max(dx, dy);
      } else if (distanceMetric === 'manhattan') {
        distance = dx + dy;
      } else if (distanceMetric === 'dnd35') {
        // 3.5 optional: 5/10 alternating diagonals. For range gating, approximate by: cost = dx + dy + floor(min(dx,dy)/2)
        const diagonals = Math.min(dx, dy);
        const straight = Math.abs(dx - dy);
        // Each pair of diagonals costs 15 (5+10); so cost = 5*diagonals + 5*floor((diagonals+1)/2)
        // Simplify using integer arithmetic: pairCost = 15 per 2; leftover = 5
        const diagPairs = Math.floor(diagonals / 2);
        const leftover = diagonals % 2; // 1 if odd
        const diagCost = diagPairs * 15 + leftover * 5; // in 'feet'
        const straightCost = straight * 5;
        distance = (diagCost + straightCost) / 5; // convert back to 5-ft units
      } else {
        distance = Math.max(dx, dy);
      }
      if (distance <= range) {
        const isValid = canTarget ? canTarget(col, row) : true;
        if (isValid) {
          tiles.push({ col, row });
          
          // Highlight the tile directly with the specified class
          const tile = document.querySelector(`[data-col="${col}"][data-row="${row}"]`);
          if (tile) {
            tile.classList.add(highlightClass);
            highlightedCount++;
            console.log(`✓ Highlighted tile at ${col}, ${row} with class ${highlightClass} - classes:`, tile.className);
          } else {
            console.warn(`✗ No tile element found at ${col}, ${row}`);
            // Let's also try with .tile selector
            const tileAlt = document.querySelector(`.tile[data-col="${col}"][data-row="${row}"]`);
            if (tileAlt) {
              tileAlt.classList.add(highlightClass);
              highlightedCount++;
              console.log(`✓ (Alt) Highlighted tile at ${col}, ${row} with class ${highlightClass}`);
            }
          }
        } else {
          console.log(`Tile at ${col}, ${row} in range but invalid for targeting`);
        }
      }
    }
  }

  console.log(`Total highlighted tiles: ${highlightedCount} out of ${tiles.length} valid tiles`);

  // Set up click handlers
  const clickHandler = (event) => {
    const tile = event.target.closest('.tile');
    if (!tile) {
      console.log('Click not on a tile element');
      return;
    }

    const col = parseInt(tile.dataset.col);
    const row = parseInt(tile.dataset.row);

    if (!col || !row) {
      console.log('Tile missing col/row data:', tile.dataset);
      return;
    }

    console.log(`Clicked tile at ${col}, ${row}, highlighted:`, tile.classList.contains(highlightClass));

    // Check if this tile is highlighted with the correct class
    if (tile.classList.contains(highlightClass)) {
      cleanup();
      console.log('Valid target selected:', { col, row });
      if (onSelect) onSelect({ col, row });
    } else if (onInvalidTarget) {
      console.log('Invalid target clicked:', { col, row });
      onInvalidTarget({ col, row });
    }
  };

  const escapeHandler = (event) => {
    if (event.key === 'Escape') {
      console.log('Escape pressed - cancelling targeting');
      cleanup();
      if (onCancel) onCancel();
    }
  };

  const cleanup = () => {
    document.removeEventListener('click', clickHandler);
    document.removeEventListener('keydown', escapeHandler);
    
    // Clear all highlights
    const highlightsToRemove = document.querySelectorAll('.tile.highlight-target, .tile.highlight-move');
    console.log('Cleaning up', highlightsToRemove.length, 'highlights');
    highlightsToRemove.forEach(tile => {
      tile.classList.remove('highlight-target', 'highlight-move');
    });
  };

  document.addEventListener('click', clickHandler);
  document.addEventListener('keydown', escapeHandler);

  return { cleanup };
}

// Legacy tile selection (not yet implemented in new system)
export function beginTileSelection(opts){
  // opts: { tiles:[{col,row}], canTarget(col,row), onSelect({col,row}), onCancel, eventBus }
  if (!opts || !Array.isArray(opts.tiles)) return;
  const { eventBus } = opts;
  const tiles = opts.tiles;
  const canTarget = typeof opts.canTarget === 'function' ? opts.canTarget : () => true;
  const highlighted = [];
  for (const t of tiles){
    if (!canTarget(t.col, t.row)) continue;
    highlighted.push(t);
    if (eventBus) eventBus.emit('board:highlightTile', { col:t.col,row:t.row,type:'move',active:true });
  }
  const clickHandler = (e) => {
    const tileEl = e.target.closest?.('.tile');
    if (!tileEl) return;
    const col = Number(tileEl.dataset.col), row = Number(tileEl.dataset.row);
    if (!canTarget(col,row)) return;
    cleanup();
    if (typeof opts.onSelect === 'function') opts.onSelect({ col,row });
  };
  const keyHandler = (e) => {
    if (e.key === 'Escape') { cleanup(); if (typeof opts.onCancel === 'function') opts.onCancel(); }
  };
  function cleanup(){
    document.removeEventListener('click', clickHandler, true);
    window.removeEventListener('keydown', keyHandler, true);
    for (const t of highlighted){
      if (eventBus) eventBus.emit('board:highlightTile', { col:t.col,row:t.row,type:'move',active:false });
    }
  }
  document.addEventListener('click', clickHandler, true);
  window.addEventListener('keydown', keyHandler, true);
}
