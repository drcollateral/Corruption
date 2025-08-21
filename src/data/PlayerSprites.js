// player_sprites.js
// Registry of player sprite configurations based on class and affinity
import { state } from "../core/GameState.js";

export const PLAYER_SPRITES = {
  ELEMENTALIST: {
    Flame: {
      // Standing/default uses the provided GIF; directions still point to PNGs for now
      default: {
        image: 'assets/sprites/players/elementalist/flame.gif',
        size: '90% auto',
        position: 'center bottom',
        hideLabel: true,
        zIndex: 5,
    overflow: 'visible',
    transparent: true,
        layerWidth: '160%',
        layerHeight: '200%'
      },
  // Map all directions to the GIF so movement keeps the same art
  north: { image: 'assets/sprites/players/elementalist/flame.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  'north-east': { image: 'assets/sprites/players/elementalist/flame.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  east: { image: 'assets/sprites/players/elementalist/flame.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  'south-east': { image: 'assets/sprites/players/elementalist/flame.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  south: { image: 'assets/sprites/players/elementalist/flame.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  'south-west': { image: 'assets/sprites/players/elementalist/flame.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  west: { image: 'assets/sprites/players/elementalist/flame.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  'north-west': { image: 'assets/sprites/players/elementalist/flame.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' }
    },
    Tide: {
      default: {
        image: 'assets/sprites/players/elementalist/tide.gif',
        size: '90% auto',
        position: 'center bottom',
        hideLabel: true,
        zIndex: 5,
    overflow: 'visible',
    transparent: true,
        layerWidth: '160%',
        layerHeight: '200%'
      },
  north: { image: 'assets/sprites/players/elementalist/tide.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  'north-east': { image: 'assets/sprites/players/elementalist/tide.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  east: { image: 'assets/sprites/players/elementalist/tide.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  'south-east': { image: 'assets/sprites/players/elementalist/tide.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  south: { image: 'assets/sprites/players/elementalist/tide.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  'south-west': { image: 'assets/sprites/players/elementalist/tide.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  west: { image: 'assets/sprites/players/elementalist/tide.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' },
  'north-west': { image: 'assets/sprites/players/elementalist/tide.gif', size: '90% auto', position: 'center bottom', hideLabel: true, zIndex: 5, overflow: 'visible', transparent: true, layerWidth:'160%', layerHeight:'200%' }
    },
    // Default fallback for other affinities points at south PNG
    default: {
      // Use the known-present Flame GIF as a safe fallback to avoid missing asset issues
      image: 'assets/sprites/players/elementalist/flame.gif',
      size: '90% auto',
      position: 'center bottom',
      hideLabel: true,
      zIndex: 5,
      overflow: 'visible',
      transparent: true,
      layerWidth: '160%',
      layerHeight: '200%'
    }
  }
};

export function getPlayerSprite(classId, affinity, direction = 'south') {
  // Normalize keys (classId is stored uppercase in CLASSES)
  const clsKey = String(classId || '').trim().toUpperCase();
  const affNormalized = String(affinity || '').trim();
  const affKeyExact = affNormalized;
  const affKeyAlt = affNormalized.toLowerCase();
  const classSprites = PLAYER_SPRITES[clsKey];
  if (!classSprites) return null;
  
  // Try exact, then case-insensitive affinity match among known keys
  let affinitySprites = classSprites[affKeyExact];
  if (!affinitySprites){
    const found = Object.keys(classSprites).find(k => k.toLowerCase() === affKeyAlt);
    if (found) affinitySprites = classSprites[found];
  }
  if (!affinitySprites) {
    // Fallback to default if available
    return classSprites.default || null;
  }
  
  // Return directional sprite or default
  return affinitySprites[direction] || affinitySprites.default || classSprites.default || null;
}

export function getPlayerSpriteForClass(player, direction = 'south') {
  const cls = String(player.classId || player.class || player.className || '').trim();
  const aff = String(player.affinity || '').trim();
  if (!cls || !aff) return null;
  return getPlayerSprite(cls, aff, direction);
}

// Helper function to calculate direction based on movement delta
export function getDirectionFromDelta(dx, dy) {
  if (dx === 0 && dy === -1) return 'north';
  if (dx === 1 && dy === -1) return 'north-east';
  if (dx === 1 && dy === 0) return 'east';
  if (dx === 1 && dy === 1) return 'south-east';
  if (dx === 0 && dy === 1) return 'south';
  if (dx === -1 && dy === 1) return 'south-west';
  if (dx === -1 && dy === 0) return 'west';
  if (dx === -1 && dy === -1) return 'north-west';
  return 'south'; // default
}

// Helper function to update player sprite based on movement
export function updatePlayerSpriteDirection(player, dx, dy) {
  const direction = getDirectionFromDelta(dx, dy);
  const sprite = getPlayerSpriteForClass(player, direction);
  
  if (sprite && state.board) {
  const tokenElement = state.board.getToken ? state.board.getToken(player.id) : (state.board.tokens && state.board.tokens.get(player.id));
    if (tokenElement) {
      state.board.applyTokenSprite(tokenElement, sprite);
    }
  }
}
