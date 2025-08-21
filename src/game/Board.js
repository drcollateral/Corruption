// /src/systems/board.js
// Board draws nothing itself; it manages token DOM and positions relative to grid.
import { state } from "../core/GameState.js";
import { getPlayerSpriteForClass } from "../data/PlayerSprites.js";
export class Board {
  constructor(root, size){
    this.root = root;
    this.size = size;
    this.tokens = new Map(); // id -> HTMLElement
    this.initializeTiles(); // Create tile elements for highlighting
  }
  
  // Create invisible tile elements for highlighting and click detection
  initializeTiles() {
    for (let row = 1; row <= this.size; row++) {
      for (let col = 1; col <= this.size; col++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.col = String(col);
        tile.dataset.row = String(row);
        tile.style.position = 'absolute';
        tile.style.left = `calc((${col} - 1) * (100% / ${this.size}))`;
        tile.style.top = `calc((${row} - 1) * (100% / ${this.size}))`;
        tile.style.width = `calc(100% / ${this.size})`;
        tile.style.height = `calc(100% / ${this.size})`;
        tile.style.pointerEvents = 'auto';
        tile.style.zIndex = '1'; // Below tokens but above background
        this.root.appendChild(tile);
      }
    }
  }
  
  within(col,row){ return col>=1 && col<=this.size && row>=1 && row<=this.size; }
  placeToken(id, { col,row,w=1,h=1,cls="",label="",sprite=null }){
    const el = document.createElement("div");
    const sizeCls = (w===1 && h===2) ? "size-1x2" : "size-1x1";
    el.className = `token ${cls} ${sizeCls}`.trim();
    el.style.setProperty("--col", String(col));
    el.style.setProperty("--row", String(row));
    el.dataset.col = String(col);
    el.dataset.row = String(row);
    
    // Dynamic z-index so southern-most tokens render above northern ones
    try { el.style.setProperty('--token-z', String(this.computeZIndex(row, h))); } catch {}
    
    // Apply sprite configuration if provided
    if (sprite) {
      this.applyTokenSprite(el, sprite);
    } else if (cls && cls.includes("player")) {
      // Fallback: auto-apply player sprite if missing
      const p = (state.players || []).find(pp => pp.id === id);
      if (p) {
        const spr = getPlayerSpriteForClass(p, 'south');
        if (spr) this.applyTokenSprite(el, spr);
      }
    }
    
  // Add label unless sprite config says not to
  if (label && (!sprite || !sprite.hideLabel)) { 
      el.classList.add("label"); 
      el.dataset.name = label; 
    }
    
    this.root.appendChild(el);
    this.tokens.set(id, el);
    return el;
  }

  // Helper to fetch the DOM element for a token by id
  getToken(id){
    return this.tokens.get(id) || null;
  }
  
  applyTokenSprite(el, sprite) {
    // Ensure a child sprite layer exists so sprites can overflow tile bounds cleanly
    let layer = el.querySelector('.sprite-layer');
    if (!layer){
      layer = document.createElement('div');
      layer.className = 'sprite-layer';
      el.appendChild(layer);
    }
  // Clear any legacy inline background on the token itself to avoid double-render and clipping
  el.style.backgroundImage = 'none';
  el.style.backgroundSize = '';
  el.style.backgroundRepeat = '';
  el.style.backgroundPosition = '';
    if (sprite.image) {
      layer.style.backgroundImage = `url('${sprite.image}')`;
      const size = sprite.size || '100% 100%';
      layer.style.backgroundSize = size;
      const pos = sprite.position || 'center bottom';
      layer.style.backgroundPosition = pos;
      // Expand sprite layer bounds relative to token for overflow headroom
      layer.style.width = sprite.layerWidth || '180%';
      layer.style.height = sprite.layerHeight || '200%';
    }
    if (sprite.transparent) {
      el.style.backgroundColor = 'transparent';
      el.style.boxShadow = 'none';
    }
  // Do not override dynamic z-index with sprite config; stacking is row-based
    el.style.overflow = 'visible';
    if (sprite.pointerEvents) {
      // Apply pointer-events to the sprite layer so the token remains interactive
      layer.style.pointerEvents = sprite.pointerEvents;
    }
  }
  moveToken(id, col, row){
    const el = this.tokens.get(id); if(!el) return;
    if(!this.within(col,row)) return;
    el.style.setProperty("--col", String(col));
    el.style.setProperty("--row", String(row));
    el.dataset.col = String(col);
    el.dataset.row = String(row);
    // Update z-index on move as well
    const h = el.classList.contains('size-1x2') ? 2 : 1;
    try { el.style.setProperty('--token-z', String(this.computeZIndex(Number(row), h))); } catch {}
  }
  removeToken(id){ const el = this.tokens.get(id); if(el) el.remove(); this.tokens.delete(id); }
  getTokenPos(id){
    const el = this.tokens.get(id); if(!el) return null;
    return { col: Number(el.dataset.col), row: Number(el.dataset.row) };
  }
  clear(){ for(const el of this.tokens.values()) el.remove(); this.tokens.clear(); }

  // Simple painter's algorithm: larger row (further south) gets higher z-index.
  // For tall tokens (h>1), use the foot row (row + h - 1) so feet are the stacking anchor.
  computeZIndex(row, h=1){
    const foot = Number(row) + Math.max(0, Number(h||1) - 1);
    // Base 100 to sit below overlays/cues which are at 1200+, leave headroom for effects.
    return 100 + foot;
  }
}
