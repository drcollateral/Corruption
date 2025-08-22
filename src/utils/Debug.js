// Debug utilities injected into window for live inspection (F12 console).
// Focus: recently added boss deck probability + action bar tooltip context + active player issues.

import { state } from '../core/GameState.js';

function safe(fn, label){
	try { return fn(); } catch (e){ console.warn('[DBG]', label, e); return undefined; }
}

function formatDeckBreakdown(){
	const boss = state.boss;
	if (!boss) return 'No boss (state.boss is null)';
	if (!boss.getDeckBreakdown) return 'Boss has no getDeckBreakdown method';
	const deckSize = boss.deckSize?.() ?? '(n/a)';
	const discardSize = boss.discardSize?.() ?? '(n/a)';
	const breakdown = boss.getDeckBreakdown();
	if (!breakdown.length) return `EMPTY BREAKDOWN (deckSize=${deckSize}, discardSize=${discardSize})`;
	return breakdown.map(c => `${c.name}: inDeck=${c.inDeck}, inDiscard=${c.inDiscard}, total=${c.total}`).join('\n');
}

function debugBossDeck(){
	const boss = state.boss;
	const rawDeckObj = boss?.deck;
	const info = {
		hasBoss: !!boss,
		bossType: boss?.type,
		deckObjectKeys: rawDeckObj ? Object.keys(rawDeckObj) : null,
		drawPileLen: rawDeckObj?.drawPile?.length ?? null,
		discardPileLen: rawDeckObj?.discardPile?.length ?? null,
		legacyStateBossDeck: state.bossDeck ? {
			draw: state.bossDeck.drawPile.length,
			discard: state.bossDeck.discardPile.length
		} : null,
		deckSizeMethod: boss?.deckSize?.(),
		discardSizeMethod: boss?.discardSize?.(),
		breakdown: boss?.getDeckBreakdown ? boss.getDeckBreakdown() : null,
		reasonEmpty: null
	};
	if (info.hasBoss){
		if (!rawDeckObj) info.reasonEmpty = 'state.boss.deck not set (only state.bossDeck exists)';
		else if (!rawDeckObj.drawPile?.length) info.reasonEmpty = 'drawPile empty or undefined';
	} else {
		info.reasonEmpty = 'No boss entity';
	}
	console.group('[DBG] Boss Deck');
	console.table(info.breakdown || []);
	console.log(info);
	console.log('Formatted breakdown:\n' + formatDeckBreakdown());
	console.groupEnd();
	return info;
}

function currentPlayerDebug(){
	const players = state.players || [];
	const activeIdx = state.activeIdx;
	const active = players[activeIdx];
	return {
		count: players.length,
		activeIdx,
		activeId: active?.id,
		activeName: active?.name,
		turn: active?.turn,
		isPlayerTurn: state.isPlayerTurn,
		mode: state.mode
	};
}

function debugActivePlayer(){
	const info = currentPlayerDebug();
	console.group('[DBG] Active Player');
	console.log(info);
	console.table((state.players||[]).map(p=>({id:p.id,name:p.name,hp:p.hp,action:p.turn?.action,bonus:p.turn?.bonus})));
	console.groupEnd();
	return info;
}

function wireDebug(){
	// Expose helper functions
	Object.assign(window, {
		dbgBossDeck: debugBossDeck,
		dbgPlayer: debugActivePlayer,
		dbgState: () => state,
	});
	console.info('[Debug] Registered globals: dbgBossDeck(), dbgPlayer(), dbgState()');
}

if (typeof window !== 'undefined') wireDebug();
