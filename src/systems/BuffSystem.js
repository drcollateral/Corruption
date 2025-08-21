// /buffs.js
// Generic player buff/debuff framework with a simple registry and helper APIs.
import { state } from "../core/GameState.js";

// Buff definition contract:
// {
//   id: string,
//   name: string,
//   kind: 'buff' | 'debuff',
//   maxStacks?: number,
//   defaultDuration?: number | null, // in turns; null => infinite until consumed/cleared
// }
export const BUFFS = {
  inferno_primed: {
    id: 'inferno_primed',
    name: 'Inferno Primed',
    kind: 'buff',
    maxStacks: 1,
    defaultDuration: null, // persists until consumed
  },
  inferno: {
    id: 'inferno',
    name: 'Inferno',
    kind: 'buff',
    maxStacks: 99,
    defaultDuration: null,
  },
};

function ensureBuffs(p){ if (!p.buffs) p.buffs = []; }
function defFor(id){ return BUFFS[id] || { id, name: id, kind: 'buff', maxStacks: 99, defaultDuration: null }; }

export function getBuff(p, id){ ensureBuffs(p); return p.buffs.find(b => b.id === id) || null; }
export function hasBuff(p, id){ return !!getBuff(p, id); }

export function addBuff(p, id, { stacks = 1, duration } = {}){
  ensureBuffs(p);
  const def = defFor(id);
  const cur = getBuff(p, id);
  const maxStacks = def.maxStacks ?? 99;
  const dur = (duration !== undefined) ? duration : (def.defaultDuration ?? null);
  if (cur){
    cur.stacks = Math.min(maxStacks, (cur.stacks || 0) + stacks);
    // If duration is specified, refresh; else keep the longest
    if (dur !== undefined) cur.remaining = dur;
    return cur;
  } else {
    const entry = { id, name: def.name, kind: def.kind, stacks: Math.min(maxStacks, stacks), remaining: dur };
    p.buffs.push(entry);
    return entry;
  }
}

export function consumeBuff(p, id, amount = 1){
  ensureBuffs(p);
  const cur = getBuff(p, id);
  if (!cur) return false;
  cur.stacks = Math.max(0, (cur.stacks || 0) - amount);
  if (cur.stacks === 0){
    p.buffs = p.buffs.filter(b => b !== cur);
  }
  return true;
}

export function clearBuff(p, id){ ensureBuffs(p); p.buffs = p.buffs.filter(b => b.id !== id); }
export function clearAllBuffs(p){ p.buffs = []; }

export function tickBuffs(p){
  ensureBuffs(p);
  for (const b of p.buffs){
    if (typeof b.remaining === 'number' && b.remaining !== null){
      b.remaining -= 1;
    }
  }
  p.buffs = p.buffs.filter(b => (b.remaining === null) || (b.remaining > 0));
}

// Optional: stringify for UI tooltips
export function buffSummary(p){
  ensureBuffs(p);
  return p.buffs.map(b => `${b.name}${b.stacks>1?` x${b.stacks}`:''}${(typeof b.remaining==='number'&&b.remaining!==null)?` (${b.remaining})`:''}`);
}
