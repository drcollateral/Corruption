// /src/factories/BossCreator.js
// Factory for creating boss entities with validation

import { BossEntity } from "../entities/BossEntity.js";
import { BossDeck } from "../entities/BossDeck.js";
import { isValidBossType, getBossMetadata, getBossDeck, getAvailableBossTypes } from "../data/BossRegistry.js";

export class BossCreator {
  /**
   * Create a boss instance with the specified type and options
   */
  static createBoss(bossType, options = {}) {
    if (!isValidBossType(bossType)) {
      throw new Error(`Invalid boss type: ${bossType}`);
    }

    const metadata = getBossMetadata(bossType);
    const deckDefinition = getBossDeck(bossType);
    const { col = 8, row = 8, rng = Math } = options;

    // Create boss entity
    const boss = new BossEntity({
      id: options.id || `${bossType.toLowerCase()}_${Date.now()}`,
      name: metadata.name || bossType,
      type: bossType.toLowerCase(),
      col,
      row,
      hp: metadata.hp || 20,
      hpMax: metadata.hp || 20,
      w: metadata.size?.w || 1,
      h: metadata.size?.h || 2,
      rng
    });

    // Create boss deck
    boss.deck = new BossDeck(rng, deckDefinition);

    // Apply metadata properties
    if (metadata.size) {
      boss.w = metadata.size.w || 1;
      boss.h = metadata.size.h || 1;
    }
    if (metadata.movementDie) {
      boss.movementDie = metadata.movementDie;
    }

    console.debug(`[BossCreator] Created ${bossType} boss at (${col}, ${row})`);
    return boss;
  }

  /**
   * Get boss preview information without creating the full entity
   */
  static getBossPreview(bossType) {
    if (!isValidBossType(bossType)) {
      return null;
    }

    const metadata = getBossMetadata(bossType);
    return {
      name: metadata.name || bossType,
      type: bossType.toLowerCase(),
      hp: metadata.hp || 20,
      description: `A ${metadata.name || bossType.toLowerCase()}`
    };
  }

  /**
   * List all available boss types
   */
  static getAvailableBossTypes() {
    return getAvailableBossTypes();
  }
}
