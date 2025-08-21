/**
 * Boss System - Clean, modular boss AI and action system
 * Designed for easy addition of new bosses and abilities
 */

export class BossSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.bosses = new Map();
    this.actionQueue = [];
    
    this.registerDefaultBosses();
  }

  registerDefaultBosses() {
    // Bear boss
    this.registerBoss('bear', {
      name: 'Bear',
      health: 30,
      deck: [
        { id: 'swipe', weight: 3 },
        { id: 'enrage', weight: 1 },
        { id: 'advance', weight: 2 }
      ],
      actions: {
        swipe: {
          name: 'Swipe',
          description: 'Melee attack against adjacent targets',
          execute: async (boss) => {
            const targets = this.getAdjacentTargets(boss);
            if (targets.length === 0) {
              return { message: 'Swipe misses!', damage: 0 };
            }
            
            const damage = 3 + Math.floor(Math.random() * 3); // 3-5 damage
            targets.forEach(target => target.takeDamage(damage));
            
            return { 
              message: `Swipe hits ${targets.map(t => t.name).join(', ')} for ${damage} damage!`,
              damage
            };
          }
        },
        
        enrage: {
          name: 'Enrage',
          description: 'Increases damage for the rest of combat',
          execute: async (boss) => {
            boss.addEffect('enraged', {
              damageBonus: 2,
              permanent: true
            });
            
            return {
              message: 'Boss becomes Enraged!',
              effect: 'enraged'
            };
          }
        },
        
        advance: {
          name: 'Advance',
          description: 'Move towards the nearest player',
          execute: async (boss) => {
            const target = this.getNearestPlayer(boss);
            if (target) {
              this.moveTowards(boss, target.position);
              return {
                message: 'Advance!',
                movement: true
              };
            }
            
            return {
              message: 'Boss looks around menacingly.',
              movement: false
            };
          }
        }
      }
    });
  }

  registerBoss(id, bossData) {
    this.bosses.set(id, new BossTemplate(id, bossData));
  }

  async executeBossTurn(boss) {
    console.log(`Executing boss turn for ${boss.name}`);
    
    try {
      // Draw a card from boss deck
      const action = this.drawBossCard(boss);
      
      if (!action) {
        console.warn('No action drawn for boss');
        return;
      }

      // Show boss action
      this.eventBus.emit('boss:actionDrawn', {
        boss: boss.name,
        action: action.name
      });

      // Execute the action
      const result = await action.execute(boss);
      
      // Show result
      this.eventBus.emit('boss:actionExecuted', {
        boss: boss.name,
        action: action.name,
        result
      });
      
      // Update boss state
      this.updateBossState(boss, result);
      
      return result;
      
    } catch (error) {
      console.error('Boss turn execution failed:', error);
      this.eventBus.emit('boss:actionFailed', {
        boss: boss.name,
        error: error.message
      });
    }
  }

  drawBossCard(boss) {
    const template = this.bosses.get(boss.templateId);
    if (!template) return null;

    // Weighted random selection from deck
    const totalWeight = template.deck.reduce((sum, card) => sum + card.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const card of template.deck) {
      random -= card.weight;
      if (random <= 0) {
        return template.actions[card.id];
      }
    }
    
    // Fallback to first action
    return template.actions[Object.keys(template.actions)[0]];
  }

  getAdjacentTargets(boss) {
    const targets = [];
    const { col, row } = boss.position;
    
    // Check all adjacent positions
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue;
        
        const targetCol = col + dc;
        const targetRow = row + dr;
        
        const target = this.getPlayerAt(targetCol, targetRow);
        if (target) {
          targets.push(target);
        }
      }
    }
    
    return targets;
  }

  getNearestPlayer(boss) {
    // This would interface with the game state to find players
    // For now, return null - will be implemented during integration
    return null;
  }

  moveTowards(boss, targetPosition) {
    const { col: bossCol, row: bossRow } = boss.position;
    const { col: targetCol, row: targetRow } = targetPosition;
    
    // Simple movement towards target
    const deltaCol = Math.sign(targetCol - bossCol);
    const deltaRow = Math.sign(targetRow - bossRow);
    
    boss.position.col += deltaCol;
    boss.position.row += deltaRow;
    
    // Emit movement event
    this.eventBus.emit('boss:moved', {
      boss: boss.name,
      from: { col: bossCol, row: bossRow },
      to: boss.position
    });
  }

  getPlayerAt(col, row) {
    // Interface with game state to get player at position
    // For now, return null - will be implemented during integration
    return null;
  }

  updateBossState(boss, actionResult) {
    // Update boss state based on action results
    if (actionResult.effect) {
      // Handle status effects
    }
    
    if (actionResult.movement) {
      // Handle position updates
    }
    
    // Emit state update
    this.eventBus.emit('boss:stateUpdated', { boss, result: actionResult });
  }

  // Create a boss instance from a template
  createBoss(templateId, overrides = {}) {
    const template = this.bosses.get(templateId);
    if (!template) {
      throw new Error(`Unknown boss template: ${templateId}`);
    }

    const boss = {
      templateId,
      id: `${templateId}_${Date.now()}`,
      name: overrides.name || template.name,
      maxHP: overrides.health || template.health,
      currentHP: overrides.health || template.health,
      position: overrides.position || { col: 7, row: 7 },
      effects: new Map(),
      type: 'boss',
      
      // Methods
      addEffect(id, data) { this.effects.set(id, data); },
      removeEffect(id) { this.effects.delete(id); },
      hasEffect(id) { return this.effects.has(id); },
      takeDamage(amount) {
        this.currentHP = Math.max(0, this.currentHP - amount);
        return this.currentHP <= 0;
      }
    };

    return boss;
  }
}

/**
 * Boss Template - Defines boss behavior patterns
 */
class BossTemplate {
  constructor(id, data) {
    this.id = id;
    this.name = data.name;
    this.health = data.health;
    this.deck = data.deck;
    this.actions = data.actions;
  }
}
