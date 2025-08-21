/**
 * Action System - Handles all player and boss actions (spells, abilities, attacks)
 * Designed for easy addition of hundreds of spells with consistent patterns
 */

export class ActionSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.spells = new Map();
    this.abilities = new Map();
    this.pendingAction = null;
    
    this.registerDefaultSpells();
  }

  registerDefaultSpells() {
    // Burn spell - fire damage over time
    this.registerSpell('burn', {
      name: 'Burn',
      description: 'Sets target on fire for 3 turns',
      actionCost: 1,
      range: 7,
      targetType: 'enemy',
      execute: async (caster, targets) => {
        const target = targets[0];
        const damage = 2 + Math.floor(caster.stats.intelligence / 2);
        
        // Apply burning effect
        target.addEffect('burning', {
          duration: 3,
          damage: damage,
          source: caster
        });
        
        this.eventBus.emit('spell:cast', {
          caster,
          spell: 'burn',
          targets,
          message: `${caster.name} casts Burn on ${target.name}.`
        });
        
        return { success: true, damage };
      }
    });

    // Inferno - enhances burn effects
    this.registerSpell('inferno', {
      name: 'Inferno',
      description: 'Primes next Burn to detonate immediately and pulse',
      actionCost: 0,
      bonusCost: 1,
      range: 0,
      targetType: 'self',
      execute: async (caster) => {
        caster.addEffect('inferno_primed', {
          duration: 1,
          type: 'enhancement'
        });
        
        this.eventBus.emit('spell:cast', {
          caster,
          spell: 'inferno',
          message: `${caster.name} primes Inferno: Burn will detonate immediately and pulse for 2.`
        });
        
        return { success: true };
      }
    });
  }

  registerSpell(id, spellData) {
    this.spells.set(id, new Spell(id, spellData));
  }

  registerAbility(id, abilityData) {
    this.abilities.set(id, new Ability(id, abilityData));
  }

  getSpell(id) {
    return this.spells.get(id);
  }

  async executeAction(caster, actionId, targets = []) {
    const action = this.spells.get(actionId) || this.abilities.get(actionId);
    if (!action) {
      throw new Error(`Unknown action: ${actionId}`);
    }

    // Validate action requirements
    const validation = this.validateAction(caster, action, targets);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Consume action resources
    this.consumeActionCosts(caster, action);

    // Execute the action
    try {
      const result = await action.execute(caster, targets);
      
      // Handle any post-execution effects
      this.processActionEffects(caster, action, targets, result);
      
      return result;
    } catch (error) {
      console.error('Action execution failed:', error);
      return { success: false, error: error.message };
    }
  }

  validateAction(caster, action, targets) {
    // Check action costs
    if (action.actionCost > 0 && caster.turn.action < action.actionCost) {
      return { valid: false, error: `${caster.name} has no actions left.` };
    }
    
    if (action.bonusCost > 0 && caster.turn.bonus < action.bonusCost) {
      return { valid: false, error: `${caster.name} has no bonus actions left.` };
    }

    // Check if caster knows the spell
    if (action instanceof Spell && !caster.knowsSpell(action.id)) {
      return { valid: false, error: `${caster.name} doesn't know ${action.name}.` };
    }

    // Check targeting
    if (action.targetType === 'enemy' && targets.length === 0) {
      return { valid: false, error: 'No target selected.' };
    }

    return { valid: true };
  }

  consumeActionCosts(caster, action) {
    caster.turn.action -= (action.actionCost || 0);
    caster.turn.bonus -= (action.bonusCost || 0);
  }

  processActionEffects(caster, action, targets, result) {
    // Handle special interactions (like inferno + burn)
    if (action.id === 'burn' && caster.hasEffect('inferno_primed')) {
      this.triggerInfernoDetonation(caster, targets[0], result.damage);
    }
  }

  triggerInfernoDetonation(caster, target, burnDamage) {
    // Detonate burn immediately
    const detonate = burnDamage * 2;
    target.takeDamage(detonate, 'fire');
    
    this.eventBus.emit('effect:triggered', {
      type: 'inferno_detonation',
      message: `Inferno detonates Burn for ${detonate} immediate damage.`
    });

    // Pulse damage to nearby enemies
    this.triggerInfernoPulse(caster);
    
    // Remove inferno primed effect
    caster.removeEffect('inferno_primed');
  }

  triggerInfernoPulse(caster) {
    const pulseRange = 2;
    const pulseDamage = 2;
    const nearbyEnemies = this.findEnemiesInRange(caster, pulseRange);
    
    if (nearbyEnemies.length > 0) {
      nearbyEnemies.forEach(enemy => {
        enemy.takeDamage(pulseDamage, 'fire');
      });
      
      const names = nearbyEnemies.map(e => e.name).join(', ');
      this.eventBus.emit('effect:triggered', {
        type: 'inferno_pulse',
        message: `Inferno pulse hits ${names} for ${pulseDamage}.`
      });
    }
  }

  findEnemiesInRange(caster, range) {
    // This would interface with the board system to find enemies in range
    // For now, return empty array - will be implemented when integrating
    return [];
  }

  // Helper method to check if player can cast a spell
  canCastSpell(player, spellId) {
    const spell = this.getSpell(spellId);
    if (!spell) return false;
    
    return this.validateAction(player, spell, []).valid;
  }
}

/**
 * Spell class - represents a castable spell
 */
class Spell {
  constructor(id, data) {
    this.id = id;
    this.name = data.name;
    this.description = data.description;
    this.actionCost = data.actionCost || 0;
    this.bonusCost = data.bonusCost || 0;
    this.range = data.range || 0;
    this.targetType = data.targetType || 'none'; // none, self, ally, enemy, any
    this.executeFunc = data.execute;
  }

  async execute(caster, targets) {
    return await this.executeFunc(caster, targets);
  }
}

/**
 * Ability class - represents non-spell abilities
 */
class Ability {
  constructor(id, data) {
    this.id = id;
    this.name = data.name;
    this.description = data.description;
    this.actionCost = data.actionCost || 0;
    this.bonusCost = data.bonusCost || 0;
    this.cooldown = data.cooldown || 0;
    this.executeFunc = data.execute;
  }

  async execute(caster, targets) {
    return await this.executeFunc(caster, targets);
  }
}
