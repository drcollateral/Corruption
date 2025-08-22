/**
 * Cue Configuration - Centralized settings for all game cues
 * 
 * Each cue type defines:
 * - message: The text to display (can use {placeholders})
 * - duration: Auto-dismiss after X milliseconds (0 = manual dismiss only)
 * - sticky: true = requires click to dismiss, false = auto-advance
 * - className: CSS styling class
 * - priority: Higher numbers show above lower numbers
 * - category: Grouping for bulk operations
 */

export const CUE_CONFIG = {
  // === ERROR & BLOCKING MESSAGES ===
  "not-your-turn": {
    message: "Not your turn.",
    duration: 2000,        // Auto-dismiss after 2 seconds
    sticky: false,         // Don't require click
    className: "error-cue",
    priority: 100,
    category: "error",
    description: "When player tries to act outside their turn",
    enabled: true
  },

  "no-actions-left": {
    message: "{playerName} has no actions left.",
    duration: 2000,
    sticky: false,
    className: "error-cue", 
    priority: 100,
    category: "error",
    description: "When player has no action points remaining",
    enabled: true
  },

  "no-bonus-actions-left": {
    message: "{playerName} has no bonus actions left.",
    duration: 2000,
    sticky: false,
    className: "error-cue",
    priority: 100,
    category: "error", 
    description: "When player has no bonus action points remaining",
    enabled: true
  },

  "no-spell-available": {
    message: "{playerName} has no attack spells available.",
    duration: 2500,
    sticky: false,
    className: "error-cue",
    priority: 100, 
    category: "error",
    description: "When player lacks required spells",
    enabled: true
  },

  "cannot-use-spell": {
    message: "{playerName} cannot use {spellName}.",
    duration: 2500,
    sticky: false,
    className: "error-cue",
    priority: 100,
    category: "error",
    description: "When player tries to use unavailable spell",
    enabled: true
  },

  "already-moved": {
    message: "Already moved this turn.",
    duration: 2000,
    sticky: false,
    className: "error-cue",
    priority: 100,
    category: "error", 
    description: "When player tries to move twice in one turn",
    enabled: true
  },

  "spell-already-primed": {
    message: "Inferno already primed.",
    duration: 2500,
    sticky: false,
    className: "error-cue",
    priority: 100,
    category: "error",
    description: "When trying to prime Inferno when already primed",
    enabled: true
  },

  // === QUICK FEEDBACK ===
  "targeting-cancelled": {
    message: "Targeting cancelled.",
    duration: 800,
    sticky: false,
    className: "feedback-cue",
    priority: 50,
    category: "feedback",
    description: "When player cancels targeting mode",
    enabled: true
  },

  "movement-cancelled": {
    message: "Movement cancelled.",
    duration: 800,
    sticky: false,
    className: "feedback-cue", 
    priority: 50,
    category: "feedback",
    description: "When player cancels movement selection",
    enabled: true
  },

  // === SPELL CASTING ===
  "spell-cast": {
    message: "{playerName} casts {spellName} on {targetName}.",
    duration: 1500,
    sticky: false,
    className: "spell-cue",
    priority: 75,
    category: "combat",
    description: "When player successfully casts a spell",
    enabled: true
  },

  "inferno-primed": {
    message: "{playerName} primes Inferno: Burn will detonate immediately and pulse for 2.",
    duration: 2000,
    sticky: false, 
    className: "buff-cue enhanced",
    priority: 75,
    category: "combat",
    description: "When Inferno is successfully primed",
    enabled: true
  },

  // === MOVEMENT ===
  "movement-roll": {
    message: "Movement rolled: d{sides} = {result}.",
    duration: 1200,
    sticky: false,
    className: "movement-roll-cue",
    priority: 60,
    category: "movement",
    description: "Movement die roll results",
    enabled: true  // Disabled as "overkill" noise
  },

  "movement-prompt": {
    message: "Movement: rolled d{dieSize} = {steps}. Click a highlighted tile to move.",
    duration: 0,          // Persistent until movement completes
    sticky: true,
    className: "movement-prompt",
    priority: 60,
    category: "movement", 
    description: "Shows available movement and prompts for selection",
    enabled: true
  },

  "movement-complete": {
    message: "Movement finished ({steps} step{plural}).",
    duration: 1200,
    sticky: false,
    className: "movement-cue",
    priority: 60,
    category: "movement",
    description: "Confirms movement completion",
    enabled: true
  },

  "movement-penalty": {
    message: "Movement penalty applied: {before} → {after}.",
    duration: 2000,
    sticky: false,
    className: "warning-cue",
    priority: 70,
    category: "movement", 
    description: "When movement is reduced by penalties",
    enabled: true
  },

  // === BOSS ACTIONS ===
  "boss-turn-start": {
    message: "Boss turn start",
    duration: 0,
    sticky: true,
    className: "boss-turn-cue",
    priority: 90,
    category: "boss",
    description: "When boss turn begins",
    enabled: true
  },

  "boss-dot-damage": {
    message: "{bossName} takes {amount} {sourceType} damage.",
    behavior: "click-to-continue",
    className: "combat-cue dot-damage",
    enabled: true,
    category: "combat",
    description: "Boss damage-over-time tick notification"
  },

  "boss-burn-damage": {
    message: "Process burn damage",
    duration: 0,
    sticky: true,
    className: "boss-burn-cue",
    priority: 85,
    category: "boss",
    description: "Processing boss burn damage",
    enabled: true
  },

  "boss-draw-resolve": {
    message: "Draw and resolve boss cards",
    duration: 0,
    sticky: true,
    className: "boss-draw-resolve-cue",
    priority: 90,
    category: "boss",
    description: "Boss card draw and resolution phase",
    enabled: true
  },

  "boss-draw": {
    message: "Boss draws: {cardName}",
    duration: 0,
    sticky: true,         // Requires click to advance
    className: "boss-card-cue",
    priority: 90,
    category: "boss",
    description: "When boss draws cards",
    enabled: true
  },

  "boss-action-display": {
    message: "Boss uses: {actionName}",
    behavior: "boss-draw",
    className: "boss-action-cue",
    enabled: true,
    category: "boss",
    description: "Display boss action selection"
  },

  "boss-attack": {
    message: "{attackName} attack!",
    duration: 0,
    sticky: true,
    className: "boss-attack-cue", 
    priority: 85,
    category: "boss",
    description: "Boss attack announcements",
    enabled: true
  },

  "boss-miss": {
    message: "{attackName} misses!",
    duration: 1500,
    sticky: false,
    className: "boss-miss-cue",
    priority: 80,
    category: "boss", 
    description: "When boss attacks miss",
    enabled: true
  },

  "boss-roar": {
    message: "Terrifying Roar!",
    duration: 0,
    sticky: true,
    className: "boss-roar-cue",
    priority: 85,
    category: "boss",
    description: "Boss roar attack",
    enabled: true
  },

  "boss-enraged": {
    message: "Boss becomes Enraged!",
    duration: 0,
    sticky: true,
    className: "boss-enrage-cue",
    priority: 85,
    category: "boss",
    description: "Boss enrage state activation",
    enabled: true
  },

  "boss-enrage-fizzle": {
    message: "Enrage fizzles!",
    duration: 1500,
    sticky: false,
    className: "boss-fizzle-cue",
    priority: 80,
    category: "boss",
    description: "When enrage fails due to movement",
    enabled: true
  },

  "boss-charge-connect": {
    message: "Charge connects!",
    duration: 0,
    sticky: true,
    className: "boss-charge-cue",
    priority: 85,
    category: "boss",
    description: "Successful charge attack",
    enabled: true
  },

  "boss-charge-fail": {
    message: "Charge fails!",
    duration: 0,
    sticky: true,
    className: "boss-charge-cue",
    priority: 80,
    category: "boss",
    description: "Failed charge attack",
    enabled: true
  },

  "movement-penalty-applied": {
    message: "Movement penalty applied!",
    duration: 1500,
    sticky: false,
    className: "movement-penalty-cue",
    priority: 70,
    category: "movement",
    description: "When movement penalties are applied to players",
    enabled: true
  },

  "movement-cancelled": {
    message: "Movement cancelled (roll preserved).",
    duration: 0,
    sticky: true,
    className: "movement-cancel-cue",
    priority: 60,
    category: "movement",
    description: "When player cancels movement",
    enabled: true
  },

  "unknown-boss-action": {
    message: "Unknown boss action: {actionId}",
    duration: 0,
    sticky: true,
    className: "error-cue",
    priority: 100,
    category: "error",
    description: "When boss draws unrecognized action",
    enabled: true
  },

  "boss-roar": {
    message: "Terrifying Roar!",
    duration: 0,
    sticky: true,
    className: "boss-card-cue",
    priority: 90,
    category: "boss",
    description: "Boss Roar ability activation",
    enabled: true
  },

  "boss-enrage": {
    message: "Boss becomes Enraged!",
    duration: 0,
    sticky: true,
    className: "boss-card-cue",
    priority: 90,
    category: "boss",
    description: "Boss Enrage ability activation",
    enabled: true
  },

  "boss-enrage-fizzle": {
    message: "Enrage fizzles!",
    duration: 0,
    sticky: true,
    className: "boss-card-cue",
    priority: 90,
    category: "boss",
    description: "Boss Enrage fails due to movement",
    enabled: true
  },

  "movement-penalty-applied": {
    message: "Movement penalty applied!",
    duration: 0,
    sticky: true,
    className: "boss-card-cue",
    priority: 85,
    category: "boss",
    description: "Roar movement penalty confirmation",
    enabled: true
  },

  "boss-charge-attack": {
    message: "Charge attack!",
    duration: 0,
    sticky: true,
    className: "boss-card-cue",
    priority: 90,
    category: "boss",
    description: "Boss Charge attack initiation",
    enabled: true
  },

  "boss-charge-connects": {
    message: "Charge connects!",
    duration: 0,
    sticky: true,
    className: "boss-card-cue",
    priority: 90,
    category: "boss",
    description: "Boss Charge attack hits target",
    enabled: true
  },

  "boss-charge-fails": {
    message: "Charge fails!",
    duration: 0,
    sticky: true,
    className: "boss-card-cue",
    priority: 90,
    category: "boss",
    description: "Boss Charge attack misses",
    enabled: true
  },

  // === TURN MANAGEMENT ===
  "initiative-header": {
    message: "Initiative",
    duration: 0,
    sticky: true,
    className: "initiative-header-cue",
    priority: 95,
    category: "initiative",
    description: "Initiative phase header",
    enabled: true
  },

  "initiative-roll": {
    message: "Rolling for initiative…",
    duration: 1500,
    sticky: false,
    className: "initiative-roll-cue",
    priority: 95,
    category: "initiative",
    description: "Initiative roll starting message",
    enabled: true
  },

  "initiative-roll-result": {
    message: "{entityName} rolls d{sides}… {result}!",
    duration: 1500,
    sticky: false,
    className: "initiative-result-cue",
    priority: 95,
    category: "initiative",
    description: "Individual initiative roll results",
    enabled: true
  },

  "initiative-rolling": {
    message: "{entityName} rolling",
    duration: 0,
    sticky: true,
    className: "initiative-rolling-cue",
    priority: 95,
    category: "initiative", 
    description: "When entity is rolling initiative",
    enabled: true
  },

  "initiative-result": {
    message: "{entityName} result",
    duration: 0,
    sticky: true,
    className: "initiative-result-cue",
    priority: 95,
    category: "initiative",
    description: "Initiative roll result announcement",
    enabled: true
  },

  "turn-order-resolve": {
    message: "Resolve turn order",
    duration: 0,
    sticky: true,
    className: "turn-order-cue",
    priority: 95,
    category: "initiative",
    description: "Turn order determination",
    enabled: true
  },

  "turn-order-display": {
    message: "Turn order: {orderText}",
    duration: 0,
    sticky: true,
    className: "turn-order-display-cue",
    priority: 95,
    category: "initiative",
    description: "Display final turn order",
    enabled: true
  },

  "turn-start": {
    message: "{entityName}'s turn begins.",
    duration: 0,
    sticky: true,
    className: "turn-cue",
    priority: 95,
    category: "turns",
    description: "Turn beginning announcements",
    enabled: true
  },

  "turn-end": {
    message: "{entityName}'s turn ends.",
    duration: 1000,
    sticky: false,
    className: "turn-end-cue",
    priority: 80,
    category: "turns",
    description: "Turn ending announcements",
    enabled: true
  },

  "automatic-turn-end": {
    message: "{entityName} has no valid actions. Turn ends.",
    duration: 1200,
    sticky: false,
    className: "auto-end-cue",
    priority: 75,
    category: "turns",
    description: "When entity runs out of actions",
    enabled: true
  },

  "auto-end-turn-ignored": {
    message: "(ignored auto end-turn)",
    duration: 800,
    sticky: false,
    className: "debug-cue",
    priority: 20,
    category: "debug",
    description: "Debug message for ignored auto end-turn",
    enabled: true
  },

  // === BOSS CARDS & ACTIONS ===
  "boss-cards-draw": {
    message: "Draw and resolve Boss cards.",
    duration: 0,
    sticky: true,
    className: "boss-cards-cue",
    priority: 85,
    category: "boss",
    description: "Boss card draw phase",
    enabled: true
  },

  "boss-cards-resolved": {
    message: "Boss cards resolved.",
    duration: 1000,
    sticky: false,
    className: "boss-cards-done-cue",
    priority: 80,
    category: "boss",
    description: "Boss card resolution complete",
    enabled: true
  },

  "boss-card-played": {
    message: "Boss plays: {cardName}",
    duration: 2000,
    sticky: false,
    className: "boss-card-cue",
    priority: 85,
    category: "boss",
    description: "Individual boss card played",
    enabled: true
  },

  "boss-buff-applied": {
    message: "Boss gains {buffName}.",
    duration: 1500,
    sticky: false,
    className: "boss-buff-cue",
    priority: 75,
    category: "boss",
    description: "Boss receives buff effect",
    enabled: true
  },

  // === PROCESS EFFECTS ===
  "process-burn-damage": {
    message: "Process burn damage.",
    duration: 0,
    sticky: true,
    className: "process-burn-cue",
    priority: 75,
    category: "effects",
    description: "Burn damage processing phase",
    enabled: true
  },

  "process-dots": {
    message: "Processing damage-over-time effects...",
    duration: 1200,
    sticky: false,
    className: "process-dots-cue",
    priority: 75,
    category: "effects",
    description: "DOT effects processing",
    enabled: true
  },

  // === DEVELOPMENT MESSAGES ===
  "action-not-implemented": {
    message: "Action '{actionId}' is not yet implemented.",
    duration: 2000,
    sticky: false,
    className: "dev-warning-cue",
    priority: 60,
    category: "development",
    description: "When action functionality is missing",
    enabled: true
  },

  "bonus-not-implemented": {
    message: "Bonus '{bonusId}' is not yet implemented.",
    duration: 2000,
    sticky: false,
    className: "dev-warning-cue",
    priority: 60,
    category: "development",
    description: "When bonus functionality is missing",
    enabled: true
  },

  "feature-placeholder": {
    message: "This feature is under development.",
    duration: 2000,
    sticky: false,
    className: "dev-placeholder-cue",
    priority: 50,
    category: "development",
    description: "Generic development placeholder",
    enabled: true
  },

  // === COMBAT FLOW ===
  "combat-complete": {
    message: "Combat resolved. Victory!",
    duration: 0,
    sticky: true,
    className: "combat-victory-cue",
    priority: 100,
    category: "combat",
    description: "Combat completion message",
    enabled: true
  },

  "round-transition": {
    message: "Prepare for Round {roundNumber}",
    duration: 0,
    sticky: true,
    className: "round-transition-cue",
    priority: 90,
    category: "rounds",
    description: "Between round transition",
    enabled: true
  },

  "game-over": {
    message: "Game Over. Party defeated.",
    duration: 0,
    sticky: true,
    className: "game-over-cue",
    priority: 100,
    category: "combat",
    description: "Defeat message",
    enabled: true
  },

  "turn-end": {
    message: "{entityName}'s turn ends.",
    duration: 0, 
    sticky: true,
    className: "turn-cue",
    priority: 95,
    category: "turns",
    description: "Turn ending announcements",
    enabled: true
  },

  "combat-start": {
    message: "Combat started. Round 1.",
    duration: 0,
    sticky: true,
    className: "combat-start-cue",
    priority: 100,
    category: "combat",
    description: "Combat initialization messages",
    enabled: true
  },

  "cycle": {
    message: "Cycle!",
    duration: 0,
    sticky: true,
    className: "cycle-cue",
    priority: 95,
    category: "turns",
    description: "End of turn cycle",
    enabled: true
  },

  "advance": {
    message: "Advance!",
    duration: 0,
    sticky: true,
    className: "advance-cue", 
    priority: 95,
    category: "turns",
    description: "Boss deck advancement",
    enabled: true
  },

  // === DAMAGE & EFFECTS ===
  "inferno-pulse": {
    message: "Inferno pulse hits {targets} for {damage}.",
    duration: 1500,
    sticky: false,
    className: "inferno-pulse-cue",
    priority: 80,
    category: "effects",
    description: "When Inferno pulses damage",
    enabled: true
  },

  "inferno-detonate": {
    message: "Inferno detonates Burn for {damage} immediate damage.",
    duration: 1500,
    sticky: false,
    className: "inferno-detonate-cue",
    priority: 80,
    category: "effects",
    description: "When Inferno detonates existing burn",
    enabled: true
  },

  "inferno-detonate-no-burn": {
    message: "Inferno detonates, but there was no pending Burn damage to convert.",
    duration: 2000,
    sticky: false,
    className: "inferno-miss-cue",
    priority: 70,
    category: "effects",
    description: "When Inferno tries to detonate but no burn exists",
    enabled: true
  },

  "boss-burning": {
    message: "Boss is burning! ({duration} turns)",
    duration: 1500,
    sticky: false,
    className: "boss-burn-cue",
    priority: 75,
    category: "effects",
    description: "Boss burning status display",
    enabled: true
  },

  "damage-dealt": {
    message: "{attackerName} hits {targetName} for {damage} damage!",
    duration: 1000,
    sticky: false,
    className: "damage-cue",
    priority: 70,
    category: "damage",
    description: "Damage number displays",
    enabled: true
  },

  "burn-applied": {
    message: "{targetName} is now burning for {duration} turns.",
    duration: 1500,
    sticky: false,
    className: "burn-cue",
    priority: 70, 
    category: "effects",
    description: "When burn effect is applied",
    enabled: true
  },

  "burn-pulse": {
    message: "Burn detonates and pulses for {damage} damage!",
    duration: 1200,
    sticky: false,
    className: "burn-pulse-cue",
    priority: 70,
    category: "effects", 
    description: "When burn effect deals damage",
    enabled: true
  },

  // === ROUND & GAME STATE ===
  "round-begins": {
    message: "Round {roundNumber} begins.",
    duration: 0,
    sticky: true,
    className: "round-cue",
    priority: 95,
    category: "rounds",
    description: "New round announcement",
    enabled: true
  },

  "auto-end-turn-ignored": {
    message: "(ignored auto end-turn)",
    duration: 800,
    sticky: false,
    className: "debug-cue",
    priority: 20,
    category: "debug",
    description: "Debug message for ignored auto end-turn",
    enabled: true
  },

  // === DEVELOPMENT ===
  "action-not-implemented": {
    message: "Action '{actionName}' is not yet implemented.",
    duration: 0,
    sticky: true,          // Dev messages need attention
    className: "dev-cue warning",
    priority: 110,
    category: "dev",
    description: "Action buttons not yet implemented",
    enabled: true
  },

  "bonus-not-implemented": {
    message: "Bonus '{bonusName}' is not yet implemented.",
    duration: 0,
    sticky: true,          // Dev messages need attention  
    className: "dev-cue warning",
    priority: 110,
    category: "dev",
    description: "Bonus buttons not yet implemented",
    enabled: true
  },

  "not-implemented": {
    message: "{feature} is not yet implemented.",
    duration: 0,
    sticky: true,          // Dev messages need attention
    className: "dev-cue warning",
    priority: 110,
    category: "dev",
    description: "Features not yet implemented",
    enabled: true
  },

  // === PARTY & SETUP ===
  "party-size-selected": {
    message: "Party size selected: {count}",
    duration: 1500,
    sticky: false,
    className: "setup-cue",
    priority: 50,
    category: "setup",
    description: "When party size is chosen",
    enabled: true
  },

  "entering-cave": {
    message: "Debug: Entering cave directly",
    duration: 1000,
    sticky: false,
    className: "debug-cue",
    priority: 30,
    category: "debug",
    description: "Debug message for cave entry",
    enabled: true
  },

  // === DEFAULT FALLBACK ===
  "default": {
    message: "{text}",      // Pass through original text
    duration: 1500,
    sticky: false,
    className: "cue-item",
    priority: 40,
    category: "general",
    description: "Generic messages that don't match other categories",
    enabled: true
  }
};

/**
 * Get configuration for a cue type
 * @param {string} cueType - The cue type identifier
 * @returns {object} Configuration object with defaults applied
 */
export function getCueConfig(cueType) {
  const config = CUE_CONFIG[cueType] || CUE_CONFIG.default;
  
  // Apply defaults for any missing properties
  return {
    message: "{text}",
    duration: 1500,
    sticky: false, 
    className: "cue-item",
    priority: 40,
    category: "general",
    description: "No description provided",
    ...config
  };
}

/**
 * Format a cue message with placeholder substitution
 * @param {string} template - Message template with {placeholders}
 * @param {object} data - Data object with values for placeholders
 * @returns {string} Formatted message
 */
export function formatCueMessage(template, data = {}) {
  let message = template;
  
  // Replace placeholders with actual values
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    message = message.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  // Handle special cases
  if (data.steps !== undefined) {
    message = message.replace('{plural}', data.steps === 1 ? '' : 's');
  }
  
  return message;
}

/**
 * Create a properly formatted cue using config templates
 * @param {string} cueType - The cue type from CUE_CONFIG
 * @param {object} data - Data for placeholder substitution
 * @param {string} fallbackText - Text to use if no template matches
 * @returns {object} {message, config} - Ready to use cue data
 */
export function createFormattedCue(cueType, data = {}, fallbackText = '') {
  const config = getCueConfig(cueType);
  
  // Use template message or fallback
  const template = config.message;
  const message = template.includes('{text}') 
    ? formatCueMessage(template, { text: fallbackText, ...data })
    : formatCueMessage(template, data);
    
  return { message, config };
}

/**
 * Get all cues in a specific category
 * @param {string} category - The category to filter by
 * @returns {object} Object with cue types as keys, configs as values
 */
export function getCuesByCategory(category) {
  const result = {};
  for (const [cueType, config] of Object.entries(CUE_CONFIG)) {
    if (config.category === category) {
      result[cueType] = config;
    }
  }
  return result;
}

/**
 * List all available categories
 * @returns {string[]} Array of unique category names
 */
export function getCueCategories() {
  const categories = new Set();
  for (const config of Object.values(CUE_CONFIG)) {
    categories.add(config.category);
  }
  return Array.from(categories).sort();
}


