// AffinityColors.js
// Utility for applying affinity-based color styling to player names and UI elements

// Affinity color mapping (matches CSS variables in style.css)
const AFFINITY_COLORS = Object.freeze({
  // Elementalist affinities
  Flame: {
    normal: '#ff6b35',
    dim: '#cc5429', 
    bright: '#ff8855'
  },
  Terra: {
    normal: '#8bc34a',
    dim: '#6f9c3b',
    bright: '#a1d15a'  
  },
  Tide: {
    normal: '#4fc3f7',
    dim: '#3f9bc4',
    bright: '#6fcffa'
  },
  
  // Warrior affinities
  Brutality: {
    normal: '#e53935',
    dim: '#b72c2a',
    bright: '#ea5c58'
  },
  Guardianship: {
    normal: '#3f51b5', 
    dim: '#324192',
    bright: '#5c6bc0'
  },
  Leadership: {
    normal: '#ffc107',
    dim: '#cc9a06', 
    bright: '#ffcd39'
  },
  
  // Survivalist affinities
  Lethality: {
    normal: '#9c27b0',
    dim: '#7b1f8c',
    bright: '#b547c8'
  },
  Primalism: {
    normal: '#795548',
    dim: '#5d4037',
    bright: '#8d6e63'
  },
  "Nature's Aid": {
    normal: '#4caf50',
    dim: '#388e3c', 
    bright: '#66bb6a'
  }
});

/**
 * Get the color for a specific affinity and variant
 * @param {string} affinity - The affinity name
 * @param {string} variant - Color variant: 'normal', 'dim', or 'bright'
 * @returns {string} Hex color code
 */
export function getAffinityColor(affinity, variant = 'normal') {
  const colors = AFFINITY_COLORS[affinity];
  if (!colors) {
    // Fallback to neutral color
    return variant === 'dim' ? '#666' : variant === 'bright' ? '#fff' : '#999';
  }
  return colors[variant] || colors.normal;
}

/**
 * Create a styled span element for a player name with affinity colors
 * @param {Object} player - Player object with affinity property
 * @param {string} state - Display state: 'active', 'normal', 'dim'
 * @returns {HTMLSpanElement} Styled span element
 */
export function createPlayerNameElement(player, state = 'normal') {
  const span = document.createElement('span');
  span.textContent = player.name || 'Unnamed';
  span.className = 'player-name';
  
  // Determine color variant based on state
  let variant = 'normal';
  if (state === 'active') {
    variant = 'bright';
    span.classList.add('active');
  } else if (state === 'dim') {
    variant = 'dim';
    span.classList.add('dimmed');
  }
  
  // Apply affinity color
  if (player.affinity) {
    const color = getAffinityColor(player.affinity, variant);
    span.style.color = color;
    span.style.textShadow = `0 0 2px ${color}40`; // Subtle glow
    span.dataset.affinity = player.affinity.toLowerCase();
  }
  
  return span;
}

/**
 * Apply affinity styling to an existing element
 * @param {HTMLElement} element - Element to style
 * @param {string} affinity - Affinity name
 * @param {string} variant - Color variant
 */
export function applyAffinityStyle(element, affinity, variant = 'normal') {
  const color = getAffinityColor(affinity, variant);
  element.style.color = color;
  element.style.borderColor = color + '80'; // Semi-transparent border
  element.dataset.affinity = affinity.toLowerCase();
}

/**
 * Get CSS variable name for an affinity color
 * @param {string} affinity - Affinity name  
 * @param {string} variant - Color variant
 * @returns {string} CSS variable name
 */
export function getAffinityCSSVar(affinity, variant = 'normal') {
  const suffix = variant === 'normal' ? '' : `-${variant}`;
  return `--affinity-${affinity.toLowerCase()}${suffix}`;
}

export const AffinityColors = {
  getAffinityColor,
  createPlayerNameElement, 
  applyAffinityStyle,
  getAffinityCSSVar,
  AFFINITY_COLORS
};
