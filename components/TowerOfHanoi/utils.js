import { 
    CARD_SPAWN_MIN, 
    CARD_SPAWN_MAX, 
    RARE_CARD_CHANCE,
    MAX_CARDS 
  } from '../../lib/constants';
  import { CARDS } from './cards';
  
  let uniqueIdCounter = 0;
  export const generateUniqueId = () => {
    uniqueIdCounter++;
    return `${uniqueIdCounter}-${Date.now()}`;
  };
  
  export const generateNextSpawnMove = (currentMove) => {
    return currentMove + CARD_SPAWN_MIN + Math.floor(Math.random() * (CARD_SPAWN_MAX - CARD_SPAWN_MIN + 1));
  };
  
  export const generateRandomCard = () => {
    const availableCards = Object.values(CARDS);
    const card = availableCards[Math.floor(Math.random() * availableCards.length)];
    
    // Apply rarity check
    if (card.rarity === 'rare' && Math.random() > RARE_CARD_CHANCE) {
      // Skip rare cards based on chance
      return null;
    }
  
    return { ...card, id: Date.now() };
  };
  
  export const generateGradientColors = (diskCount, hue, isInverted = false) => {
    let colors = Array(diskCount).fill(null).map((_, index) => {
      const lightness = 65 - (index * (45 / (diskCount - 1)));
      return `hsl(${hue}, 85%, ${lightness}%)`;
    });
  
    return isInverted ? colors.reverse() : colors;
  };
  
  export const canSpawnCard = (activeCards, won) => {
    return activeCards.length < MAX_CARDS && !won;
  };
  
  export const getDiskWidth = (diskSize, minWidth, increment) => {
    return minWidth + (increment * (diskSize - 1));
  };
  
  export const getEffectClasses = (activeEffects, towerIndex, lockedTower) => {
    const classes = [];
    
    if (lockedTower === towerIndex) {
      classes.push('effect-lock');
    }
  
    activeEffects.forEach(effect => {
      if (effect.effectClass) {
        classes.push(effect.effectClass);
      }
    });
  
    return classes.join(' ');
  };
  