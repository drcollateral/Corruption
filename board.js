// /src/systems/board.js
// Board draws nothing itself; it manages token DOM and positions relative to grid.
export class Board {
  constructor(root, size){
    this.root = root;
    this.size = size;
    this.tokens = new Map(); // id -> HTMLElement
  }
  within(col,row){ return col>=1 && col<=this.size && row>=1 && row<=this.size; }
  placeToken(id, { col,row,w=1,h=1,cls="",label="" }){
    const el = document.createElement("div");
    const sizeCls = (w===1 && h===2) ? "size-1x2" : "size-1x1";
    el.className = `token ${cls} ${sizeCls}`.trim();
    el.style.setProperty("--col", String(col));
    el.style.setProperty("--row", String(row));
    el.dataset.col = String(col);
    el.dataset.row = String(row);
    if (label){ el.classList.add("label"); el.dataset.name = label; }
    this.root.appendChild(el);
    this.tokens.set(id, el);
    return el;
  }
  moveToken(id, col, row){
    const el = this.tokens.get(id); if(!el) return;
    if(!this.within(col,row)) return;
    el.style.setProperty("--col", String(col));
    el.style.setProperty("--row", String(row));
    el.dataset.col = String(col);
    el.dataset.row = String(row);
  }
  removeToken(id){ const el = this.tokens.get(id); if(el) el.remove(); this.tokens.delete(id); }
  getTokenPos(id){
    const el = this.tokens.get(id); if(!el) return null;
    return { col: Number(el.dataset.col), row: Number(el.dataset.row) };
  }
  clear(){ for(const el of this.tokens.values()) el.remove(); this.tokens.clear(); }
}
