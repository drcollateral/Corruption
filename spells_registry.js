// /spells_registry.js
// Attribute/affinity-based registry only (no starter POW track).
// Public API:
//   - spellsFor(classId, affinity, attrs)
//   - spellsWithMeta(classId, affinity, attrs)
//   - passivesFor(classId, affinity, attrs)
export const BREAKPOINTS = Object.freeze([8, 10, 12, 14, 16]);

/** Base (always) affinity passive per class. */
export const BASE_PASSIVES = Object.freeze({
  ELEMENTALIST: Object.freeze({
    Flame: { id: "inferno", name: "Inferno", desc: `Special Passive Ability: "Inferno" — You may boost your next fire spell; doing so radiates fire damage around yourself, harming enemies and allies.` },
    Terra: { id: "stoneheart", name: "Stoneheart", desc: "(placeholder) Brief damage resistance on Terra cast." },
    Tide:  { id: "undertow",  name: "Undertow",  desc: "(placeholder) Casting Tide adjusts positions (flavor stub)." },
  }),
  WARRIOR: Object.freeze({
    Brutality:    { id: "bloodlust", name: "Bloodlust", desc: "(placeholder) Damage grants momentum." },
    Guardianship: { id: "bulwark",   name: "Bulwark",   desc: "(placeholder) Reduce damage; guard allies." },
    Leadership:   { id: "command",   name: "Command",   desc: "(placeholder) Rally allies for minor buffs." },
  }),
  SURVIVALIST: Object.freeze({
    Lethality:      { id: "mark",   name: "Mark",   desc: "(placeholder) Mark prey to deal extra damage." },
    Primalism:      { id: "frenzy", name: "Frenzy", desc: "(placeholder) Nature surge effect." },
    "Nature's Aid": { id: "mender", name: "Mender", desc: "(placeholder) Healing over time." },
  }),
});

/**
 * Attribute-gated spells by class/affinity, keyed by attribute (POW/DEF/SUP),
 * unlock breakpoints 8/10/12/14/16. Add JSON-only effect descriptors; systems
 * can implement behavior later.
 */
export const ATTRIBUTE_SPELLS = Object.freeze({
  ELEMENTALIST: Object.freeze({
    Flame: Object.freeze({
      // === Support track (healing/utility) ===
      SUP: Object.freeze({
        8:  Object.freeze([]),
        10: Object.freeze([
          {
            id: "cauterize",
            name: "Cauterize",
            desc: "Apply a healing over time (HoT) to an ally; flavored as searing wounds closed.",
            tags: ["hot","ally","support"],
            roll: "SUP",
            effects: [
              /* Apply a HoT to target ally. Placeholder numbers; tune later. */
              { type: "hot", amount: 2, duration: 3, school: "Fire" }
            ],
          },
        ]),
        12: Object.freeze([]),
        // 14: passive (see ATTR_PASSIVES)
        16: Object.freeze([
          {
            id: "phoenix_rise",
            name: "Phoenix Rise",
            desc: "Battle resurrection of a fallen ally (placeholder numbers).",
            tags: ["rez","support"],
            effects: [
              { type: "revive", hp: 3, status: ["burning_wings"] }
            ],
          },
        ]),
      }),

      // === Defense track (protection/mitigation) ===
      DEF: Object.freeze({
        8:  Object.freeze([]),
        10: Object.freeze([
          {
            id: "lava_shield",
            name: "Lava Shield",
            desc: "Conjure a lava shield in your offhand. If you already wield an offhand, the shield's stats merge into it.",
            tags: ["equip","mitigation","lava"],
            effects: [
              /* Equipment intent:
                 - If offhand empty: equip this shield.
                 - If offhand occupied: merge stats into existing offhand for the duration.
                 Runtime system can read 'equipOffhand' to perform that logic.
              */
              {
                type: "equipOffhand",
                item: {
                  id: "item_lava_shield",
                  name: "Lava Shield",
                  slot: "offhand",
                  stats: { armor: 1, fireResist: 1, magmaArmorGainOnCast: 1 },
                },
                mergeIfOccupied: true
              }
            ],
          },
        ]),
        12: Object.freeze([]),
        // 14/16: passives (see ATTR_PASSIVES)
        14: Object.freeze([]),
        16: Object.freeze([]),
      }),

      // === Power track (damage/offense) ===
      POW: Object.freeze({
        8:  Object.freeze([]),
        10: Object.freeze([
          {
            id: "burn_dot",
            name: "Burn",
            desc: "Ignite an enemy with a simple damage over time (DoT).",
            tags: ["dot","enemy","fire"],
            roll: "POW",
            effects: [
              /* Apply a DoT to target enemy. Placeholder numbers. */
              { type: "dot", amount: 2, duration: 3, school: "Fire" }
            ],
          },
        ]),
        12: Object.freeze([]),
        14: Object.freeze([]),
        // 16: passive (see ATTR_PASSIVES)
        16: Object.freeze([]),
      }),
    }),

    // Placeholders for other affinities (to be filled later)
    Terra: Object.freeze({ SUP:bp(), DEF:bp(), POW:bp() }),
    Tide:  Object.freeze({ SUP:bp(), DEF:bp(), POW:bp() }),
  }),

  // Placeholders for other classes (to be filled later)
  WARRIOR: Object.freeze({
    Brutality:    Object.freeze({ SUP:bp(), DEF:bp(), POW:bp() }),
    Guardianship: Object.freeze({ SUP:bp(), DEF:bp(), POW:bp() }),
    Leadership:   Object.freeze({ SUP:bp(), DEF:bp(), POW:bp() }),
  }),
  SURVIVALIST: Object.freeze({
    Lethality:     Object.freeze({ SUP:bp(), DEF:bp(), POW:bp() }),
    Primalism:     Object.freeze({ SUP:bp(), DEF:bp(), POW:bp() }),
    "Nature's Aid":Object.freeze({ SUP:bp(), DEF:bp(), POW:bp() }),
  }),
});
function bp(){ return Object.freeze({8:[],10:[],12:[],14:[],16:[]}); }

/** Attribute-gated passives (auto-granted). */
export const ATTR_PASSIVES = Object.freeze({
  ELEMENTALIST: Object.freeze({
    Flame: Object.freeze({
      SUP: Object.freeze({
        14: Object.freeze([
          { id: "inferno_embercare", name: "Inferno — Embercare", desc: "Inferno gains a Support roll; results > 0 cauterize allies (heal) on each pulse." }
        ]),
      }),
      POW: Object.freeze({
        16: Object.freeze([
          { id: "conflagrate", name: "Conflagrate", desc: "Inferno pulses twice whenever it would pulse." }
        ]),
      }),
      DEF: Object.freeze({
        14: Object.freeze([
          { id: "magma_temper", name: "Magma Temper", desc: "Convert all fire spells into lava. Lava casts build Magma Armor stacks (mitigation & enemy debuff placeholder)." }
        ]),
        16: Object.freeze([
          { id: "magma_form",   name: "Magma Form",   desc: "(placeholder) Transform into magma aspect (mitigation TBD)." }
        ]),
      }),
    }),
    Terra: Object.freeze({ SUP:bp(), POW:bp(), DEF:bp() }),
    Tide:  Object.freeze({ SUP:bp(), POW:bp(), DEF:bp() }),
  }),
  WARRIOR: Object.freeze({
    Brutality:    Object.freeze({ SUP:bp(), POW:bp(), DEF:bp() }),
    Guardianship: Object.freeze({ SUP:bp(), POW:bp(), DEF:bp() }),
    Leadership:   Object.freeze({ SUP:bp(), POW:bp(), DEF:bp() }),
  }),
  SURVIVALIST: Object.freeze({
    Lethality:     Object.freeze({ SUP:bp(), POW:bp(), DEF:bp() }),
    Primalism:     Object.freeze({ SUP:bp(), POW:bp(), DEF:bp() }),
    "Nature's Aid":Object.freeze({ SUP:bp(), POW:bp(), DEF:bp() }),
  }),
});

/** Return all spells unlocked by current attributes (no manual selection). */
export function spellsFor(classId, affinity, attrs){
  const { POW=8, DEF=8, SUP=8 } = attrs || {};
  const table = ATTRIBUTE_SPELLS[classId]?.[affinity];
  if (!table) return [];
  const out = [];
  const collect = (attrKey, val) => {
    const t = table[attrKey];
    if (!t) return;
    for (const bp of BREAKPOINTS) if (val >= bp) out.push(...(t[bp] || []));
  };
  collect("POW", POW); collect("DEF", DEF); collect("SUP", SUP);
  // de-dup by id
  const seen = new Set(); const dedup = [];
  for (const s of out){ if (!seen.has(s.id)){ seen.add(s.id); dedup.push(s); } }
  return dedup;
}

/** Same as spellsFor but adds unlock metadata: {unlockAttr, unlockAt}. */
export function spellsWithMeta(classId, affinity, attrs){
  const { POW=8, DEF=8, SUP=8 } = attrs || {};
  const table = ATTRIBUTE_SPELLS[classId]?.[affinity];
  if (!table) return [];
  const out = new Map();
  const record = (spell, key, at) => { if (!out.has(spell.id)) out.set(spell.id, { ...spell, unlockAttr:key, unlockAt:at }); };
  const collect = (attrKey, val) => {
    const t = table[attrKey];
    if (!t) return;
    for (const bp of BREAKPOINTS) if (val >= bp) (t[bp]||[]).forEach(sp=>record(sp, attrKey, bp));
  };
  collect("POW", POW); collect("DEF", DEF); collect("SUP", SUP);
  return Array.from(out.values()).sort((a,b)=> (a.unlockAt-b.unlockAt) || a.unlockAttr.localeCompare(b.unlockAttr) || a.name.localeCompare(b.name));
}

/** Base + attribute passives unlocked by thresholds. */
export function passivesFor(classId, affinity, attrs){
  const base = BASE_PASSIVES[classId]?.[affinity] ? [BASE_PASSIVES[classId][affinity]] : [];
  const { POW=8, DEF=8, SUP=8 } = attrs || {};
  const t = ATTR_PASSIVES[classId]?.[affinity];
  const add = [];
  const collect = (tab,val)=>{ if (!tab) return; for (const bp of BREAKPOINTS) if (val>=bp) add.push(...(tab[bp]||[])); };
  if (t){ collect(t.POW,POW); collect(t.DEF,DEF); collect(t.SUP,SUP); }
  // de-dup
  const seen = new Set(); const out = [];
  for (const p of [...base, ...add]){ if (!seen.has(p.id)){ seen.add(p.id); out.push(p); } }
  return out;
}




