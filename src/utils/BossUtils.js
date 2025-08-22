// /src/utils/BossUtils.js
// Utility functions for boss management

import { BossCreator } from "../factories/BossCreator.js";
import { getAvailableBossTypes, isValidBossType } from "../data/BossRegistry.js";

/**
 * Spawn a boss in a scene with automatic positioning
 */
export function spawnBoss(bossType, scene, options = {}) {
  if (!isValidBossType(bossType)) {
    throw new Error(`Invalid boss type: ${bossType}. Available: ${getAvailableBossTypes().join(', ')}`);
  }
  
  // Auto-calculate position if not provided
  const defaultCol = Math.ceil(scene.board?.size / 2) || 8;
  const defaultRow = (scene.board?.size - 3) || 8;
  
  const boss = BossCreator.createBoss(bossType, {
    col: options.col || defaultCol,
    row: options.row || defaultRow,
    rng: options.rng || scene.rng || scene.state?.rng,
    ...options
  });
  
  // Place boss on board if available
  if (scene.board && typeof scene.board.placeToken === 'function') {
    const bossSprite = boss.getSprite ? boss.getSprite() : null;
    scene.board.placeToken(boss.id, {
      col: boss.col,
      row: boss.row,
      w: boss.w,
      h: boss.h,
      cls: "boss",
      label: bossSprite?.hideLabel ? "" : boss.name,
      sprite: bossSprite
    });
  }
  
  return boss;
}

/**
 * Get boss info for debugging/display
 */
export function getBossInfo(boss) {
  return {
    name: boss.name,
    type: boss.type,
    hp: `${boss.hp}/${boss.hpMax}`,
    position: `(${boss.col}, ${boss.row})`,
    size: `${boss.w}×${boss.h}`,
    deckSize: boss.deck?.drawPile?.length || 0,
    discardSize: boss.discard?.length || 0
  };
}

/**
 * List all available boss types with previews
 */
export function listAvailableBosses() {
  return getAvailableBossTypes().map(type => {
    try {
      return BossCreator.getBossPreview(type);
    } catch (error) {
      return { id: type, name: type, error: error.message };
    }
  });
}
