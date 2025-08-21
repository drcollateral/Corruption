// /src/systems/boss_deck.js
// Deck with draw/discard piles + reshuffle + probability peek.
export class BossDeck {
  constructor(rng, cards){
    this.rng = rng;
    this.drawPile = [];
    this.discardPile = [];
    for (const c of cards){ for(let i=0;i<c.count;i++) this.drawPile.push({ id:c.id, name:c.name, desc:c.desc }); }
    this.rng.shuffle(this.drawPile);
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
