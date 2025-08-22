// /boss_cards.js
// Registry: boss decks (expandable).
// Schema: BOSS_DECKS[KEY] = { id, name, cards: [{id,name,desc,count}] }
export const BOSS_DECKS = Object.freeze({
  BEAR: Object.freeze({
    id: "BEAR",
    name: "Bear",
    cards: Object.freeze([
      { id: "swipe", name: "Swipe", desc: "Swipe attack with advance", count: 5 },
      { id: "charge", name: "Charge", desc: "Charging attack with advance", count: 2 },
      { id: "enrage", name: "Enrage", desc: "Becomes enraged", count: 1 },
      { id: "roar", name: "Roar", desc: "Terrifying roar with cycle", count: 1 },
    ]),
  }),
});
