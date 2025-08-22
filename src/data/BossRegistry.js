// /src/data/BossRegistry.js
// Robust boss registry system with built-in validation

/**
 * Boss deck definitions
 * Schema: { id, name, desc, count, keywords? }[]
 */
const BOSS_DECK_DEFINITIONS = {
  BEAR: [
    { id: "swipe", name: "Swipe", desc: "Swipe attack with advance", count: 5, keywords: ["advance"] },
    { id: "charge", name: "Charge", desc: "Charging attack with advance", count: 2, keywords: ["advance"] },
    { id: "enrage", name: "Enrage", desc: "Becomes enraged", count: 1 },
    { id: "roar", name: "Roar", desc: "Terrifying roar with cycle", count: 1, keywords: ["cycle"] },
  ],
  
  // Future bosses can be added here
  DRAGON: [
    { id: "flame_breath", name: "Flame Breath", desc: "Devastating fire attack", count: 3 },
    { id: "wing_buffet", name: "Wing Buffet", desc: "Knockback attack", count: 2 },
    { id: "treasure_guard", name: "Treasure Guard", desc: "Defensive stance", count: 2 },
  ],
};

/**
 * Boss metadata definitions
 */
const BOSS_METADATA = {
  BEAR: {
    id: "BEAR",
    name: "Bear",
    type: "beast",
    hp: 150,
    movementDie: "d3",
    size: { w: 1, h: 2 }
  },
  
  DRAGON: {
    id: "DRAGON", 
    name: "Ancient Dragon",
    type: "dragon",
    hp: 50,
    movementDie: "d4",
    size: { w: 2, h: 2 }
  }
};

/**
 * Get boss deck cards with validation
 */
export function getBossDeck(bossType) {
  const key = bossType.toUpperCase();
  const deck = BOSS_DECK_DEFINITIONS[key];
  
  if (!deck) {
    console.error(`[BossRegistry] Unknown boss type: ${bossType}. Available: ${Object.keys(BOSS_DECK_DEFINITIONS).join(', ')}`);
    throw new Error(`Unknown boss type: ${bossType}`);
  }
  
  // Validate deck structure
  for (const card of deck) {
    if (!card.id || !card.name || typeof card.count !== 'number') {
      console.error(`[BossRegistry] Invalid card definition in ${bossType} deck:`, card);
      throw new Error(`Invalid card definition in ${bossType} deck`);
    }
  }
  
  console.debug(`[BossRegistry] Loaded ${bossType} deck:`, deck.map(c => `${c.name}×${c.count}`).join(', '));
  return [...deck]; // Return copy to prevent mutation
}

/**
 * Get boss metadata with validation
 */
export function getBossMetadata(bossType) {
  const key = bossType.toUpperCase();
  const metadata = BOSS_METADATA[key];
  
  if (!metadata) {
    console.error(`[BossRegistry] Unknown boss type: ${bossType}`);
    throw new Error(`Unknown boss type: ${bossType}`);
  }
  
  return { ...metadata }; // Return copy to prevent mutation
}

/**
 * Get all available boss types
 */
export function getAvailableBossTypes() {
  return Object.keys(BOSS_DECK_DEFINITIONS);
}

/**
 * Validate a boss type exists
 */
export function isValidBossType(bossType) {
  return BOSS_DECK_DEFINITIONS.hasOwnProperty(bossType.toUpperCase());
}
