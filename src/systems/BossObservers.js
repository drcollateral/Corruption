// /boss_observers.js
// Observer system for boss events - handles visual effects and UI updates

import { updateBurnOverlayPositions, removeBurnDebuffOverlay, addBurnDebuffOverlay, playBurnTick } from "./EffectSystem.js";
import { syncBossPanel, bossLog } from "../ui/BossPanel.js";
import { cueService } from "../utils/CueService.js";
import { isDotKind } from "../data/DamageTypes.js";
import { state } from "../core/GameState.js";

export class BossVisualEffectsObserver {
  constructor() {
    this.name = "VisualEffectsObserver";
  }
  
  // Handle boss position changes
  positionChanged(boss, { oldPos, newPos }) {
    // Update burn overlay positions when boss moves
    updateBurnOverlayPositions(newPos.col, newPos.row, boss.w, boss.h);
    
    // Update board token position instantly
    if (state.board && boss.id) {
      state.board.moveToken(boss.id, newPos.col, newPos.row);
    }
  }
  
  // Handle animated boss movement
  animatedMove(boss, { oldPos, newPos }) {
  // For animated moves, animate the token first, then sync overlays at the end
  this.animateBossMovement(boss, oldPos, newPos);
  }
  
  // Animate boss token movement smoothly
  animateBossMovement(boss, oldPos, newPos) {
    if (!state.board || !boss.id) return;
    
    const token = state.board.tokens.get(boss.id);
    if (!token) return;
    
    // Determine distance moved for duration tuning
    const deltaCol = Math.abs(newPos.col - oldPos.col);
    const deltaRow = Math.abs(newPos.row - oldPos.row);
    const dist = deltaCol + deltaRow;
    const durMs = Math.min(700, 250 + dist * 150);
    
    // Stronger easing for charge-like slides
    token.style.transition = `left ${durMs}ms cubic-bezier(0.22, 1, 0.36, 1), top ${durMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    token.classList.add('charge-motion');
    
    // Move the token now (this will animate because transition is already set)
    state.board.moveToken(boss.id, newPos.col, newPos.row);

    const onDone = () => {
      token.removeEventListener('transitionend', onDone);
      token.classList.remove('charge-motion');
      token.style.transition = '';
      // Now sync the burn overlays to the final boss position
      updateBurnOverlayPositions(newPos.col, newPos.row, boss.w, boss.h);
    };
    token.addEventListener('transitionend', onDone);
    // Fallback in case transitionend doesn’t fire (zero distance, etc.)
    setTimeout(onDone, durMs + 20);
  }
  
  // Handle status effects
  statusAdded(boss, { status }) {
    if (status.kind === "burn") {
      // Add persistent burn overlay (no timeout - removed only when status expires)
      addBurnDebuffOverlay(boss.col, boss.row, boss.w, boss.h, null, boss.id);
    }
  }
  
  statusRemoved(boss, { status }) {
    if (status.kind === "burn") {
      // Remove burn overlays when burn expires
      for (let dc = 0; dc < boss.w; dc++) {
        for (let dr = 0; dr < boss.h; dr++) {
          removeBurnDebuffOverlay(boss.col + dc, boss.row + dr);
        }
      }
    }
  }
  
  statusTick(boss, { status }) {
    if (status.kind === "burn") {
      // Play burn damage animation
      playBurnTick(boss.col, boss.row, boss.w, boss.h);
    }
  }
  
  // Handle damage
  damageTaken(boss, { amount, source }) {
    // Trigger shake animation
    this.triggerDamageShake(boss);
    
    // Show floating damage number
    this.showDamageNumber(boss, amount, source);
    
    const srcName = source?.name || (typeof source === 'object' && source.kind) || 'unknown';
    const line = `${boss.name} took ${amount} damage from ${srcName}`;
    console.log(line);
    bossLog(line);
    // If burn damage, surface an explicit cue so player knows to click to advance if flow is paused
    if (isDotKind(srcName)) {
      cueService.clickToContinue(`${boss.name} takes ${amount} ${srcName.charAt(0).toUpperCase()+srcName.slice(1)} damage.`);
    }
  }
  
  // Show floating damage number above the boss
  showDamageNumber(boss, amount, source = null) {
    if (!state.board || !boss.id || amount <= 0) return;
    
    // Get the token element from the board's token map
    const token = state.board.tokens.get(boss.id);
    if (!token) return;
    
    // Create damage number element
    const damageNumber = document.createElement("div");
    damageNumber.className = "damage-number";
    damageNumber.textContent = `-${amount}`;
    
    // Add special styling based on damage source
    if (source?.name === "Burn" || (typeof source === 'object' && source.kind === 'burn')) {
      damageNumber.classList.add('burn');
    }
    
  // Position relative to the token
  damageNumber.style.left = "50%";
  damageNumber.style.top = "-10px";
    
  // Add slight random horizontal offset to prevent overlap
    const randomOffset = (Math.random() - 0.5) * 20; // -10 to +10 pixels
    damageNumber.style.transform = `translate(calc(-50% + ${randomOffset}px), 0)`;
    
  // Append to token (token remains absolutely positioned within the grid)
    token.appendChild(damageNumber);
    
    // Remove after animation completes
    setTimeout(() => {
      if (damageNumber.parentNode) {
        damageNumber.remove();
      }
    }, 1200);
  }
  
  // Trigger visual shake effect on the boss token
  triggerDamageShake(boss) {
    if (!state.board || !boss.id) return;
    
    // Get the token element from the board's token map
    const token = state.board.tokens.get(boss.id);
    if (token) {
      // Remove any existing shake animation
      token.classList.remove('damage-shake');
      
      // Trigger reflow to ensure the class removal takes effect
      token.offsetHeight;
      
      // Add shake animation
      token.classList.add('damage-shake');
      
      // Remove the class after animation completes
      setTimeout(() => {
        token.classList.remove('damage-shake');
      }, 500);
    } else {
      console.warn(`Could not find token for boss ID: ${boss.id}`);
    }
  }
}

export class BossUIObserver {
  constructor() {
    this.name = "UIObserver";
  }
  
  // Update UI whenever boss state changes
  damageTaken(boss, data) {
    syncBossPanel();
  }
  
  statusAdded(boss, data) {
    syncBossPanel();
  }
  
  statusRemoved(boss, data) {
    syncBossPanel();
  }
  
  death(boss, data) {
    syncBossPanel();
    // Could trigger victory screen here
  }
}

// Create global observers
export const bossVisualEffects = new BossVisualEffectsObserver();
export const bossUI = new BossUIObserver();

// Helper function to set up all observers for a boss
export function setupBossObservers(boss) {
  boss.subscribe(bossVisualEffects);
  boss.subscribe(bossUI);
}
