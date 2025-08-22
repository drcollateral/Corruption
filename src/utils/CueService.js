// cue-service.js
// Centralized cue management service to replace fragmented cue logic

/*
 * CUE TYPE CATEGORIZATION SYSTEM
 * 
 * This service provides standardized cue types that are easily taggable and 
 * maintain consistent behavior across the application:
 * 
 * 1. STICKY CUES - cueService.sticky() or cueService.bossDraw()
 *    - Remain visible until manually dismissed by player click
 *    - Used for: Boss card draws, important state changes, critical info
 *    - Visual: Golden glow with pulsing animation, prominent warning styling
 *    - Behavior: Waits indefinitely for user interaction
 * 
 * 2. CLICK-TO-CONTINUE CUES - cueService.clickToContinue()
 *    - Wait for user interaction then disappear
 *    - Used for: Initiative roll results, confirmation prompts
 *    - Visual: Blue accent, subtle hover effects
 *    - Behavior: Single click anywhere to advance
 * 
 * 3. INFO CUES - cueService.info()
 *    - Persistent status displays that can be replaced
 *    - Used for: Initiative headers, rolling status, UI state
 *    - Visual: Subtle cyan, no interaction hints
 *    - Behavior: Sticky until replaced or scope cleared
 * 
 * 4. ANNOUNCEMENT SEQUENCES - cueService.announce()
 *    - Auto-advancing action descriptions for multiple messages
 *    - Used for: Boss attacks, spell effects, combat actions
 *    - Visual: Orange/yellow boss-style theming
 *    - Behavior: Click-anywhere to advance through sequence
 * 
 * All cue types support:
 * - Scoped management (clear related cues together)
 * - CSS class customization
 * - Key-based replacement
 * - Boss panel logging integration
 */

// Note: This file is self-contained and doesn't need external imports

// ===== Logging utilities =====
function isCueLoggingEnabled() {
  try {
    // Check debug checkbox for cue logging
    const debugCheckbox = document.getElementById('debugCues');
    return debugCheckbox ? debugCheckbox.checked : false;
  } catch {
    return false;
  }
}

let lastLoggedCue = '';
let lastLogTime = 0;

function logCueToConsole(text, category = 'general', key = 'unknown') {
  if (!isCueLoggingEnabled()) return;
  
  const now = Date.now();
  const timestamp = new Date(now).toLocaleTimeString();
  const cueKey = `${category}.${key}`;
  
  // Prevent spam by checking if this is the same cue as last time
  if (lastLoggedCue !== cueKey || (now - lastLogTime) > 1000) {
    const categoryIcon = category === 'boss-actions' ? '👹' : 
                        category === 'combat-actions' ? '⚔️' : '🎯';
    console.log(`${categoryIcon} [${timestamp}] ${cueKey} | ⏱️ CUESERVICE DIRECT`);
    console.log(`   Text: "${text}"`);
    lastLoggedCue = cueKey;
    lastLogTime = now;
  }
}

// ===== Helper DOM utilities (migrated from legacy cues.js) =====
const CUE_STACK_ID = 'cue-stack';
export function ensureCueStack(){
  let stack = document.getElementById(CUE_STACK_ID);
  if (!stack){
    stack = document.createElement('div');
    stack.id = CUE_STACK_ID;
    stack.className = 'cue-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

export function fadeRemoveCue(el){
  if (!el) return;
  el.style.transition = 'opacity .25s ease, transform .25s ease';
  el.style.opacity = '0';
  el.style.transform = 'translateY(-6px) scale(.96)';
  setTimeout(()=>{ try { el.remove(); } catch{} }, 240);
}

export function createCue(text, className='cue-item'){ 
  const stack = ensureCueStack();
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  stack.appendChild(el);
  return el;
}

// Legacy dice sides helper (placeholder used by combat logs)
// Return number of sides (legacy helper previously returned an array)
export function dieSides(n){
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return v;
}
export function removeCue(el){ fadeRemoveCue(el); }

class CueService {
  constructor() {
    this.activeCues = new Map(); // key -> cue element
    this.sequences = new Map(); // scope -> sequence state
    this.logHandler = null; // for boss panel logging
  }
  
  setLogHandler(handler) {
    this.logHandler = handler;
  }
  
  // Show a single cue with optional replacement key
  show(text, opts = {}) {
    const {
      className = '',
      key = null,
      replaceKey = null,
      sticky = false,
      clickAnywhere = true,
      minDwellMs = 0,
      // Cue type tags for clear categorization
      type = null // 'sticky', 'click-to-continue', 'info', 'announcement', etc.
    } = opts;
    
    // Replace existing cue if replaceKey specified
    if (replaceKey && this.activeCues.has(replaceKey)) {
      const oldCue = this.activeCues.get(replaceKey);
      fadeRemoveCue(oldCue);
      this.activeCues.delete(replaceKey);
    }
    
    const stack = ensureCueStack();
    const el = document.createElement('div');
    el.className = `cue-item ${className}`.trim();
    el.textContent = text;
    stack.appendChild(el);
    
    // Store with key if provided
    if (key) {
      this.activeCues.set(key, el);
    }
    
    // Log to boss panel if handler exists
    if (this.logHandler) {
      try { this.logHandler(text); } catch {}
    }
    
    if (sticky) {
      return { el, wait: Promise.resolve() };
    }
    
    // Handle click resolution
    return this._makeClickable(el, { clickAnywhere, minDwellMs });
  }
  
  // Create a sequence of cues that advance one by one
  async sequence(messages, opts = {}) {
    const {
      className = 'boss-card-cue',
      scope = null,
      clickAnywhere = true,
      minDwellMs = 0
    } = opts;
    
    // Clear existing sequence in this scope
    if (scope && this.sequences.has(scope)) {
      this.clearScope(scope);
    }
    
    const elements = [];
    const createdAt = Date.now();
    let currentIndex = 0;
    
    // Create all elements
    messages.forEach((text, i) => {
      const el = document.createElement('div');
      el.className = `cue-item click-to-advance ${className}`.trim();
      el.textContent = text;
      el.style.cursor = 'pointer';
      const stack = ensureCueStack();
      stack.appendChild(el);
      elements.push(el);
      
      // Log each message
      if (this.logHandler) {
        try { this.logHandler(text); } catch {}
      }
    });
    
    // Store sequence state
    const seqState = { elements, currentIndex, scope, active: true };
    if (scope) {
      this.sequences.set(scope, seqState);
    }
    
    return new Promise(resolve => {
      const advance = () => {
        // Enforce dwell only for the first element
        if (currentIndex === 0 && (Date.now() - createdAt) < Math.max(0, minDwellMs)) {
          return;
        }
        
        if (currentIndex < elements.length) {
          const cur = elements[currentIndex++];
          if (cur && cur.parentNode) {
            cur.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            cur.style.opacity = '0';
            cur.style.transform = 'translateY(4px) scale(0.95)';
            setTimeout(() => {
              try { cur.remove(); } catch {}
              if (currentIndex >= elements.length) {
                cleanup();
                resolve();
              }
            }, 180);
          } else if (currentIndex >= elements.length) {
            cleanup();
            resolve();
          }
        }
      };
      
      const onDocClick = () => { if (clickAnywhere) advance(); };
      const onSelfClick = (e) => { e.stopPropagation(); advance(); };
      
      function cleanup() {
        document.removeEventListener('click', onDocClick);
        elements.forEach(el => el.removeEventListener('click', onSelfClick));
        if (scope) {
          cueService.sequences.delete(scope);
        }
        seqState.active = false;
      }
      
      // Set up click handlers
      if (clickAnywhere) {
        document.addEventListener('click', onDocClick);
      }
      elements.forEach(el => el.addEventListener('click', onSelfClick));
    });
  }
  
  // Clear all cues in a scope
  clearScope(scope) {
    if (!scope) return;
    
    const seqState = this.sequences.get(scope);
    if (seqState && seqState.active) {
      seqState.elements.forEach(el => {
        if (el.parentNode) fadeRemoveCue(el);
      });
      this.sequences.delete(scope);
    }
    
    // Also clear any keyed cues that start with scope
    for (const [key, el] of this.activeCues.entries()) {
      if (key.startsWith(scope + ':')) {
        fadeRemoveCue(el);
        this.activeCues.delete(key);
      }
    }
  }
  
  // Remove a specific keyed cue
  remove(key) {
    if (this.activeCues.has(key)) {
      const el = this.activeCues.get(key);
      fadeRemoveCue(el);
      this.activeCues.delete(key);
    }
  }
  
  // Clear all cues
  clearAll() {
    // Clear all keyed cues
    for (const [key, el] of this.activeCues.entries()) {
      fadeRemoveCue(el);
    }
    this.activeCues.clear();
    
    // Clear all sequences
    for (const [scope, seqState] of this.sequences.entries()) {
      if (seqState.active) {
        seqState.elements.forEach(el => {
          if (el.parentNode) fadeRemoveCue(el);
        });
      }
    }
    this.sequences.clear();
  }

  // ====== STANDARDIZED CUE TYPE METHODS ======
  // These provide clear categorization and consistent behavior
  
  // Sticky cues: Remain visible until manually dismissed by click
  sticky(text, opts = {}) {
    // Log the cue
    const category = opts.category || 'general';
    const key = opts.key || 'sticky-cue';
    logCueToConsole(text, category, key);
    
    return this.show(text, { 
      ...opts, 
      sticky: true, 
      clickAnywhere: true,
      type: 'sticky',
      className: opts.className || 'sticky-cue'
    });
  }
  
  // Click-to-continue cues: Wait for user interaction then disappear
  clickToContinue(text, opts = {}) {
    // Log the cue
    const category = opts.category || 'general';
    const key = opts.key || 'click-to-continue';
    logCueToConsole(text, category, key);
    
    return this.show(text, { 
      ...opts, 
      sticky: false, 
      clickAnywhere: true,
      type: 'click-to-continue',
      className: opts.className || 'click-to-continue-cue'
    });
  }
  
  // Info cues: Persistent status displays that can be replaced
  info(text, opts = {}) {
    // Log the cue
    const category = opts.category || 'general';
    const key = opts.key || 'info';
    logCueToConsole(text, category, key);
    
    return this.show(text, { 
      ...opts, 
      sticky: true,
      type: 'info',
      className: opts.className || 'info-cue',
      key: opts.key || 'info'
    });
  }
  
  // Announcement sequences: Auto-advancing action descriptions
  announce(messages, opts = {}) {
    // Log the cue(s)
    const category = opts.category || 'general';
    const key = opts.key || 'announcement';
    const messageArray = Array.isArray(messages) ? messages : [messages];
    messageArray.forEach((msg, i) => {
      logCueToConsole(msg, category, `${key}-${i}`);
    });
    
    // If duration is specified, use timed announcement
    if (opts.duration) {
      return this.timedAnnouncement(messages, opts);
    }
    
    return this.sequence(messages, { 
      ...opts,
      type: 'announcement',
      className: opts.className || 'announcement-cue'
    });
  }
  
  // Timed announcements: Auto-remove after duration
  timedAnnouncement(messages, opts = {}) {
    const { duration = 2000, className = 'timed-announcement-cue' } = opts;
    const messagesArray = Array.isArray(messages) ? messages : [messages];
    
    const elements = messagesArray.map(msg => {
      const el = createCue(msg, className);
      
      // Set CSS duration variable for progress bar
      el.style.setProperty('--duration', `${duration}ms`);
      
      // Auto-remove after duration
      setTimeout(() => {
        if (el.parentNode) {
          el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          el.style.opacity = '0';
          el.style.transform = 'translateY(-8px) scale(0.95)';
          setTimeout(() => {
            try { el.remove(); } catch {}
          }, 300);
        }
      }, duration);
      
      return el;
    });
    
    return Promise.resolve({ elements });
  }
  
  // Boss draw cues: Special sticky cues for card draws that demand attention
  bossDraw(cardName, opts = {}) {
    return this.sticky(`Boss draws: ${cardName}`, {
      ...opts,
      className: 'boss-draw-cue boss-card-cue',
      key: opts.key || 'boss-draw',
      type: 'boss-draw'
    });
  }
  
  // Internal helper for clickable cues
  _makeClickable(el, { clickAnywhere, minDwellMs }) {
    el.classList.add('click-to-advance');
    
    const createdAt = Date.now();
    const dwellOk = () => (Date.now() - createdAt) >= Math.max(0, minDwellMs);
    
    let resolveWait;
    const wait = new Promise(res => { resolveWait = res; });
    
    const tryResolve = () => {
      if (!dwellOk()) return;
      try { el.remove(); } catch {}
      cleanup();
      resolveWait();
    };
    
    const onDocClick = () => { if (clickAnywhere) tryResolve(); };
    const onSelfClick = (e) => { e.stopPropagation(); tryResolve(); };
    
    function cleanup() {
      document.removeEventListener('click', onDocClick, true);
      el.removeEventListener('click', onSelfClick);
    }
    
    if (clickAnywhere) {
      setTimeout(() => document.addEventListener('click', onDocClick, true), 0);
    }
    el.style.cursor = 'pointer';
    el.addEventListener('click', onSelfClick);
    
    return { el, wait };
  }
}

// Export singleton instance
export const cueService = new CueService();

// Compatibility wrapper functions that match existing cue API
export function showCue(text, opts = {}) {
  return cueService.show(text, opts);
}

export function showCueSequence(messages, opts = {}) {
  return cueService.sequence(messages, opts);
}

export function clearCueScope(scope) {
  cueService.clearScope(scope);
}

// Hook up boss panel logging (import events lazily in case of load order)
export function initCueServiceEventBus() {
  import("../core/EventBus.js").then(mod => {
    const { events } = mod;
    events.on('boss:log', (text) => {
      if (cueService.logHandler) {
        cueService.logHandler(text);
      }
    });
  }).catch(()=>{});
}
