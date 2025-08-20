// /boss_cards.js
// Registry: boss decks (expandable).
// Schema: BOSS_DECKS[KEY] = { id, name, cards: [{id,name,desc,count}] }
export const BOSS_DECKS = Object.freeze({
  BEAR: Object.freeze({
    id: "BEAR",
    name: "Bear",
    cards: Object.freeze([
      { id: "advance1", name: "Advance 1", desc: "Move 1 tile toward nearest player", count: 5 },
    ]),
  }),
});
