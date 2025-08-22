import { configuredCue } from './CueConfigLoader.js';

// Simple cue function that routes through configured cue system
export function simpleCue(text, options = {}) {
  // Route to configured cue system which handles JSON config and logging
  return configuredCue(text, options);
}

// Legacy compatibility functions for dynamic imports
export function logCueStatus() {
  console.log('📋 Cue system status:');
  console.log('  Configured cue system active');
  console.log('  All cues routed through CueConfigLoader');
  console.log('  Use debug checkboxes to control logging');
}

export function toggleCue(pattern, enabled) {
  console.log(`Toggle cue ${pattern}: ${enabled ? 'enabled' : 'disabled'}`);
  console.log('Note: Individual cue toggling not implemented in new system');
  console.log('Use debug checkboxes for category-level control');
}