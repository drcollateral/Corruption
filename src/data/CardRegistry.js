// Universal Card Registry
// All cards in the game - both player spells and boss actions
// Cards can be used by any entity that references them

export const CARD_REGISTRY = {
  // === BOSS CARDS ===
  swipe: {
    id: "swipe",
    name: "Swipe",
    type: "boss_action",
    description: "Melee attack against adjacent targets",
    keywords: ["advance"],
    damage: { base: 4, type: "physical" },
    range: "adjacent",
    targeting: "auto_nearest",
    effects: []
  },

  charge: {
    id: "charge",
    name: "Charge",
    type: "boss_action", 
    description: "Rush forward and attack",
    keywords: ["advance"],
    damage: { base: 2, type: "physical" },
    range: 4,
    targeting: "charge_line",
    effects: []
  },

  enrage: {
    id: "enrage",
    name: "Enrage",
    type: "boss_action",
    description: "Become enraged, increasing damage",
    keywords: [],
    damage: null,
    range: "self",
    targeting: "self",
    effects: [
      {
        type: "buff",
        name: "enraged",
        duration: -1, // permanent
        modifiers: { damage: 2 }
      }
    ]
  },

  roar: {
    id: "roar",
    name: "Terrifying Roar",
    type: "boss_action",
    description: "Intimidating roar that hampers movement",
    keywords: ["cycle"],
    damage: null,
    range: 20,
    targeting: "area_all_players",
    effects: [
      {
        type: "debuff",
        name: "movement_penalty",
        duration: 1,
        modifiers: { movement: -2 }
      }
    ]
  },

  maul: {
    id: "maul",
    name: "Maul",
    type: "boss_action",
    description: "Devastating crushing attack",
    keywords: ["advance"],
    damage: { base: 6, type: "physical" },
    range: "adjacent",
    targeting: "auto_nearest",
    effects: [
      {
        type: "condition",
        name: "stunned",
        duration: 1
      }
    ]
  },

  hibernate: {
    id: "hibernate",
    name: "Hibernate",
    type: "boss_action",
    description: "Rest and recover health",
    keywords: [],
    damage: null,
    range: "self",
    targeting: "self",
    effects: [
      {
        type: "heal",
        amount: { base: 8 }
      }
    ]
  },

  // === PLAYER SPELLS ===
  burn: {
    id: "burn",
    name: "Burn",
    type: "player_spell",
    description: "Inflict burning damage over time",
    school: "fire",
    level: 1,
    cost: { action: 1 },
    damage: { base: 2, type: "fire", dot: true },
    range: 8,
    targeting: "single_enemy",
    effects: [
      {
        type: "dot",
        name: "burning",
        duration: 3,
        damage: { base: 2, type: "fire" }
      }
    ]
  },

  inferno: {
    id: "inferno",
    name: "Inferno",
    type: "player_spell",
    description: "Prime burn effects to explode",
    school: "fire",
    level: 2,
    cost: { bonus: 1 },
    damage: null,
    range: "self",
    targeting: "self",
    effects: [
      {
        type: "buff",
        name: "inferno_primed",
        duration: 1,
        description: "Next burn will detonate and pulse"
      }
    ]
  },

  heal: {
    id: "heal",
    name: "Heal",
    type: "player_spell",
    description: "Restore health to target",
    school: "holy",
    level: 1,
    cost: { action: 1 },
    damage: null,
    range: 6,
    targeting: "single_ally",
    effects: [
      {
        type: "heal",
        amount: { base: 4, scaling: "wisdom" }
      }
    ]
  },

  shield: {
    id: "shield",
    name: "Shield",
    type: "player_spell", 
    description: "Grant damage resistance",
    school: "protection",
    level: 1,
    cost: { action: 1 },
    damage: null,
    range: 6,
    targeting: "single_ally",
    effects: [
      {
        type: "buff",
        name: "shielded",
        duration: 5,
        modifiers: { damage_resistance: 2 }
      }
    ]
  },

  // === GENERIC ACTIONS ===
  advance: {
    id: "advance",
    name: "Advance",
    type: "generic_action",
    description: "Move toward nearest enemy",
    keywords: [],
    damage: null,
    range: "movement",
    targeting: "self",
    effects: []
  },

  // === CONSUMABLE ITEMS ===
  healing_potion: {
    id: "healing_potion",
    name: "Healing Potion",
    type: "consumable",
    description: "Restore health immediately",
    cost: { action: 1 },
    damage: null,
    range: "self",
    targeting: "self",
    effects: [
      {
        type: "heal",
        amount: { base: 6 }
      }
    ]
  }
};

// Helper functions to filter cards by type
export function getBossCards() {
  return Object.values(CARD_REGISTRY).filter(card => card.type === 'boss_action');
}

export function getPlayerSpells(school = null, level = null) {
  let spells = Object.values(CARD_REGISTRY).filter(card => card.type === 'player_spell');
  
  if (school) {
    spells = spells.filter(spell => spell.school === school);
  }
  
  if (level !== null) {
    spells = spells.filter(spell => spell.level === level);
  }
  
  return spells;
}

export function getCard(id) {
  return CARD_REGISTRY[id] || null;
}

export function getCardsWithKeyword(keyword) {
  return Object.values(CARD_REGISTRY).filter(card => 
    card.keywords && card.keywords.includes(keyword)
  );
}

// Validate card exists and has required properties
export function validateCard(cardId) {
  const card = getCard(cardId);
  if (!card) {
    throw new Error(`Card '${cardId}' not found in registry`);
  }
  
  // Basic validation
  if (!card.name || !card.type || !card.description) {
    throw new Error(`Card '${cardId}' is missing required properties`);
  }
  
  return card;
}
