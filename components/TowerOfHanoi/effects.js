import { EyeOff, Maximize2, Play, Shuffle, Wand } from 'lucide-react';
import { generateUniqueId } from './utils';

export const handleEffects = {
    wildcard: {
        activate: (setActiveEffects, card, activeCards, setActiveCards) => {
          // Find any negative (auto-applied) cards
          const negativeCards = activeCards.filter(c => c.isNegative);
          
          if (negativeCards.length > 0) {
            // Remove all negative cards from activeCards
            setActiveCards(prev => prev.filter(c => !c.isNegative));
            
            // Remove their effects
            setActiveEffects(prev => prev.filter(effect => 
              !negativeCards.some(card => card.id === effect.id)
            ));
          } else {
            // If no negative cards, remove the most recently spawned card
            const mostRecentCard = activeCards
              .filter(c => c.id !== card.id && c.name !== 'Wild Card') // Exclude wildcards
              .reduce((latest, current) => 
                !latest || current.id > latest.id ? current : latest
              , null);

            if (mostRecentCard) {
              setActiveCards(prev => prev.filter(c => c.id !== mostRecentCard.id));
              setActiveEffects(prev => prev.filter(effect => effect.id !== mostRecentCard.id));
            }
          }

          // Remove the wildcard itself after use
          setActiveCards(prev => prev.filter(c => c.id !== card.id));
        },
        icon: Wand,
        effectClass: 'effect-wildcard'
      },
  giant: {
    apply: () => true,
    activate: (setActiveEffects, card) => {
      setActiveEffects(prev => [...prev, { ...card, id: 'giant', movesLeft: 1 }]);
    },
    icon: Maximize2,
    effectClass: 'effect-giant'
  },

  timewarp: {
    apply: (towers) => {
      const findOptimalMove = (currentTowers) => {
        const goalTower = 2;
        const sourceTowers = [0, 1];
        
        // Try to move directly to goal if possible
        for (let fromTower of sourceTowers) {
          if (currentTowers[fromTower].length === 0) continue;
          const disk = currentTowers[fromTower][currentTowers[fromTower].length - 1];
          if (!currentTowers[goalTower].length || disk < currentTowers[goalTower][currentTowers[goalTower].length - 1]) {
            return { fromTower, toTower: goalTower };
          }
        }

        // If can't move to goal, move to intermediate tower
        if (currentTowers[0].length && (!currentTowers[1].length || 
            currentTowers[0][currentTowers[0].length - 1] < currentTowers[1][currentTowers[1].length - 1])) {
          return { fromTower: 0, toTower: 1 };
        }
        
        return { fromTower: 1, toTower: 0 };
      };

      return findOptimalMove(towers);
    },
    activate: (setTowers, towers) => {
      let currentTowers = JSON.parse(JSON.stringify(towers));
      
      // Execute 3 optimal moves
      for (let i = 0; i < 3; i++) {
        const move = handleEffects.timewarp.apply(currentTowers);
        if (move && move.fromTower !== move.toTower && currentTowers[move.fromTower].length > 0) {
          const disk = currentTowers[move.fromTower].pop();
          if (!currentTowers[move.toTower].length || disk < currentTowers[move.toTower][currentTowers[move.toTower].length - 1]) {
            currentTowers[move.toTower].push(disk);
          }
        }
      }
      
      setTowers(currentTowers);
    }
  },

  invert: {
    apply: () => false,
    activate: (setActiveEffects, card, setIsGradientInverted, setGradientColors) => {
      // Generate new random colors
      const newHue = Math.floor(Math.random() * 360);
      setGradientColors(prev => {
        const colors = prev.map((_, index) => {
          const lightness = 65 - (index * (45 / (prev.length - 1)));
          return `hsl(${newHue}, 85%, ${lightness}%)`;
        });
        return colors;
      });
      setActiveEffects(prev => [...prev, { ...card, movesLeft: card.duration }]);
    }
  },

  scramble: {
    apply: () => false,
    activate: (setActiveEffects, card, setTowers, towers) => {
      const allDisks = towers.flat();
      const newTowers = [[], [], []];
      
      // Shuffle the disks
      for (let i = allDisks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allDisks[i], allDisks[j]] = [allDisks[j], allDisks[i]];
      }
      
      // Distribute disks back to towers
      allDisks.sort((a, b) => b - a);
      for (const disk of allDisks) {
        const validTowers = newTowers
          .map((tower, index) => ({ tower, index }))
          .filter(({ tower }) => tower.length === 0 || tower[tower.length - 1] > disk);
        
        if (validTowers.length > 0) {
          const randomTower = validTowers[Math.floor(Math.random() * validTowers.length)];
          newTowers[randomTower.index].push(disk);
        }
      }
      
      setTowers(newTowers);
      setActiveEffects(prev => [...prev, { ...card, movesLeft: card.duration }]);
    }
  },

  lock: {
    apply: () => false,
    activate: (setActiveEffects, card, setLockedTower) => {
      const randomTower = Math.floor(Math.random() * 3);
      setLockedTower(randomTower);
      setActiveEffects(prev => [...prev, { ...card, movesLeft: card.duration }]);
    }
  },

  double: {
    apply: () => false,
    activate: (setActiveEffects, card, setDoubleMovePending) => {
      setDoubleMovePending(true);
      setActiveEffects(prev => [...prev, { ...card, movesLeft: card.duration }]);
    },
    icon: Play,
    effectClass: 'effect-double'
  },

  towerswap: {
    apply: () => false,
    activate: (setActiveEffects, card, setTowers, towers) => {
      const pos1 = Math.floor(Math.random() * 3);
      let pos2 = Math.floor(Math.random() * 2);
      pos2 = pos2 >= pos1 ? pos2 + 1 : pos2;
      
      setTowers(prev => {
        const newTowers = [...prev];
        [newTowers[pos1], newTowers[pos2]] = [newTowers[pos2], newTowers[pos1]];
        return newTowers;
      });
      setActiveEffects(prev => [...prev, { ...card, movesLeft: card.duration }]);
    }
  },

  blind: {
    apply: () => false,
    activate: (setActiveEffects, card, setBlindMode) => {
      setBlindMode(true);
      setActiveEffects(prev => [...prev, { ...card, movesLeft: card.duration }]);
    }
  }
};

export const isValidMove = (towers, fromTower, toTower, activeEffects) => {
  if (fromTower === toTower) return false;
  if (!towers[fromTower].length) return false;
  
  // If giant mode is active, allow any move
  if (activeEffects.some(effect => effect.id === 'giant')) {
    return true;
  }
  
  const sourceDisk = towers[fromTower][towers[fromTower].length - 1];
  const targetDisk = towers[toTower][towers[toTower].length - 1];
  
  return !targetDisk || sourceDisk < targetDisk;
};

const generateRandomCard = () => {
    const availableCards = Object.values(CARDS);
    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const card = availableCards[randomIndex];
  
    // Always create a new card object with a truly unique ID
    const newCard = { ...card, id: generateUniqueId() };
  
    if (card.name === 'Wild Card') {
      return newCard;
    }
  
    if (card.rarity === 'rare' && Math.random() > RARE_CARD_CHANCE) {
      return generateRandomCard();
    }
  
    return newCard;
};