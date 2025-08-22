// CueConfigLoader.js - Loads and applies cue configurations from JSON
import { cueService } from './CueService.js';
import { state } from '../core/GameState.js';
import { CUE_CONFIG } from '../data/CueConfig.js';

let cueConfig = null;
let configLoaded = false;
let loggingEnabled = true; // Enable logging by default
let lastLoggedCue = null; // Track last cue to prevent spam
let lastLogTime = 0;

// Check if cue logging is enabled in debug flags
function isCueLoggingEnabled() {
  if (state?.debug?.logCues !== undefined) {
    return state.debug.logCues;
  }
  return loggingEnabled; // Fallback to default
}

// Check if combat logging is enabled
function isCombatLoggingEnabled() {
  return state?.debug?.logCombat || false;
}

// Check if boss logging is enabled
function isBossLoggingEnabled() {
  return state?.debug?.logBoss || false;
}

// Toggle cue logging
export function toggleCueLogging(enabled) {
  loggingEnabled = enabled;
  console.log(`🎯 Cue logging ${enabled ? 'enabled' : 'disabled'}`);
  return loggingEnabled;
}

// Load the cue configuration from CueConfig.js
export async function loadCueConfig() {
  try {
    cueConfig = CUE_CONFIG;
    configLoaded = true;
    console.log('✅ Cue configuration loaded:', {
      version: "1.0.0",
      description: "Complete catalog of all cue messages in the Corruption game",
      generated: new Date().toISOString().split('T')[0],
      categories: Object.keys(getCueCategories())
    });
    console.log('🎯 Loaded', Object.keys(CUE_CONFIG).length, 'cue definitions');
    return cueConfig;
  } catch (error) {
    console.warn('Error loading cue config:', error);
    return null;
  }
}

// Import getCueCategories from CueConfig.js
import { getCueCategories } from '../data/CueConfig.js';

// Initialize the configuration immediately
loadCueConfig();

// Helper function to check if text matches a template with placeholders
function matchesTemplate(text, template) {
  // Convert template to regex by replacing placeholders with capture groups
  const regexPattern = template
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
    .replace(/\\\{[^}]+\\\}/g, '(.+?)'); // Replace {placeholder} with (.+?)
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(text);
}

// Find a cue configuration by searching text content
function findCueConfig(text) {
  if (!cueConfig) return null;
  
  // FIRST: Try to find exact match in CUE_CONFIG
  for (const [cueKey, cueData] of Object.entries(cueConfig)) {
    if (!cueData || !cueData.message) continue;
    
    // Check exact match first
    if (cueData.message === text) {
      return { ...cueData, key: cueKey };
    }
    
    // Check template match for placeholders
    if (matchesTemplate(text, cueData.message)) {
      return { ...cueData, key: cueKey };
    }
  }
  
  // FALLBACK: Priority patterns for common unconfigured cues
  // These are only used if no CUE_CONFIG match is found
  
  if (text === "Rolling for initiative…") {
    return { 
      message: text, key: "initiative-roll", duration: 2000, sticky: false, 
      className: "initiative-cue", category: "turns", enabled: true
    };
  }
  
  if (text.includes("'s turn begins.")) {
    const entityName = text.replace("'s turn begins.", "");
    const isPlayer = !["Bear", "Dragon", "Orc", "Goblin"].includes(entityName); // Simple heuristic
    return {
      message: text, 
      key: isPlayer ? "player-turn-start" : "boss-turn-start",
      duration: 1500, sticky: false,
      className: "turn-cue", category: "turns", enabled: true
    };
  }
  
  if (text.includes("'s turn ends.")) {
    const entityName = text.replace("'s turn ends.", "");
    const isPlayer = !["Bear", "Dragon", "Orc", "Goblin"].includes(entityName);
    return {
      message: text,
      key: isPlayer ? "player-turn-end" : "boss-turn-end", 
      duration: 1500, sticky: false,
      className: "turn-cue", category: "turns", enabled: true
    };
  }
  
  if (text.startsWith("Boss draws: ")) {
    const cardName = text.slice(12);
    return {
      message: text,
      key: "boss-card-draw",
      duration: 1800, sticky: false,
      className: "boss-action-cue", category: "boss-actions", enabled: true
    };
  }
  
  if (text.includes("Movement rolled: d4 = ")) {
    return {
      message: text,
      key: "movement-roll", 
      duration: 1500, sticky: false,
      className: "movement-cue", category: "movement", enabled: true
    };
  }

  // Return null if no match found
  return null;
}

// Enhanced cue function that uses configuration
export function configuredCue(textOrKey, options = {}) {
  let config = null;
  let text = textOrKey;
  const timestamp = new Date().toLocaleTimeString();
  
  // First try to find by exact key lookup
  if (cueConfig && cueConfig[textOrKey]) {
    config = { ...cueConfig[textOrKey], key: textOrKey };
    
    // If we have a template with placeholders, process it
    if (config.message && config.message.includes('{')) {
      text = config.message;
      // Replace template placeholders with values from options
      Object.keys(options).forEach(key => {
        const placeholder = `{${key}}`;
        if (text.includes(placeholder)) {
          text = text.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), options[key]);
        }
      });
    } else if (config.message) {
      text = config.message;
    }
  } else {
    // Fallback to original text-based lookup
    config = findCueConfig(textOrKey);
    text = textOrKey;
  }
  
  if (config) {
    // Check if this cue is disabled
    if (config.enabled === false) {
      if (isCueLoggingEnabled()) {
        console.log(`🚫 [${timestamp}] DISABLED: ${config.category}.${config.key} - "${text}"`);
      }
      // Return a resolved promise for disabled cues to maintain API compatibility
      return { el: null, wait: Promise.resolve() };
    }
    
    // Apply configuration options
    const cueOptions = {
      ...options,
      className: config.type ? `${config.type}-cue` : options.className
    };
    
    let behaviorInfo = '';
    
    // Use the behavior field to determine cue type
    if (config.behavior === 'sticky') {
      cueOptions.sticky = true;
      behaviorInfo = '📌 STICKY (click to dismiss)';
    } else if (config.behavior === 'clickToContinue') {
      cueOptions.clickToContinue = true;
      behaviorInfo = '👆 CLICK-TO-CONTINUE (click to proceed)';
    } else if (config.behavior === 'announce') {
      const duration = config.duration || 1500;
      cueOptions.duration = duration;
      behaviorInfo = `⏱️ ANNOUNCE (auto-dismiss in ${duration}ms)`;
    }
    
    // Legacy type-based handling (for backward compatibility)
    if (!config.behavior) {
      if (config.type === 'boss-card-cue') {
        cueOptions.clickToContinue = true;
        behaviorInfo = '👆 CLICK-TO-CONTINUE (legacy boss-card-cue)';
      } else if (config.type === 'click-to-continue') {
        cueOptions.clickToContinue = true;
        behaviorInfo = '👆 CLICK-TO-CONTINUE (legacy type)';
      } else if (config.type === 'error') {
        cueOptions.sticky = true;
        behaviorInfo = '📌 STICKY (legacy error type)';
      } else {
        behaviorInfo = '⏱️ ANNOUNCE (default behavior)';
      }
    }
    
    // Log the cue with full details (check specific logging types)
    const shouldLog = isCueLoggingEnabled() || 
                     (config.category === 'boss-actions' && isBossLoggingEnabled()) ||
                     (config.category === 'combat-actions' && isCombatLoggingEnabled());
                     
    if (shouldLog) {
      // Prevent spam by checking if this is the same cue AND same text as last time
      const cueKey = `${config.category}.${config.key}`;
      const cueIdentity = `${cueKey}:${text}`; // Include actual text to differentiate same cue type
      const now = Date.now();
      if (lastLoggedCue !== cueIdentity || (now - lastLogTime) > 1000) { // Only log if different cue+text or >1 second elapsed
        const categoryIcon = config.category === 'boss-actions' ? '👹' : 
                            config.category === 'combat-actions' ? '⚔️' : '🎯';
        console.log(`${categoryIcon} [${timestamp}] ${config.category}.${config.key} | ${behaviorInfo}`);
        console.log(`   Text: "${config.message || config.text || text}"`);
        if (text !== (config.message || config.text)) {
          console.log(`   Rendered: "${text}"`);
        }
        lastLoggedCue = cueIdentity;
        lastLogTime = now;
      }
    }
    
    // Route to appropriate CueService method based on options
    // Use the actual text for display, not the template
    const messageText = text;
    if (cueOptions.sticky) {
      return cueService.sticky(messageText, cueOptions);
    } else if (cueOptions.clickToContinue) {
      return cueService.clickToContinue(messageText, cueOptions);
    } else {
      return cueService.announce(messageText, { duration: cueOptions.duration || 1500, ...cueOptions });
    }
  } else {
    // Fallback to simple cue for unconfigured messages
    if (isCueLoggingEnabled()) {
      // Prevent spam for unconfigured cues too
      const now = Date.now();
      if (lastLoggedCue !== text || (now - lastLogTime) > 1000) {
        console.log(`❓ [${timestamp}] UNCONFIGURED CUE - "${text}"`);
        console.log(`   Behavior: ⏱️ ANNOUNCE (fallback default)`);
        lastLoggedCue = text;
        lastLogTime = now;
      }
    }
    // Fallback to CueService for unconfigured messages
    if (options.sticky) {
      return cueService.sticky(text, options);
    } else if (options.clickToContinue) {
      return cueService.clickToContinue(text, options);
    } else {
      return cueService.announce(text, { duration: 1500, ...options });
    }
  }
}

// Get all cues in a category
export function getCuesByCategory(category) {
  if (!cueConfig || !cueConfig.cues[category]) return {};
  return cueConfig.cues[category].messages;
}

// Toggle a cue by key
export function toggleCueByKey(category, messageKey, enabled) {
  if (!cueConfig || !cueConfig.cues[category] || !cueConfig.cues[category].messages[messageKey]) {
    console.warn(`Cue not found: ${category}.${messageKey}`);
    return false;
  }
  
  cueConfig.cues[category].messages[messageKey].enabled = enabled;
  console.log(`${enabled ? 'Enabled' : 'Disabled'} cue: ${category}.${messageKey}`);
  return true;
}

// Update cue text
export function updateCueText(category, messageKey, newText) {
  if (!cueConfig || !cueConfig.cues[category] || !cueConfig.cues[category].messages[messageKey]) {
    console.warn(`Cue not found: ${category}.${messageKey}`);
    return false;
  }
  
  const oldText = cueConfig.cues[category].messages[messageKey].text;
  cueConfig.cues[category].messages[messageKey].text = newText;
  console.log(`Updated cue text: ${category}.${messageKey}`);
  console.log(`  Old: "${oldText}"`);
  console.log(`  New: "${newText}"`);
  return true;
}

// Console management functions
export function logCueConfig() {
  if (!cueConfig) {
    console.log('❌ No cue configuration loaded');
    return;
  }
  
  console.group('🎯 Cue Configuration Status');
  console.log('Version:', cueConfig.metadata.version);
  console.log('Categories:', Object.keys(cueConfig.cues).length);
  
  for (const [categoryKey, category] of Object.entries(cueConfig.cues)) {
    const messages = Object.values(category.messages || {});
    const enabled = messages.filter(m => m.enabled).length;
    const total = messages.length;
    
    console.log(`📁 ${categoryKey}: ${enabled}/${total} enabled`);
  }
  console.groupEnd();
}

// Update cue behavior
export function updateCueBehavior(category, messageKey, behavior, duration) {
  if (!cueConfig || !cueConfig.cues[category] || !cueConfig.cues[category].messages[messageKey]) {
    console.warn(`Cue not found: ${category}.${messageKey}`);
    return false;
  }
  
  const validBehaviors = ['sticky', 'announce', 'clickToContinue'];
  if (!validBehaviors.includes(behavior)) {
    console.warn(`Invalid behavior: ${behavior}. Valid options:`, validBehaviors);
    return false;
  }
  
  const cue = cueConfig.cues[category].messages[messageKey];
  const oldBehavior = cue.behavior || 'announce';
  
  cue.behavior = behavior;
  if (behavior === 'announce' && duration) {
    cue.duration = duration;
  } else if (behavior !== 'announce') {
    delete cue.duration; // Remove duration for non-announce behaviors
  }
  
  console.log(`Updated ${category}.${messageKey}: ${oldBehavior} → ${behavior}${duration ? ` (${duration}ms)` : ''}`);
  return true;
}

// Batch behavior updates
export function setBehaviorForCategory(category, behavior, duration) {
  if (!cueConfig || !cueConfig.cues[category]) {
    console.warn(`Category not found: ${category}`);
    return false;
  }
  
  let updated = 0;
  for (const messageKey of Object.keys(cueConfig.cues[category].messages)) {
    if (updateCueBehavior(category, messageKey, behavior, duration)) {
      updated++;
    }
  }
  
  console.log(`✅ Updated ${updated} cues in ${category} to ${behavior}`);
  return updated;
}

// Global window helpers for easy console access
if (typeof window !== 'undefined') {
  window.cueConfig = {
    load: loadCueConfig,
    status: logCueConfig,
    toggle: toggleCueByKey,
    update: updateCueText,
    category: getCuesByCategory,
    behavior: updateCueBehavior,
    setBehavior: setBehaviorForCategory,
    logging: toggleCueLogging,
    logCues: () => {
      if (state?.debug) state.debug.logCues = true;
      console.log('✅ Cue logging enabled');
    },
    logCombat: () => {
      if (state?.debug) state.debug.logCombat = true;
      console.log('✅ Combat logging enabled');
    },
    logBoss: () => {
      if (state?.debug) state.debug.logBoss = true;
      console.log('✅ Boss logging enabled');
    },
    logAll: () => {
      if (state?.debug) {
        state.debug.logCues = true;
        state.debug.logCombat = true;
        state.debug.logBoss = true;
      }
      console.log('✅ All logging enabled');
    },
    logNone: () => {
      if (state?.debug) {
        state.debug.logCues = false;
        state.debug.logCombat = false;
        state.debug.logBoss = false;
      }
      console.log('🚫 All logging disabled');
    },
    logStatus: () => {
      console.group('🎯 Logging Status');
      console.log('General cue logging:', isCueLoggingEnabled() ? '✅ ON' : '❌ OFF');
      console.log('Combat logging:', isCombatLoggingEnabled() ? '✅ ON' : '❌ OFF');
      console.log('Boss logging:', isBossLoggingEnabled() ? '✅ ON' : '❌ OFF');
      console.groupEnd();
      console.log('\nConsole commands:');
      console.log('  cueConfig.logCues()   - Enable general cue logging');
      console.log('  cueConfig.logCombat() - Enable combat-specific logging'); 
      console.log('  cueConfig.logBoss()   - Enable boss-specific logging');
      console.log('  cueConfig.logAll()    - Enable all logging');
      console.log('  cueConfig.logNone()   - Disable all logging');
    },
    reload: () => loadCueConfig().then(() => console.log('🔄 Configuration reloaded'))
  };
}

// Auto-load configuration when module is imported
loadCueConfig().then(() => {
  if (cueConfig) {
    console.log(`🎯 Loaded ${Object.keys(cueConfig).length} cue categories`);
  }
});

export { cueConfig };
