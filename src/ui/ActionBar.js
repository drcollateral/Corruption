// /action_bar.js
// Enhanced modular action bar with data-driven tooltips (SpellRegistry / Shift-expand).
import { ATTRIBUTE_SPELLS } from "../data/SpellRegistry.js";

let wired = false;
let refs = null;
let handlers = { onMove: ()=>{}, onAction: (id)=>{}, onBonus: (id)=>{}, onEndTurn: ()=>{} };

// Advanced tooltip system ------------------------------------------------------
let actTooltipEl = null; // floating element
let shiftHeld = false;
let currentTip = null; // { element, type, data }

function ensureActionTooltip(){
  if (actTooltipEl) return actTooltipEl;
  actTooltipEl = document.createElement('div');
  actTooltipEl.id = 'action-tooltip';
  actTooltipEl.className = 'action-tooltip hidden';
  document.body.appendChild(actTooltipEl);
  window.addEventListener('keydown', (e)=>{ if (e.key === 'Shift' && !shiftHeld){ shiftHeld = true; refreshTooltip(); } });
  window.addEventListener('keyup',   (e)=>{ if (e.key === 'Shift'){ shiftHeld = false; refreshTooltip(); } });
  window.addEventListener('scroll', hideActionTooltip, true);
  return actTooltipEl;
}

function getSpellFromRegistry(spellId, player){
  if (!player || !player.classId || !player.affinity) return null;
  const table = ATTRIBUTE_SPELLS[player.classId]?.[player.affinity];
  if (!table) return null;
  for (const track of ['POW','DEF','SUP']){
    const trackTbl = table[track];
    if (!trackTbl) continue;
    for (const level of Object.keys(trackTbl)){
      const arr = trackTbl[level];
      const found = arr.find(s=>s.id===spellId);
      if (found) return { spell: found, track, level };
    }
  }
  return null;
}

function buildSpellTooltipData(spellId, player){
  // Fallback dictionary for special / simplified actions
  const fallback = {
    inferno: {
      shortDesc: 'Prime next Burn (toggle).',
      longDesc: 'Inferno (Bonus)\n\nPrimes your next Burn to: \n• Detonate instantly for its full damage (3 ticks)\n• Emit a pulse (future fire interactions)\n• See fire spells for added Inferno effects.\n\nToggle off to refund bonus action.'
    },
    burn: {
      shortDesc: 'Apply 3-turn 1 dmg DoT (stacks).',
      longDesc: 'Burn (Action)\n\nIgnites target for 1 fire damage at start of each of 3 turns.\n• Stacks: each application is an independent stack\n• No refresh on reapply (each full duration)\n• If Inferno primed: detonate immediately for 3 damage then pulse'
    }
  };
  const reg = getSpellFromRegistry(spellId, player);
  if (!reg){
    return fallback[spellId] || { shortDesc: spellId, longDesc: '' };
  }
  const { spell, track, level } = reg;
  let shortDesc = spell.desc || spell.name || spellId;
  let long = `${spell.name || spellId}`;
  if (spell.actionType === 'bonus') long += ' (Bonus)';
  long += `\n\n${spell.desc || ''}`;
  if (Array.isArray(spell.effects) && spell.effects.length){
    long += `\n\nEffects:`;
    for (const ef of spell.effects){
      if (ef.type === 'dot') long += `\n• DoT: ${ef.amount} dmg/turn for ${ef.duration} turns`;
      else if (ef.type === 'hot') long += `\n• HoT: ${ef.amount} heal/turn for ${ef.duration} turns`;
      else if (ef.type === 'equipOffhand') long += `\n• Equip Offhand: ${ef.item?.name || 'Item'} (${Object.keys(ef.item?.stats||{}).join(', ')})`;
      else long += `\n• ${ef.type}`;
    }
  }
  if (spell.tags?.length) long += `\n\nTags: ${spell.tags.join(', ')}`;
  long += `\nUnlocked: ${track} ${level}`;
  return { shortDesc, longDesc: long };
}

function buildMoveTooltipData(movementInfo){
  const remaining = movementInfo?.remaining ?? 0;
  return {
    shortDesc: `Movement remaining: ${remaining}`,
    longDesc: `Movement System\n\nRolled: ${movementInfo?.rolled ?? '—'}\nUsed: ${movementInfo?.used ?? 0}\nRemaining: ${remaining}\n\nDiagonal rule (D&D 3.5 alt):\n• 1st diagonal costs 1\n• 2nd diagonal costs 2 (alternating)`
  };
}

function showActionTooltip(el, type, context){
  ensureActionTooltip();
  let data = null;
  if (type === 'move') data = buildMoveTooltipData(context?.movementInfo);
  else if (type === 'action' || type === 'bonus'){
    const spellId = el.dataset.spellId;
    if (spellId) data = buildSpellTooltipData(spellId, context?.player);
  }
  if (!data) return;
  currentTip = { element: el, type, data };
  try { if (window.DEBUG?.is('tip')) window.DEBUG.log('tip','showActionTooltip', { type, data }); } catch {}
  refreshTooltip();
  positionTooltip(el);
  actTooltipEl.classList.remove('hidden');
}

function hideActionTooltip(){
  if (!actTooltipEl) return;
  actTooltipEl.classList.add('hidden');
  try { if (window.DEBUG?.is('tip')) window.DEBUG.log('tip','hideActionTooltip'); } catch {}
  currentTip = null;
}

function refreshTooltip(){
  if (!currentTip || !actTooltipEl) return;
  const { data } = currentTip;
  const full = shiftHeld && data.longDesc ? data.longDesc : data.shortDesc;
  try { if (window.DEBUG?.is('tip')) window.DEBUG.log('tip','refreshTooltip', { shiftHeld, hasLong: !!data.longDesc }); } catch {}
  const lines = full.split(/\n/g);
  let html = '';
  for (const line of lines){
    if (!line.trim()){ html += '<div class="tooltip-spacer"></div>'; continue; }
    if (line.startsWith('•')) html += `<div class="tooltip-bullet">${escapeHtml(line)}</div>`;
    else if (!html) html += `<div class="tooltip-title">${escapeHtml(line)}</div>`;
    else html += `<div class="tooltip-line">${escapeHtml(line)}</div>`;
  }
  if (data.longDesc && !shiftHeld) html += '<div class="tooltip-hint">Hold Shift for details</div>';
  actTooltipEl.innerHTML = html;
}

function positionTooltip(target){
  const rect = target.getBoundingClientRect();
  const el = actTooltipEl;
  el.style.left = '0px'; // reset for accurate measurement
  el.style.top = '0px';
  const tb = el.getBoundingClientRect();
  let left = rect.left + (rect.width - tb.width)/2;
  left = Math.max(8, Math.min(window.innerWidth - tb.width - 8, left));
  let top = rect.top - tb.height - 8;
  if (top < 4) top = rect.bottom + 8;
  el.style.left = left + 'px';
  el.style.top = top + 'px';
}

function escapeHtml(str){
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function mountActionBar(h){
  handlers = h || handlers;
  const bottom = document.getElementById("bottom-bar");
  if (!bottom) return;

  let root = document.getElementById("action-bar");
  if (!root){
    root = document.createElement("div");
    root.id = "action-bar";
    root.innerHTML = `
      <div class="ab-left">
        <div class="group"><span id="ab-player-hp">HP 0/0</span></div>
        <div class="group boss"><span id="ab-boss-hp">Boss 0/0</span></div>
        <div class="dots" aria-label="Action economy">
          <div class="dot action" id="dot-action" title="Action available"></div>
          <div class="dot bonus" id="dot-bonus" title="Bonus action available"></div>
        </div>
      </div>
  <div class="ab-right">
        <button id="ab-move" class="ghost">Move</button>
        <div id="ab-dyn" class="ab-dyn"></div>
        <button id="ab-end" class="primary">End Turn</button>
      </div>
    `;
    bottom.appendChild(root);
  }

  const moveBtn = /** @type {HTMLButtonElement} */(root.querySelector("#ab-move"));
  const dyn = /** @type {HTMLElement} */(root.querySelector("#ab-dyn"));
  const endBtn = /** @type {HTMLButtonElement} */(root.querySelector("#ab-end"));
  const playerHp = /** @type {HTMLElement} */(root.querySelector("#ab-player-hp"));
  const bossHp = /** @type {HTMLElement} */(root.querySelector("#ab-boss-hp"));
  const dotAction = /** @type {HTMLElement} */(root.querySelector("#dot-action"));
  const dotBonus  = /** @type {HTMLElement} */(root.querySelector("#dot-bonus"));

  if (!wired){
    moveBtn.addEventListener("click", () => handlers.onMove?.());
    endBtn.addEventListener("click", () => handlers.onEndTurn?.());
    root.addEventListener('mouseover', (e)=>{
      const btn = e.target instanceof HTMLElement ? e.target.closest('#action-bar button') : null;
      if (!btn) return;
      if (btn === moveBtn) showActionTooltip(btn, 'move', { movementInfo: lastModel?.player?.movementInfo });
      else if (btn.dataset.spellId){
        const kind = btn.classList.contains('ghost') ? 'bonus' : 'action';
        showActionTooltip(btn, kind, { player: lastModel?.player });
      }
    });
    root.addEventListener('mouseout', (e)=>{
      const to = e.relatedTarget instanceof HTMLElement ? e.relatedTarget.closest('#action-bar button') : null;
      if (!to) hideActionTooltip();
    });
    wired = true;
  }

  refs = { root, playerHp, bossHp, moveBtn, dyn, endBtn, dotAction, dotBonus };
  root.classList.remove("hidden");
}

let lastModel = null; // keep for tooltip context
export function updateActionBar(model){
  lastModel = model;
  if (!refs) return;
  refs.root.classList.toggle("hidden", !model.inCombat);
  refs.playerHp.textContent = `${model.player.name} ${model.player.hp}/${model.player.hpMax}`;
  refs.bossHp.textContent = `${model.boss.name} ${model.boss.hp}/${model.boss.hpMax}`;
  refs.moveBtn.disabled = !model.player.canMove;
  refs.endBtn.disabled = !model.player.canEndTurn;

  refs.dyn.innerHTML = '';
  const addBtn = (spell, kind) => {
    const btn = document.createElement('button');
    btn.className = kind === 'action' ? 'primary action-btn' : 'ghost bonus-btn';
    const enhanced = spell.id === 'burn' && model.player.hasInferno;
    btn.textContent = (kind === 'action' ? 'Cast: ' : 'Bonus: ') + spell.name + (enhanced ? ' 🔥' : '');
    btn.disabled = !spell.enabled;
    if (enhanced) btn.classList.add('enhanced');
    btn.dataset.spellId = spell.id;
    btn.dataset.action = spell.id; // Add for UIManager compatibility
    btn.addEventListener('click', ()=>{
      if (kind === 'action') handlers.onAction?.(spell.id); else handlers.onBonus?.(spell.id);
    });
    refs.dyn.appendChild(btn);
  };
  (model.actions||[]).forEach(a=> addBtn(a,'action'));
  (model.bonuses||[]).forEach(b=> addBtn(b,'bonus'));

  refs.dotAction.classList.toggle('empty', !(model.player.action > 0));
  refs.dotBonus.classList.toggle('empty', !(model.player.bonus > 0));
}

// Export tooltip controls for potential external uses
export { showActionTooltip as showTooltip, hideActionTooltip as hideTooltip };



