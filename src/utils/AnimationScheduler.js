// animation-scheduler.js
// Centralized animation scheduler for consistent timing and settlement

import { events } from '../core/EventBus.js';

class AnimationScheduler {
  constructor() {
    this.activeAnimations = new Map(); // element -> animation state
    this.defaultDuration = 300;
  }
  
  // Slide a token to new position
  slideToken(element, toCol, toRow, options = {}) {
    const {
      duration = this.defaultDuration,
      easing = 'cubic-bezier(0.22, 1, 0.36, 1)',
      entityId = null
    } = options;
    
    // Cancel any existing animation on this element
    this.cancel(element);
    
    return new Promise(resolve => {
      const startCol = Number(element.dataset.col || element.style.getPropertyValue('--col'));
      const startRow = Number(element.dataset.row || element.style.getPropertyValue('--row'));
      
      // Skip if already at target
      if (startCol === toCol && startRow === toRow) {
        resolve();
        return;
      }
      
      const animState = {
        element,
        startCol,
        startRow,
        toCol,
        toRow,
        entityId,
        startTime: Date.now(),
        duration,
        resolve
      };
      
      this.activeAnimations.set(element, animState);
      
      const cleanup = () => {
        element.removeEventListener('transitionend', onTransitionEnd);
        element.style.transition = '';
        this.activeAnimations.delete(element);
        
        // Update final position data
        element.dataset.col = String(toCol);
        element.dataset.row = String(toRow);
        element.style.setProperty('--col', String(toCol));
        element.style.setProperty('--row', String(toRow));
        
        // Emit settlement event
        if (entityId) {
          events.emit('entity:moved:settled', { id: entityId, col: toCol, row: toRow });
        }
        
        resolve();
      };
      
      const onTransitionEnd = (e) => {
        // Only respond to our transition
        if (e.target === element && (e.propertyName === 'left' || e.propertyName === 'top')) {
          cleanup();
        }
      };
      
      // Set up transition
      element.addEventListener('transitionend', onTransitionEnd, { once: true });
      element.style.transition = `left ${duration}ms ${easing}, top ${duration}ms ${easing}`;
      
      // Trigger animation
      element.style.setProperty('--col', String(toCol));
      element.style.setProperty('--row', String(toRow));
      
      // Fallback timeout in case transitionend doesn't fire
      setTimeout(() => {
        if (this.activeAnimations.has(element)) {
          cleanup();
        }
      }, duration + 100);
    });
  }
  
  // Animate multiple steps in sequence
  async slideTokenPath(element, path, options = {}) {
    const {
      stepDuration = this.defaultDuration,
      pauseBetweenSteps = 50,
      entityId = null
    } = options;
    
    for (let i = 1; i < path.length; i++) {
      const step = path[i];
      await this.slideToken(element, step.col, step.row, {
        duration: stepDuration,
        entityId: i === path.length - 1 ? entityId : null // Only emit settled on final step
      });
      
      if (pauseBetweenSteps > 0 && i < path.length - 1) {
        await this.delay(pauseBetweenSteps);
      }
    }
  }
  
  // Cancel animation on element
  cancel(element) {
    const animState = this.activeAnimations.get(element);
    if (animState) {
      element.style.transition = '';
      this.activeAnimations.delete(element);
      animState.resolve();
    }
  }
  
  // Cancel all animations
  cancelAll() {
    for (const [element, animState] of this.activeAnimations.entries()) {
      element.style.transition = '';
      animState.resolve();
    }
    this.activeAnimations.clear();
  }
  
  // Simple delay utility
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Check if element is currently animating
  isAnimating(element) {
    return this.activeAnimations.has(element);
  }
  
  // Wait for all animations to complete
  async waitForAll() {
    const promises = Array.from(this.activeAnimations.values()).map(state => 
      new Promise(resolve => {
        const originalResolve = state.resolve;
        state.resolve = () => {
          originalResolve();
          resolve();
        };
      })
    );
    
    await Promise.all(promises);
  }
  
  // Shake effect for damage
  shakeToken(element, options = {}) {
    const {
      duration = 500,
      intensity = 'damage-shake'
    } = options;
    
    return new Promise(resolve => {
      // Remove any existing shake class
      element.classList.remove('damage-shake');
      element.offsetHeight; // Force reflow
      
      // Add shake class
      element.classList.add(intensity);
      
      // Remove after duration
      setTimeout(() => {
        element.classList.remove(intensity);
        resolve();
      }, duration);
    });
  }
  
  // Fade animation
  fade(element, options = {}) {
    const {
      duration = 200,
      direction = 'out', // 'in' or 'out'
      remove = false
    } = options;
    
    return new Promise(resolve => {
      const startOpacity = direction === 'out' ? '1' : '0';
      const endOpacity = direction === 'out' ? '0' : '1';
      
      element.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
      element.style.opacity = startOpacity;
      
      // Trigger animation
      setTimeout(() => {
        element.style.opacity = endOpacity;
        if (direction === 'out') {
          element.style.transform = 'translateY(4px) scale(0.95)';
        }
      }, 10);
      
      setTimeout(() => {
        element.style.transition = '';
        if (remove && direction === 'out') {
          try { element.remove(); } catch {}
        }
        resolve();
      }, duration);
    });
  }
}

// Export singleton instance
export const animationScheduler = new AnimationScheduler();

// Convenience exports
export const slideToken = (element, toCol, toRow, options) => 
  animationScheduler.slideToken(element, toCol, toRow, options);

export const slideTokenPath = (element, path, options) => 
  animationScheduler.slideTokenPath(element, path, options);

export const shakeToken = (element, options) => 
  animationScheduler.shakeToken(element, options);

export const fadeElement = (element, options) => 
  animationScheduler.fade(element, options);
