// /boss_sprites.js
// Registry of boss sprite configurations

export const BOSS_SPRITES = {
  bear: {
  image: 'assets/ui/boss-animation.gif',
  size: '80% 100%',
  position: 'center bottom', // anchor feet to tile bottom so effects align
    transparent: true,
    hideLabel: true,
    zIndex: 10,
    overflow: 'visible',
  // Keep sprite layer non-interactive so token remains clickable
  pointerEvents: 'none',
  // Slightly smaller layer bounds to avoid blocking neighbors
  layerWidth: '140%',
  layerHeight: '100%'
  },
  
  // Future bosses can be added here:
  // dragon: {
  //   image: 'assets/dragon.png',
  //   size: '100% 100%',
  //   position: 'center bottom',
  //   transparent: true,
  //   hideLabel: true,
  //   zIndex: 10,
  //   overflow: 'visible'
  // },
  
  // goblin: {
  //   image: 'assets/goblin.png',
  //   size: '70% 70%',
  //   position: 'center center',
  //   transparent: true,
  //   hideLabel: false, // Show label for smaller bosses
  //   zIndex: 10
  // }
};

export function getBossSprite(bossType) {
  return BOSS_SPRITES[bossType] || null;
}
