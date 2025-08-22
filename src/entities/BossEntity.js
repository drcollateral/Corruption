// /boss_entity.js
// Proper boss entity system - how a real game would structure this

import { getBossSprite } from "../data/BossSprites.js";

import { state } from '../core/GameState.js';

// Debug logging helper - only log if boss logging is enabled
function debugBossLog(...args) {
  if (state?.debug?.logBoss) {
    console.log(...args);
  }
}

export class BossEntity {
  constructor(config) {
    // Core properties
    this.id = config.id || `boss_${Date.now()}`;
    this.type = config.type; // "bear", "dragon", etc.
    this.name = config.name;
    
    // Position and dimensions
    this.col = config.col;
    this.row = config.row;
    this.w = config.w || 1;
    this.h = config.h || 2;
    
    // Combat stats
    this.hp = config.hp;
    this.hpMax = config.hpMax || config.hp;
    this.movementDie = config.movementDie || 'd3';
    
    // State tracking
    this.statuses = [];
    this.enrageNext = false;
    
    // Deck system
    this.deck = null; // Will be set by combat system
  // Optional legacy piles (if a simpler deck shape is used elsewhere)
  this.discard = null; // some existing systems may populate this
  this.drawCount = config.drawCount || 1; // default cards drawn per boss turn
  }
  
  // Position management with optional animation
  moveTo(col, row, animated = false) {
    const oldPos = { col: this.col, row: this.row };
    this.col = col;
    this.row = row;
    
    if (animated) {
      this.onAnimatedMove(oldPos, { col, row });
    } else {
      this.onPositionChanged(oldPos, { col, row });
    }
  }
  
  onAnimatedMove(oldPos, newPos) {
    // Animated movement - notify observers to handle animation
    this.notify('animatedMove', { oldPos, newPos });
  }
  
  onPositionChanged(oldPos, newPos) {
    // Hook for systems that need to track boss movement
    // (visual effects, board updates, etc.)
    this.notify('positionChanged', { oldPos, newPos });
  }
  
  // Combat mechanics
  takeDamage(amount, source = null) {
    const oldHp = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    this.onDamageTaken(amount, oldHp, this.hp, source);
    
    if (this.hp <= 0) {
      this.onDeath();
    }
  }
  
  onDamageTaken(amount, oldHp, newHp, source) {
    this.notify('damageTaken', { amount, oldHp, newHp, source });
  }
  
  onDeath() {
    this.notify('death', { boss: this });
  }
  
  // Status effects
  addStatus(status) {
    // For burn (and future multi-stack DoTs), keep separate instances; else merge by kind
    if (status.kind === 'burn') {
      this.statuses.push({ ...status });
      this.onStatusAdded(status);
      return;
    }
    const existing = this.statuses.find(s => s.kind === status.kind);
    if (existing) {
      existing.remaining = Math.max(existing.remaining || 0, status.remaining || 0);
      existing.amount = (existing.amount || 0) + (status.amount || 0);
      this.onStatusAdded(status); // still notify for UI even when merged
    } else {
      this.statuses.push({ ...status });
      this.onStatusAdded(status);
    }
  }
  
  removeStatus(kind) {
    const index = this.statuses.findIndex(s => s.kind === kind);
    if (index >= 0) {
      const removed = this.statuses.splice(index, 1)[0];
      this.onStatusRemoved(removed);
      return removed;
    }
    return null;
  }
  
  tickStatuses() {
    const expiredStatuses = [];
    
    for (const status of this.statuses) {
      if (typeof status.remaining === 'number' && status.remaining > 0) {
        status.remaining--;
        this.onStatusTick(status);
      }
      
      if (status.remaining <= 0) {
        expiredStatuses.push(status);
      }
    }
    
    // Remove expired statuses
    expiredStatuses.forEach(status => {
      this.removeStatus(status.kind);
    });
    
    return expiredStatuses;
  }
  
  onStatusAdded(status) {
    this.notify('statusAdded', { status });
  }
  
  onStatusRemoved(status) {
    this.notify('statusRemoved', { status });
  }
  
  onStatusTick(status) {
    this.notify('statusTick', { status });
  }
  
  // Collision detection
  occupiesCells() {
    const cells = [];
    for (let dc = 0; dc < this.w; dc++) {
      for (let dr = 0; dr < this.h; dr++) {
        cells.push({ col: this.col + dc, row: this.row + dr });
      }
    }
    return cells;
  }
  
  intersects(col, row) {
    const result = (col >= this.col && col < this.col + this.w &&
            row >= this.row && row < this.row + this.h);
    
    debugBossLog(`🎯 BossEntity.intersects(${col}, ${row}):`, {
      bossPos: { col: this.col, row: this.row },
      bossSize: { w: this.w, h: this.h },
      checkRange: { 
        colMin: this.col, 
        colMax: this.col + this.w - 1,
        rowMin: this.row,
        rowMax: this.row + this.h - 1
      },
      result
    });
    
    return result;
  }
  
  isAdjacentTo(target) {
    const bx1 = this.col, by1 = this.row;
    const bw = this.w, bh = this.h;
    const bx2 = bx1 + bw - 1, by2 = by1 + bh - 1;
    const px = target.col, py = target.row;
    
    // Check all 8 directions (including diagonals)
    // Calculate minimum distance from player to boss rectangle
    const dx = Math.max(0, Math.max(bx1 - px, px - bx2));
    const dy = Math.max(0, Math.max(by1 - py, py - by2));
    
    // Adjacent if within 1 tile in any direction (including diagonal)
    return Math.max(dx, dy) <= 1;
  }
  
  // Sprite management
  getSprite() {
    return getBossSprite(this.type);
  }
  
  // Event system for loose coupling
  observers = new Set();
  
  subscribe(observer) {
    this.observers.add(observer);
  }
  
  unsubscribe(observer) {
    this.observers.delete(observer);
  }
  
  notify(event, data) {
    for (const observer of this.observers) {
      if (typeof observer[event] === 'function') {
        observer[event](this, data);
      } else if (typeof observer.handleBossEvent === 'function') {
        observer.handleBossEvent(event, this, data);
      }
    }
  }
  
  // Serialization for save/load
  serialize() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      col: this.col,
      row: this.row,
      w: this.w,
      h: this.h,
      hp: this.hp,
      hpMax: this.hpMax,
      movementDie: this.movementDie,
      statuses: [...this.statuses],
      enrageNext: this.enrageNext
    };
  }
  
  static deserialize(data) {
    return new BossEntity(data);
  }
}

/* ---------------- Deck Helper Methods (probability + UI support) ---------------- */
BossEntity.prototype.deckSize = function(){
  // Prefer structured deck object with drawPile, fallback to legacy draw format
  let n = 0;
  if (this.deck && Array.isArray(this.deck.drawPile)) {
    n = this.deck.drawPile.length;
  } else if (this.deck && Array.isArray(this.deck.draw)) {
    n = this.deck.draw.length; // Legacy format support
  } else if (Array.isArray(this.deck)) {
    n = this.deck.length;
  }
  try { if (window.DEBUG?.is('deck')) window.DEBUG.log('deck','deckSize', n); } catch {}
  return n;
};

BossEntity.prototype.discardSize = function(){
  // Prefer structured deck object with discardPile, fallback to legacy discard format
  let n = 0;
  if (this.deck && Array.isArray(this.deck.discardPile)) {
    n = this.deck.discardPile.length;
  } else if (this.deck && Array.isArray(this.deck.discard)) {
    n = this.deck.discard.length; // Legacy format support
  } else if (Array.isArray(this.discard)) {
    n = this.discard.length;
  }
  try { if (window.DEBUG?.is('deck')) window.DEBUG.log('deck','discardSize', n); } catch {}
  return n;
};

BossEntity.prototype.getDrawCount = function(){
  return this.drawCount || this.drawPerTurn || 1;
};

BossEntity.prototype.getCardName = function(cardId){
  const map = {
    swipe: 'Swipe',
    charge: 'Charge', 
    roar: 'Roar',
    enrage: 'Enrage',
    maul: 'Maul',
    hibernate: 'Hibernate',
    // Legacy compatibility
    advance1: 'Advance 1'
  };
  
  // Try to find name from live card objects in either format
  if (this.deck) {
    const drawPile = this.deck.drawPile || this.deck.draw || [];
    const discardPile = this.deck.discardPile || this.deck.discard || [];
    const found = drawPile.concat(discardPile).find(c => c && c.id === cardId);
    if (found && found.name) return found.name;
  }
  
  return map[cardId] || (cardId ? cardId.charAt(0).toUpperCase() + cardId.slice(1) : '?');
};

BossEntity.prototype.getDeckCounts = function(){
  const counts = new Map();
  const add = (arr, field) => {
    if (!Array.isArray(arr)) return;
    for (const c of arr){
      const id = c && c.id ? c.id : c;
      if (!id) continue;
      const entry = counts.get(id) || { inDeck:0, inDiscard:0, total:0 };
      entry[field]++;
      entry.total++;
      counts.set(id, entry);
    }
  };
  
  // Handle both structured deck formats
  if (this.deck && this.deck.drawPile) {
    add(this.deck.drawPile, 'inDeck');
  } else if (this.deck && this.deck.draw) {
    add(this.deck.draw, 'inDeck'); // Legacy format support
  } else if (Array.isArray(this.deck)) {
    add(this.deck, 'inDeck');
  }
  
  if (this.deck && this.deck.discardPile) {
    add(this.deck.discardPile, 'inDiscard');
  } else if (this.deck && this.deck.discard) {
    add(this.deck.discard, 'inDiscard'); // Legacy format support
  } else if (Array.isArray(this.discard)) {
    add(this.discard, 'inDiscard');
  }
  
  try { if (window.DEBUG?.is('deck')) window.DEBUG.log('deck','getDeckCounts', Array.from(counts.entries())); } catch {}
  return counts;
};

BossEntity.prototype.getDeckBreakdown = function(){
  const map = this.getDeckCounts();
  const out = [];
  for (const [id, info] of map.entries()){
    out.push({ id, name: this.getCardName(id), inDeck: info.inDeck, inDiscard: info.inDiscard, total: info.total });
  }
  out.sort((a,b)=> (b.inDeck - a.inDeck) || a.name.localeCompare(b.name));
  try { if (window.DEBUG?.is('deck')) window.DEBUG.log('deck','getDeckBreakdown', out); } catch {}
  return out;
};

// Boss factory for different boss types - DEPRECATED
// Use src/factories/BossFactory.js for new boss creation
export class BossFactory {
  static async createBear(col = 8, row = 8, overrides = {}) {
    try {
      // Import the new factory dynamically to avoid circular dependencies
      const { createBear } = await import('../factories/BossFactory.js');
      return await createBear(col, row, overrides);
    } catch (error) {
      console.error('Failed to load new BossFactory, using legacy fallback:', error);
      
      // Fallback to basic boss entity
      return new BossEntity({
        id: `bear_${Date.now()}`,
        type: 'bear',
        name: 'Bear',
        col,
        row,
        w: 1,
        h: 2,
        hp: 30,
        hpMax: 30,
        movementDie: 'd3',
        drawCount: 1,
        ...overrides
      });
    }
  }
  
  static createDragon(col, row) {
    return new BossEntity({
      type: 'dragon', 
      name: 'Ancient Dragon',
      col,
      row,
      w: 2,
      h: 3,
      hp: 300,
      hpMax: 300,
      movementDie: 'd6'
    });
  }
  
  // Add more boss types as needed
}
