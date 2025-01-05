"use client";

import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { CARDS } from './cards';
import { handleEffects, isValidMove } from './effects';
import { styles } from './animations';
import { generateUniqueId } from './utils';
import { formatMoves } from './utils';

// Constants
const DISK_HEIGHT = 48;
const MIN_DISK_WIDTH = 48;
const WIDTH_INCREMENT = 32;
const BASE_TOWER_SPACING = 40;
const MAX_DISKS = 9;
const MIN_DISKS = 3;
const MAX_CARDS = 3;
const CARD_HEIGHT = 160;
const CARD_WIDTH = 120;
const CARD_SPAWN_MIN = 4;
const CARD_SPAWN_MAX = 6;
const RARE_CARD_CHANCE = 0.5;

// Utility functions
const getDiskWidth = (diskSize, minWidth, increment) => {
  return minWidth + (increment * (diskSize - 1));
};

const generateGradientColors = (diskCount, hue, isInverted = false) => {
  let colors = Array(diskCount).fill(null).map((_, index) => {
    const lightness = 65 - (index * (45 / (diskCount - 1)));
    return `hsl(${hue}, 85%, ${lightness}%)`;
  });

  return isInverted ? [...colors].reverse() : colors;
};

const generateNextSpawnMove = (currentMove) => {
  return currentMove + CARD_SPAWN_MIN + 
    Math.floor(Math.random() * (CARD_SPAWN_MAX - CARD_SPAWN_MIN + 1));
};

const generateRandomRotation = () => {
  const rotations = [0, 25, 50, 75, 100];
  return rotations[Math.floor(Math.random() * rotations.length)];
};

const generateRandomCard = () => {
  const availableCards = Object.values(CARDS);
  const card = availableCards[Math.floor(Math.random() * availableCards.length)];

  // Apply rarity check
  if (card.rarity === 'rare' && Math.random() > RARE_CARD_CHANCE) {
    return null;
  }

  // Generate a random rotation for the card
  const rotation = generateRandomRotation();

  return { ...card, id: Date.now(), rotation }; // Add rotation to the card object
};

const canSpawnCard = (activeCards, won) => {
  return activeCards.length < MAX_CARDS && !won;
};

export default function TowerOfHanoi() {
  // Base game state
  const [diskCount, setDiskCount] = useState(MIN_DISKS);
  const [towers, setTowers] = useState(() => [
    Array.from({ length: MIN_DISKS }, (_, i) => MIN_DISKS - i),
    [],
    []
  ]);
  const [selectedTower, setSelectedTower] = useState(null);
  const [selectedDisks, setSelectedDisks] = useState([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [gradientColors, setGradientColors] = useState([]);
  const [scale, setScale] = useState(1);
  const [draggingTower, setDraggingTower] = useState(null);
  const [towerHeight, setTowerHeight] = useState(0);

  // Card and effect state
  const [activeCards, setActiveCards] = useState([]);
  const [activeEffects, setActiveEffects] = useState([]);
  const [nextSpawnMove, setNextSpawnMove] = useState(CARD_SPAWN_MIN);
  const [lockedTower, setLockedTower] = useState(null);
  const [isGradientInverted, setIsGradientInverted] = useState(false);
  const [doubleMovePending, setDoubleMovePending] = useState(false);
  const [blindMode, setBlindMode] = useState(false);
  const [negativeCardPending, setNegativeCardPending] = useState(null);
  const [goalGradient, setGoalGradient] = useState('linear-gradient(to top, #4f46e5, #7c3aed)');
  const [timeWarpMoves, setTimeWarpMoves] = useState(0);
  const [isTimeWarpActive, setIsTimeWarpActive] = useState(false);

  // Calculate dimensions
  const getMaxDiskWidth = () => MIN_DISK_WIDTH + (WIDTH_INCREMENT * (MAX_DISKS - 1));
  const getRequiredWidth = () => {
    const maxDiskWidth = getMaxDiskWidth();
    const totalDiskWidth = maxDiskWidth * 3;
    const totalSpacing = BASE_TOWER_SPACING * 2;
    return totalDiskWidth + totalSpacing;
  };

  // Effects
  useEffect(() => {
    setTowerHeight((diskCount + 1) * DISK_HEIGHT);
  }, [diskCount]);

  useEffect(() => {
    const updateScale = () => {
      const containerWidth = document.getElementById('game-container')?.offsetWidth || 1200;
      const requiredWidth = getRequiredWidth();
      const newScale = Math.min(1, containerWidth / requiredWidth);
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.addEventListener('touchmove', preventDefault, { passive: false });
      return () => gameContainer.removeEventListener('touchmove', preventDefault);
    }
  }, []);

  useEffect(() => {
    if (!won && moves === nextSpawnMove && canSpawnCard(activeCards, won)) {
      const newCard = generateRandomCard();
      if (newCard) {
        setActiveCards(prev => [...prev, newCard]);
      }
      setNextSpawnMove(generateNextSpawnMove(moves));
    }
  }, [moves, activeCards, won]);

  useEffect(() => {
    if (activeEffects.length > 0) {
      setActiveEffects(prev => {
        const updatedEffects = prev
          .map(effect => ({
            ...effect,
            movesLeft: effect.movesLeft - 1
          }))
          .filter(effect => effect.movesLeft > 0);

        // Clear blind mode if no blind effect remains
        if (prev.some(e => e.id === 'blind') && !updatedEffects.some(e => e.id === 'blind')) {
          setBlindMode(false);
        }
        
        // Clear invert if expired
        if (prev.some(e => e.id === 'invert' && e.movesLeft <= 1)) {
          setIsGradientInverted(false);
        }

        return updatedEffects;
      });
    }
  }, [moves]);

  useEffect(() => {
    const hue = Math.floor(Math.random() * 360);
    setGradientColors(generateGradientColors(diskCount, hue, isGradientInverted));
  }, [diskCount, isGradientInverted]);

  useEffect(() => {
    if (towers[2].length === diskCount) {
      setWon(true);
      if (diskCount < MAX_DISKS) {
        const nextDiskCount = diskCount + 1;
        setTimeout(() => {
          adjustDiskCount(nextDiskCount);
        }, 1500);
      }
    }
  }, [towers, diskCount]);

  useEffect(() => {
    const hue1 = (moves * 20) % 360;
    const hue2 = (hue1 + 40) % 360;
    setGoalGradient(`linear-gradient(to top, 
      hsl(${hue1}, 70%, 60%), 
      hsl(${hue2}, 70%, 50%)
    )`);
  }, [moves]);

  // Game logic
  const moveDisk = useCallback((fromTower, toTower, isSecondMove = false) => {
    if (fromTower === toTower) return false;
    if (lockedTower === toTower || lockedTower === fromTower) {
      return false; // Prevent moving to or from the locked tower
    }

    // Check for giant mode or other effects if necessary
    if (!isValidMove(towers, fromTower, toTower, activeEffects)) {
      return false;
    }

    setTowers(prev => {
      const newTowers = prev.map(tower => [...tower]);
      const disk = newTowers[fromTower].pop();
      newTowers[toTower].push(disk);
      return newTowers;
    });

    if (!isSecondMove) {
      // Check if Time Warp is active
      if (isTimeWarpActive) {
        setTimeWarpMoves(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            setIsTimeWarpActive(false); // Deactivate Time Warp after 3 moves
            return 0; // Reset the counter
          }
          return newCount; // Increment the Time Warp move counter
        });
      } else {
        setMoves(m => m + 1); // Increment the main move counter
      }

      // Check if tower lock is active and remove it after a move
      if (lockedTower !== null) {
        setLockedTower(null); // Unlock the tower after a move
      }

      // Handle blind mode reappearance
      if (blindMode) {
        setBlindMode(false); // Ensure disks reappear after the move
      }
    }

    return true;
  }, [towers, activeEffects, lockedTower, blindMode, isTimeWarpActive]);

  const handleTowerClick = (towerIndex) => {
    // Handle negative effects first
    const negativeCard = activeCards.find(card => card.isNegative);
    if (negativeCard) {
      activateCard(negativeCard);
      return;
    }

    // Check if we have any loaded effects
    const giantModeLoaded = activeEffects.some(effect => effect.id === 'giant');

    if (doubleMovePending) {
      if (selectedTower === null) {
        // First click - if tower has 2+ disks, select both top disks
        if (towers[towerIndex].length >= 2) {
          setSelectedTower(towerIndex);
          setSelectedDisks([
            towers[towerIndex].length - 1,  // Top disk
            towers[towerIndex].length - 2   // Second disk
          ]);
        }
      } else if (towerIndex !== selectedTower) {
        // Second click - validate the move
        const sourceDisks = [
          towers[selectedTower][towers[selectedTower].length - 1], // Top disk
          towers[selectedTower][towers[selectedTower].length - 2]  // Second disk
        ];

        const targetTopDisk = towers[towerIndex][towers[towerIndex].length - 1];

        // Check if the move is valid
        if (!targetTopDisk || (targetTopDisk && Math.max(...sourceDisks) < targetTopDisk)) {
          // Move both disks to target tower
          setTowers(prev => {
            const newTowers = prev.map(t => [...t]);
            const disk1 = newTowers[selectedTower].pop();
            const disk2 = newTowers[selectedTower].pop();
            if (disk2) newTowers[towerIndex].push(disk2);
            if (disk1) newTowers[towerIndex].push(disk1);
            return newTowers;
          });
          setMoves(m => m + 1);
          setDoubleMovePending(false);
          setSelectedTower(null);
          setSelectedDisks([]);
        }
      }
      return;
    }

    // Giant mode handling or normal move handling
    if (giantModeLoaded) {
      if (selectedTower === null) {
        if (towers[towerIndex].length > 0) {
          setSelectedTower(towerIndex);
        }
      } else if (towerIndex !== selectedTower) {
        // Giant mode allows any move
        setTowers(prev => {
          const newTowers = prev.map(t => [...t]);
          const disk = newTowers[selectedTower].pop();
          newTowers[towerIndex].push(disk);
          return newTowers;
        });
        setMoves(m => m + 1);
        setActiveEffects(prev => prev.filter(effect => effect.id !== 'giant'));
        setSelectedTower(null);
      }
      return;
    } else {
      // Normal move handling
      if (selectedTower === null) {
        if (towers[towerIndex].length > 0 && towerIndex !== lockedTower) {
          setSelectedTower(towerIndex);
        }
      } else {
        moveDisk(selectedTower, towerIndex);
        setSelectedTower(null);
      }
    }
  };

  const handleTouchStart = (e, towerIndex) => {
    if (towers[towerIndex].length === 0) return;
    setDraggingTower(towerIndex);
  };

  const handleTouchEnd = (e, towerIndex) => {
    if (draggingTower === null) return;
    if (draggingTower !== towerIndex) {
      moveDisk(draggingTower, towerIndex);
    }
    setDraggingTower(null);
  };

  const activateCard = (card) => {
    const cardType = Object.entries(CARDS).find(([_, c]) => c.name === card.name)?.[0]?.toLowerCase();

    if (cardType) {
      if (card.name === 'Wild Card') {
        const targetCard = activeCards
          .filter(c => c.id !== card.id && c.name !== 'Wild Card')
          .sort((a, b) => b.id.localeCompare(a.id))[0];

        if (targetCard) {
          setActiveCards(prev => prev.filter(c => 
            c.id !== targetCard.id && c.id !== card.id
          ));
          setActiveEffects(prev => prev.filter(effect => 
            effect.id !== targetCard.id
          ));
        }
        return;
      }

      // Handle cards that need to be "loaded" differently
      if (card.name === 'Giant Mode') {
        setActiveEffects(prev => [
          ...prev.filter(effect => effect.id !== 'giant'),
          { ...card, id: 'giant', movesLeft: 1 }
        ]);
        setActiveCards(prev => prev.filter(c => c.id !== card.id));
        return;
      }

      if (card.name === 'Double Move') {
        setDoubleMovePending(true);
        setSelectedTower(null);
        setSelectedDisks([]);
        setActiveCards(prev => prev.filter(c => c.id !== card.id));
        return;
      }

      if (card.name === 'Time Warp') {
        setIsTimeWarpActive(true); // Activate Time Warp
        setTimeWarpMoves(0); // Reset the move counter for Time Warp
        setActiveCards(prev => prev.filter(c => c.id !== card.id)); // Remove the used card
        return;
      }

      // Auto-apply cards continue to work as before
      switch (cardType) {
        case 'tower_lock':
          handleEffects.lock.activate(setActiveEffects, card, setLockedTower);
          break;
        case 'tower_swap':
          handleEffects.towerswap.activate(setActiveEffects, card, setTowers, towers);
          break;
        case 'scramble':
          handleEffects.scramble.activate(setActiveEffects, card, setTowers, towers);
          break;
        case 'color_invert':
          handleEffects.invert.activate(setActiveEffects, card, setIsGradientInverted, setGradientColors);
          break;
        case 'blind_move':
          handleEffects.blind.activate(setActiveEffects, { ...card, movesLeft: 1 }, setBlindMode);
          break;
        case 'timewarp':
          handleEffects.timewarp.activate(setTowers, towers);
          break;
      }
      
      setActiveCards(prev => prev.filter(c => c.id !== card.id));
    }
  };

  const adjustDiskCount = (newCount) => {
    if (newCount >= MIN_DISKS && newCount <= MAX_DISKS) {
      setDiskCount(newCount);
      setTowers([
        Array.from({ length: newCount }, (_, i) => newCount - i),
        [],
        []
      ]);
      resetGameState();
    }
  };

  const resetGameState = () => {
    setSelectedTower(null);
    setSelectedDisks([]);
    setMoves(0);
    setWon(false);
    setActiveCards([]);
    setActiveEffects([]);
    setIsGradientInverted(false);
    setLockedTower(null);
    setDoubleMovePending(false);
    setDraggingTower(null);
    setBlindMode(false);
    setNegativeCardPending(null);
    setNextSpawnMove(CARD_SPAWN_MIN);
  };

  const resetGame = () => {
    setTowers([
      Array.from({ length: diskCount }, (_, i) => diskCount - i),
      [],
      []
    ]);
    resetGameState();
  };

  const isValidDoubleMove = (towers, fromTower, toTower, activeEffects) => {
    if (fromTower === toTower) return false;
    if (towers[fromTower].length < 2) return false;
    
    const disk1 = towers[fromTower][towers[fromTower].length - 1];
    const disk2 = towers[fromTower][towers[fromTower].length - 2];
    const targetDisk = towers[toTower][towers[toTower].length - 1];
    
    return !targetDisk || (disk1 < targetDisk && disk2 < targetDisk);
  };

  const handleWin = () => {
    // Display the win message
    alert(`You won! Nice job!`);
    
    // Reset moves for the next level
    setMoves(0);
  };

  const addNewCard = () => {
    const newCard = generateRandomCard();
    if (newCard) {
      setActiveCards(prev => {
        // Update rotation for all visible cards
        return prev.map(card => ({
          ...card,
          rotation: generateRandomRotation() // Update rotation for existing cards
        })).concat(newCard);
      });
    }
  };

  const lockTower = (towerIndex) => {
    setLockedTower(towerIndex); // Lock the specified tower
  };

  // Ensure that unlocking the tower resets the state correctly
  const unlockTower = () => {
    setLockedTower(null); // Reset the locked tower
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen w-full p-4 bg-gray-900 text-gray-100">
      {/* Active Effects Display */}
      {activeEffects.length > 0 && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 flex gap-4">
          {activeEffects.map((effect, index) => {
            if (!effect.icon) return null;
            const Icon = effect.icon;
            return (
              <div 
                key={effect.id + index}
                className={`flex items-center gap-2 px-3 py-1 border border-gray-400/20 rounded-full animate-scale-in ${effect.color}`}
              >
                <Icon size={16} className="text-gray-200" />
                <span className="font-mono text-sm text-gray-200">
                  {effect.movesLeft > 1 ? `${effect.movesLeft}` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Game Board and Cards Container */}
      <div className="flex-1 w-full flex flex-col justify-center" style={{ minHeight: '600px' }}>
        {/* Game Board */}
        <div id="game-container" className="relative w-full max-w-[1200px] mx-auto" style={{ height: 432 }}>
          <div 
            className="absolute left-1/2 h-full"
            style={{
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: 'center center',
              width: getRequiredWidth(),
            }}
          >
            {/* Towers */}
<div className="flex flex-row justify-between h-full" style={{ gap: BASE_TOWER_SPACING }}>
  {towers.map((tower, towerIndex) => (
    <div
      key={towerIndex}
      onTouchStart={(e) => handleTouchStart(e, towerIndex)}
      onTouchEnd={(e) => handleTouchEnd(e, towerIndex)}
      onClick={() => handleTowerClick(towerIndex)}
      className={`relative flex-1 flex flex-col-reverse items-center cursor-pointer
        ${lockedTower === towerIndex ? 'opacity-10' : ''}
        ${blindMode && selectedTower === towerIndex ? 'selected-tower' : ''}
      `}
      style={{ maxWidth: getMaxDiskWidth() }}
    >
      {/* Tower Rod */}
      <div 
        className="absolute bottom-2 w-2 rounded-t-lg transition-all duration-300"
        style={{ 
          height: towerHeight,
          background: towerIndex === 2 ? goalGradient : 'currentColor',
          opacity: blindMode 
            ? (selectedTower === towerIndex ? 1 : 0.2)
            : towerIndex === 2 ? 0.5 : 0.2
        }}
      />

      {/* Goal Marker */}
      {towerIndex === 2 && (
        <div 
          className="absolute text-gray-100"
          style={{
            bottom: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: 0.5
          }}
        >
          <X size={16} />
        </div>
      )}

      {/* Disks */}
      <div className="relative flex flex-col-reverse items-center w-full">
        {tower.map((diskSize, diskIndex) => {
          const isTopDisk = diskIndex === tower.length - 1;
          const isSelected = selectedTower === towerIndex && 
            (isTopDisk || (doubleMovePending && selectedDisks.includes(diskIndex)));
          const isDragging = draggingTower === towerIndex && isTopDisk;
          
          // Get active effect classes
          const effectClasses = activeEffects
            .map(effect => effect.effectClass)
            .filter(Boolean)
            .join(' ');
          
          return (
            <div
              key={diskIndex}
              className={`relative transition-all duration-300 animate-drop ${
                isTopDisk ? effectClasses : ''
              }`}
              style={{
                width: getDiskWidth(diskSize, MIN_DISK_WIDTH, WIDTH_INCREMENT),
                height: DISK_HEIGHT,
                backgroundColor: isSelected || isDragging ? '#ffffff' : gradientColors[diskSize - 1],
                marginBottom: diskIndex === 0 ? 8 : 0,
                borderRadius: DISK_HEIGHT / 2,
                opacity: blindMode ? 0 : isDragging ? 0.5 : 1,
              }}
            />
          );
        })}
      </div>
    </div>
  ))}
</div>

{/* Ground Line */}
<div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-600/30" />
</div>
</div>

{/* Cards Area */}
<div className="h-[200px] flex items-center justify-center">
  {activeCards.length > 0 && (
    <div className="flex justify-center gap-4">
      {activeCards.map(card => {
        if (!card.icon) return null;
        const Icon = card.icon;
        const isAutoCard = card.type === 'auto'; // Check if the card is of type 'auto'
        
        return (
          <button
            key={card.id}
            onClick={() => {
              activateCard(card);
            }}
            className={`relative flex flex-col items-center justify-between p-4 
              border border-gray-400/20 rounded-lg 
              ${card.color} hover:bg-white/5 transition-colors 
              animate-scale-in animate-random-rotation`}
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              transform: `rotate(${card.rotation}deg)` // Apply the rotation
            }}
          >
            <div className="absolute top-2 right-2">
              {card.rarity === 'rare' && (
                <div className="px-2 py-0.5 text-xs font-mono text-yellow-300 bg-yellow-300/10 rounded-full">
                  RARE
                </div>
              )}
            </div>
            <Icon size={32} className="text-gray-200 mb-2" />
            <div className="text-center">
              <div className="font-medium text-white-200 mb-1">{card.name}</div>
              <div className="font-mono text-xs text-white-400">{card.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  )}
</div>
</div>

{/* Controls */}
<div className="flex items-center justify-center gap-8 py-4">
  <div className="flex items-center gap-1.5">
    {Array.from({ length: MAX_DISKS }, (_, i) => (
      <button
        key={i}
        onClick={() => adjustDiskCount(i + 1)}
        disabled={i < MIN_DISKS - 1}
        className={`w-2 h-2 rounded-full transition-all duration-200 ${
          i < diskCount 
            ? 'bg-white' 
            : i < MIN_DISKS - 1
              ? 'bg-red-500'
              : 'bg-gray-600 hover:bg-gray-500'
        }`}
        aria-label={`Set ${i + 1} disks`}
      />
    ))}
  </div>

  <div className="font-mono text-lg tracking-wider text-gray-300">
    {moves.toString().padStart(3, '0')}
  </div>

  <button 
    onClick={resetGame}
    className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800"
  >
    <RotateCcw size={20} />
  </button>
</div>

{/* Win Modal */}
{won && (
  <div 
    className="fixed inset-0 flex items-center justify-center bg-black/50 cursor-pointer z-50"
    onClick={resetGame}
  >
    <div 
      className="absolute px-8 py-4 border border-gray-400/20 rounded-lg"
      style={{
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="font-mono text-gray-400 tracking-wider text-2xl">
        NICE
      </div>
    </div>
  </div>
)}

<style jsx>{styles}</style>
</div>
);
}