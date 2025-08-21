// /src/core/events.js
// Lightweight pub/sub for UI and game events, plus centralized store.
export class EventBus {
  constructor(){ this.map = new Map(); }
  on(type, fn){ 
    if(!this.map.has(type)) this.map.set(type,new Set()); 
    this.map.get(type).add(fn); 
    return () => this.off(type,fn); 
  }
  off(type, fn){ this.map.get(type)?.delete(fn); }
  emit(type, payload){ 
    this.map.get(type)?.forEach(fn => {
      try {
        fn(payload);
      } catch (error) {
        console.error('Event listener error:', error, { type, payload });
      }
    });
  }
}

// Simple store for shared state with subscription support
class Store {
  constructor() {
    this.data = new Map();
    this.listeners = new Map(); // key -> Set of callbacks
  }
  
  get(key, defaultValue = null) {
    return this.data.has(key) ? this.data.get(key) : defaultValue;
  }
  
  set(key, value) {
    const oldValue = this.data.get(key);
    if (oldValue === value) return; // Skip if no change
    
    this.data.set(key, value);
    
    // Notify specific key listeners
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(callback => {
        try {
          callback(value, oldValue, key);
        } catch (error) {
          console.error('Store listener error:', error, { key, value, oldValue });
        }
      });
    }
    
    // Emit global state change event
    events.emit('store:changed', { key, value, oldValue });
  }
  
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(callback);
        if (keyListeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }
  
  // Batch updates to prevent excessive re-renders
  batch(fn) {
    const originalSet = this.set;
    const batched = [];
    
    // Override set to batch updates
    this.set = (key, value) => {
      batched.push({ key, value });
    };
    
    try {
      fn();
    } finally {
      // Restore original set and flush
      this.set = originalSet;
      batched.forEach(({ key, value }) => this.set(key, value));
    }
  }
}

export const events = new EventBus();
export const store = new Store();

// Common event names: 'player:moved', 'scene:changed', 'boss:drew', 'ui:sheet:update'
// Store keys: 'activePlayer', 'playerHp', 'bossHp', 'turnState', 'cueStack'
