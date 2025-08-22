# Corruption

Lightweight tactical boss encounter prototype focused on clarity, fast iteration, and expandable content (classes, spells, bosses, status effects).

## Overview
Top‑down grid combat: player party vs a single scripted boss. Emphasis on readable telegraphs, deterministic movement cost, and stacking damage‐over‑time effects (e.g. Burn) with tactical detonations (Inferno).

## Current Feature Set
- Turn order with initiative roll (streamlined cue stack)
- Player turn economy: 1 Action, 1 Bonus, movement points (die‑based) using D&D 3.5 diagonal costs (first diag 5ft, second 10ft → repeating)
- Unified distance metric for targeting (dnd35 approximation) and movement path cost parity for boss + players
- Spells: Burn (stacking fixed 3‑tick DoT), Inferno (prime → converts next Burn’s ticks to immediate damage + pulse, now toggleable)
- True independent Burn stack processing (damage before tick decrement)
- Boss AI: advance / charge / swipe logic using same movement rules
- Cue system with typed categories (spell‑cast, damage, status‑effect, quick‑feedback)
- Visual layering fixes (tiles < highlights < tokens / sprites)

## Running
Static front‑end only; any static server works. Example (Python 3):
```
python -m http.server 8000
```
Navigate to: http://localhost:8000/

## Project Structure (select)
```
src/
	game/CombatManager.js    Core combat flow (turns, movement, spells)
	systems/TargetingSystem.js Range highlighting & distance metrics
	systems/BuffSystem.js     Buff/priming framework (inferno_primed, inferno)
	entities/BossEntity.js    Boss statuses & burn stack handling
	systems/EffectSystem.js   Visual / timing effects (Inferno ring, burn ticks)
	ui/                       Action bar, panels, setup flow
	data/                     Static definitions (Classes, Sprites, Config, Spells)
```

## Key Mechanics
### Movement & Range
Diagonal costs alternate 1,2,… (aggregated from D&D 3.5 5/10). Pathfinding uses cost‑aware frontier search (Dijkstra-lite). Targeting uses a matching approximation (dnd35 metric) so displayed in‑range tiles align with feasible movement math.

### Burn
Applying Burn creates an independent stack: 3 remaining ticks, 1 damage per stack each boss turn (damage first, then decrement). No upfront application damage. Multiple stacks sum simultaneously.

### Inferno
Bonus action: primes (adds inferno_primed buff). Next Burn instead of adding a stack deals the converted 3 damage immediately and triggers pulse FX, then consumes primed state. Can toggle off to refund the bonus (clamped to per‑turn max).

## Adding Content
### New Spell
1. Define in `data/SpellRegistry.js` (id, name, actionType, any scaling fields)
2. Implement cast logic in `CombatManager.js` (similar to Burn) or a dedicated module
3. Extend targeting if new AoE/shape (edit `TargetingSystem.js`)
4. Add visual effect in `EffectSystem.js` (optional)

### New Boss Ability
1. Add patterns / AI hook inside `BossEntity` or observers in `BossObservers.js`
2. If movement/charge variant: reuse cost helpers in `CombatManager` for parity
3. Provide cues for telegraph + resolution

### Status / Buff
Add definition to `BuffSystem.BUFFS`; use `addBuff`, `clearBuff`, `consumeBuff`. If duration‑based, set `defaultDuration` and let `tickBuffs` prune.

## Design Notes / Philosophy
- Single authoritative combat flow (no hidden simultaneous resolution)
- Deterministic path cost to avoid diagonal exploitation
- Stacking DoTs kept simple (fixed magnitude/duration) for predictable detonation math
- Toggleable priming for UX parity (cancel like targeting)

## Roadmap Ideas
- Additional elemental DoTs (Freeze slow, Shock chain pulse)
- Boss telegraph shapes (cones, lines) using multi‑tile highlights
- Party management (multiple players) & initiative UI enhancements
- Equipment & itemization layer
- Save/load runs

## Contributing
Open a PR: keep patches focused, include concise description + rationale. Avoid large refactors mixed with feature changes.

## License
TBD.

---
Last major update: Burn stacking + Inferno toggle + movement parity (Aug 2025).
