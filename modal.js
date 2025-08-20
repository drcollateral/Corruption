// /modal.js
// No logic change except expose a helper if needed later.
import { state } from "./state.js";

const modal = document.getElementById("boss-deck-modal");
const btnOpen = document.getElementById("btn-boss-deck");
const btnClose = document.getElementById("boss-deck-close");
const deckStats = document.getElementById("boss-deck-stats");
const deckList = document.getElementById("boss-deck-list");
const discardList = document.getElementById("boss-discard-list");

export function renderDeckModal(){
  const deck = state.bossDeck;
  if (!deck){
    deckStats.innerHTML = `<div>Draw: 0</div><div>Discard: 0</div><div>Unique: 0</div>`;
    deckList.innerHTML = ""; discardList.innerHTML = "";
    return;
  }
  const counts = deck.peekCounts();
  deckStats.innerHTML = `
    <div><strong>Draw Pile</strong><br/>${counts.total}</div>
    <div><strong>Discard</strong><br/>${counts.discardCount}</div>
    <div><strong>Unique Cards</strong><br/>${counts.items.length}</div>
  `;
  deckList.innerHTML = "";
  counts.items.forEach(it=>{
    const li = document.createElement("li");
    li.className = "deck-item";
    li.innerHTML = `<div>${it.name}</div><small>${it.count} • ${it.pct.toFixed(1)}%</small>`;
    deckList.appendChild(li);
  });
  const disc = {};
  for (const c of deck.discardPile){ disc[c.name] = (disc[c.name] ?? 0) + 1; }
  discardList.innerHTML = "";
  Object.entries(disc).forEach(([name,count])=>{
    const li = document.createElement("li");
    li.className = "deck-item";
    li.innerHTML = `<div>${name}</div><small>${count}</small>`;
    discardList.appendChild(li);
  });
}

export function wireBossDeckModal(){
  btnOpen?.addEventListener("click", ()=>{ renderDeckModal(); modal.hidden = false; });
  btnClose?.addEventListener("click", ()=> modal.hidden = true);
  modal?.addEventListener("click", (e)=>{ if(e.target === modal) modal.hidden = true; });
}

