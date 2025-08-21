# Corruption RPG - Professional Architecture

## 🏗️ Project Structure

```
Corruption/
├── 📁 src/                          # Source code (organized professionally)
│   ├── 📁 core/                     # Core engine systems
│   │   ├── EventBus.js              # Global event system
│   │   └── GameState.js             # Centralized state management
│   │
│   ├── 📁 systems/                  # Game systems (modular)
│   │   ├── ActionSystem.js          # Spell/ability execution
│   │   ├── BossSystem.js            # Boss AI and behavior
│   │   └── TargetingSystem.js       # Clean targeting mechanics
│   │
│   ├── 📁 entities/                 # Game entities
│   │   ├── BossEntity.js            # Boss creature definitions
│   │   └── BossDeck.js              # Boss card deck system
│   │
│   ├── 📁 game/                     # Game logic
│   │   ├── Cave.js                  # Cave/dungeon management
│   │   ├── CombatManager.js         # Combat flow control
│   │   └── Overworld.js             # Overworld exploration
│   │
│   ├── 📁 ui/                       # User Interface
│   │   ├── ActionBar.js             # Action button interface
│   │   ├── BossPanel.js             # Boss information display
│   │   ├── CharacterSheet.js        # Player character UI
│   │   ├── PartyPanel.js            # Party display
│   │   └── UIManager.js             # Master UI controller
│   │
│   ├── 📁 data/                     # Game data & configuration
│   │   ├── BossCards.js             # Boss ability definitions
│   │   ├── Classes.js               # Player class definitions
│   │   ├── Config.js                # Game configuration
│   │   ├── Items.js                 # Item definitions
│   │   └── SpellRegistry.js         # Spell database
│   │
│   ├── 📁 utils/                    # Utilities & services
│   │   ├── AnimationScheduler.js    # Animation timing
│   │   ├── CueService.js            # Message system
│   │   └── RNG.js                   # Random number generation
│   │
│   ├── main.js                      # Application entry point
│   └── ModernCombatBridge.js        # Legacy compatibility layer
│
├── 📁 assets/                       # Game assets
│   ├── bear.png                     # Boss sprites
│   ├── elementalist-tide.gif        # Player animations
│   └── user___untitled_0001.gif     # UI animations
│
├── 📁 Elementalist-Flame/           # Character assets
│   └── Elementalist_Flame.gif       # Flame elementalist sprite
│
├── 📜 Legacy Files (being phased out)
│   ├── board.js                     # Board rendering (to be moved)
│   ├── buffs.js                     # Buff system (to be moved)
│   ├── combat.js                    # Legacy combat (bridged)
│   ├── controls.js                  # Input handling (to be moved)
│   ├── cues.js                      # Old cue system (deprecated)
│   ├── effects.js                   # Visual effects (to be moved)
│   ├── flash.js                     # Flash animations (utility)
│   ├── modal.js                     # Modal dialogs (to be moved)
│   ├── player_sprites.js            # Sprite management (to be moved)
│   ├── spawn.js                     # Spawn utilities (to be moved)
│   ├── spells.js                    # Legacy spells (deprecated)
│   ├── targeting.js                 # Legacy targeting (replaced)
│   └── setup_flow.js                # Setup flow (to be moved)
│
├── index.html                       # Entry HTML
├── style.css                        # Game styling
└── README.md                        # Project documentation
```

## 🎯 Architecture Benefits

### **Professional Organization**
- ✅ **Separation of Concerns**: Each folder has a clear purpose
- ✅ **Modular Design**: Systems can be developed independently  
- ✅ **Scalable Structure**: Easy to add new spells, bosses, UI components
- ✅ **Team Collaboration**: Multiple developers can work on different systems

### **Industry Standards**
- 🏢 **Folder Structure**: Matches professional indie game studios
- 📦 **Module Organization**: Clear import/export patterns
- 🔧 **Maintainability**: Easy to debug and extend
- 🧪 **Testability**: Each system can be unit tested

### **Development Workflow**
- 🚀 **Modern ES6 Modules**: Clean import/export system
- 🔄 **Hot Reloading Ready**: Structure supports modern dev tools
- 📚 **Documentation**: Clear file naming and organization
- 🛠️ **Tool Integration**: Ready for bundlers, linters, etc.

## 🎮 Current Status

**✅ Completed:**
- Core architecture reorganization
- Modern combat system with OOP
- Professional folder structure
- Legacy compatibility bridge

**🔄 Next Steps:**
- Move remaining legacy files to appropriate folders
- Update all import paths
- Add TypeScript definitions
- Implement automated testing

This structure makes it easy to add hundreds of spells, multiple bosses, and complex UI features while maintaining clean, professional code organization.
