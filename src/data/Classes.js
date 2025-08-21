// /classes.js
// Registry of classes with uniform attributes and presets scoped by affinity.
// Contract:
// - attrs: always exactly [{key:"POW"},{key:"DEF"},{key:"SUP"}] in this order.
// - budget: points above BASE=8 that must be allocated (sum of (attr-8) = budget).
// - presets: { [affinity]: { [presetName]: {POW, DEF, SUP} } } with absolute values (include base).
//   Each preset should satisfy POW+DEF+SUP = 24 + budget (here 34).
export const CLASSES = Object.freeze({
  WARRIOR: Object.freeze({
    id: "WARRIOR",
    name: "Warrior",
    hitDie: 10,
    moveDie: 4,
    budget: 10,
    attrs: [
      { key: "POW", name: "Power" },
      { key: "DEF", name: "Defense" },
      { key: "SUP", name: "Support" },
    ],
    affinities: ["Brutality", "Guardianship", "Leadership"],
    presets: Object.freeze({
      Brutality: Object.freeze({
        Barbarian: { POW:16, DEF:8, SUP:10 },
        Gladiator:   { POW:10, DEF:16, SUP:8 },
      }),
      Guardianship: Object.freeze({
        Bruiser:{ POW:16, DEF:10, SUP:8 },
        Wall:    { POW:8, DEF:16, SUP:10 },
      }),
      Leadership: Object.freeze({
        Chief:   { POW:16, DEF:8, SUP:10 },
        Marshal:   { POW:8, DEF:16, SUP:10 },
        Medic: { POW:8, DEF:10, SUP:16 },
      }),
    }),
  }),

  SURVIVALIST: Object.freeze({
    id: "SURVIVALIST",
    name: "Survivalist",
    hitDie: 8,
    moveDie: 4,
    budget: 10,
    attrs: [
      { key: "POW", name: "Power" },
      { key: "DEF", name: "Defense" },
      { key: "SUP", name: "Support" },
    ],
    affinities: ["Lethality", "Primalism", "Nature's Aid"],
    presets: Object.freeze({
      Lethality: Object.freeze({
        Predator: { POW:16, DEF:8, SUP:10 },
        Striker:   { POW:14, DEF:12, SUP:8 },
      }),
      Primalism: Object.freeze({
        Cobra:{ POW:16, DEF:8, SUP:10 },
        Grizzly:   { POW:10, DEF:16, SUP:8 },
        Crane:{ POW:8, DEF:10, SUP:16 },
      }),
      "Nature's Aid": Object.freeze({
        Needler:     { POW:16, DEF:8, SUP:10 },
        Toxblade:     { POW:12, DEF:14, SUP:8 },
        Syringe:  { POW:8, DEF:10, SUP:16 },
      }),
    }),
  }),

  ELEMENTALIST: Object.freeze({
    id: "ELEMENTALIST",
    name: "Elementalist",
    hitDie: 6,
    moveDie: 4,
    budget: 10,
    attrs: [
      { key: "POW", name: "Power" },
      { key: "DEF", name: "Defense" },
      { key: "SUP", name: "Support" },
    ],
    affinities: ["Flame", "Terra", "Tide"],
    presets: Object.freeze({
      Flame: Object.freeze({
        Pyromaniac: { POW:16, DEF:8, SUP:10 },
        Cauterist:  { POW:8, DEF:10, SUP:16 },
      }),
      Terra: Object.freeze({
        Lava:  {POW:16, DEF:10, SUP:8 },
        Stone: {POW:8, DEF:16, SUP:10 },
        Mud:   {POW:8, DEF:10, SUP:16 },
      }),
      Tide: Object.freeze({
        Stormbringer:   { POW:16, DEF:10, SUP:8 },
        Aquean:{ POW:8, DEF:16, SUP:10 },
        Restoration:   { POW:8, DEF:10, SUP:16 },
      }),
    }),
  }),
});

export const CLASS_LIST = Object.freeze(Object.values(CLASSES));

export function getClassByName(name) {
  const n = (name || "").toLowerCase();
  return CLASS_LIST.find(c => c.name.toLowerCase() === n) || null;
}

export function getClassById(id) {
  return CLASS_LIST.find(c => c.id === id) || null;
}

