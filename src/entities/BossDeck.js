// /src/systems/boss_deck.js
// Deck with draw/discard piles + reshuffle + probability peek.
import { state } from '../core/GameState.js';

// Debug logging helper - only log if boss logging is enabled
function debugBossLog(...args) {
  if (state?.debug?.logBoss) {
    console.error(...args);
  }
}

export class BossDeck {
  constructor(rng, cards){
    debugBossLog('[BossDeck] !! CONSTRUCTOR TIMESTAMP:', Date.now());
    debugBossLog('[BossDeck] !! Creating deck with cards:', cards);
    this.rng = rng;
    this.drawPile = [];
    this.discardPile = [];
    for (const c of cards){ 
      debugBossLog('[BossDeck] !! Processing card:', c);
      for(let i=0;i<c.count;i++) {
        const card = { id:c.id, name:c.name, desc:c.desc };
        // Copy keywords as individual properties for easy checking
        if (c.keywords) {
          debugBossLog('[BossDeck] !! Found keywords:', c.keywords, 'for card:', c.name);
          for (const keyword of c.keywords) {
            card[keyword] = true;
            debugBossLog('[BossDeck] !! Set card.' + keyword + ' = true');
          }
        }
        debugBossLog('[BossDeck] !! Final card instance:', card);
        this.drawPile.push(card); 
      }
    }
    this.rng.shuffle(this.drawPile);
    debugBossLog('[BossDeck] !! Final deck created. First 3 cards:', this.drawPile.slice(0, 3));
  }
  ensureDrawable(){
    if (this.drawPile.length === 0){
      this.drawPile = this.rng.shuffle(this.discardPile.splice(0));
    }
  }
  draw(){
    this.ensureDrawable();
    const card = this.drawPile.shift();
    if (card) this.discardPile.push(card);
    return card ?? null;
  }
  peekCounts(){
    const total = this.drawPile.length;
    const byId = {};
    for(const c of this.drawPile){
      if(!byId[c.id]) byId[c.id] = { name: c.name, count: 0 };
      byId[c.id].count++;
    }
    const items = Object.entries(byId).map(([id,v])=>({ id, name:v.name, count:v.count, pct: total>0 ? (v.count/total*100) : 0 }));
    items.sort((a,b)=> a.name.localeCompare(b.name));
    return { total, items, discardCount: this.discardPile.length };
  }
}
