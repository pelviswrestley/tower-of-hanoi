"use client";

import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { CARDS } from './cards';
import { handleEffects, isValidMove } from './effects';
import { styles } from './animations';

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
const RARE_CARD_CHANCE = 0.3;

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

const generateRandomCard = () => {
  const availableCards = Object.values(CARDS);
  const card = availableCards[Math.floor(Math.random() * availableCards.length)];
  
  if (card.rarity === 'rare' && Math.random() > RARE_CARD_CHANCE) {
    return null;
  }

  return { ...card, id: Date.now() };
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

  // Game logic
  const moveDisk = useCallback((fromTower, toTower, isSecondMove = false) => {
    // Auto-apply pending negative card if exists
    if (negativeCardPending) {
      activateCard(negativeCardPending);
      setNegativeCardPending(null);
      return false;
    }
    
    if (fromTower === toTower) return false;
    if (lockedTower === toTower || lockedTower === fromTower) {
      // Tower lock effect should last until the next move
      setLockedTower(null);
      return false;
    }

    // Check if any active effects allow the move
    const effectAllowsMove = activeEffects.some(effect => 
      handleEffects[effect.id]?.apply(towers, fromTower, toTower)
    );

    if (!effectAllowsMove && !isValidMove(towers, fromTower, toTower, activeEffects)) {
        return false;
      }
  
      setTowers(prev => {
        const newTowers = prev.map(tower => [...tower]);
        const disk = newTowers[fromTower].pop();
        newTowers[toTower].push(disk);
        return newTowers;
      });
      
      // Only increment moves if it's not the second move of a double move
      if (!isSecondMove) {
        setMoves(m => m + 1);
        
        // Check if this move should clear blind mode
        if (blindMode) {
          setActiveEffects(prev => {
            const updatedEffects = prev.map(effect => ({
              ...effect,
              movesLeft: effect.id === 'blind' ? effect.movesLeft - 1 : effect.movesLeft
            })).filter(effect => effect.movesLeft > 0);
  
            if (!updatedEffects.some(e => e.id === 'blind')) {
              setBlindMode(false);
            }
  
            return updatedEffects;
          });
        }
      }
      
      return true;
  }, [towers, lockedTower, activeEffects, negativeCardPending, blindMode]);

  const handleTowerClick = (towerIndex) => {
    // Check for any negative cards first
    const negativeCard = activeCards.find(card => card.isNegative);
    if (negativeCard) {
      activateCard(negativeCard);
      return;
    }

    if (selectedTower === null) {
      if (towers[towerIndex].length > 0) {
        setSelectedTower(towerIndex);
        
        if (doubleMovePending && towers[towerIndex].length >= 2) {
          setSelectedDisks([towers[towerIndex].length - 1, towers[towerIndex].length - 2]);
        }
      }
    } else {
      const moveSuccessful = moveDisk(selectedTower, towerIndex);
      if (moveSuccessful && doubleMovePending) {
        if (towers[selectedTower].length > 0) {
          moveDisk(selectedTower, towerIndex, true);
        }
        setDoubleMovePending(false);
        setSelectedDisks([]);
      }
      setSelectedTower(null);
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
      const effect = {
        ...card,
        id: cardType.replace('_mode', ''),
        movesLeft: card.duration
      };
  
      // Auto-apply negative cards and invert
      if (card.isNegative || cardType === 'color_invert') {
        switch (cardType) {
          case 'tower_lock':
            handleEffects.lock.activate(setActiveEffects, effect, setLockedTower);
            // Tower lock effect should last until the next move
            setLockedTower(Math.floor(Math.random() * 3));
            break;
          case 'tower_swap':
            // Display a card pop-up to alert the user
            alert(`The Tower Swap card has been activated! Two towers will be randomly swapped.`);
            handleEffects.towerswap.activate(setTowers, towers);
            break;
          case 'color_invert':
            handleEffects.invert.activate(setActiveEffects, effect, setIsGradientInverted);
            // Invert effect should only last for 3 moves
            effect.movesLeft = 3;
            break;
          case 'blind_move':
            handleEffects.blind.activate(setActiveEffects, effect, setBlindMode);
            break;
        }
        setActiveCards(prev => prev.filter(c => c.id !== card.id));
        return;
      }
  
      // Handle other cards normally
      switch (cardType) {
        case 'giant_mode':
          handleEffects.giant.activate(setActiveEffects, effect);
          break;
        case 'time_warp':
          handleEffects.timewarp.activate(setTowers, towers);
          break;
        case 'double_move':
          handleEffects.double.activate(setActiveEffects, effect, setDoubleMovePending);
          break;
        case 'scramble':
          handleEffects.scramble.activate(setTowers, towers);
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
              ${lockedTower === towerIndex ? 'opacity-50' : ''}
              ${blindMode && selectedTower === towerIndex ? 'ring-2 ring-white ring-opacity-50' : ''}`}
            style={{ maxWidth: getMaxDiskWidth() }}
          >
            {/* Tower Rod */}
            <div 
              className="absolute bottom-2 w-2 rounded-t-lg transition-all duration-300"
              style={{ 
                height: towerHeight,
                backgroundColor: blindMode && selectedTower === towerIndex 
                  ? '#ffffff'
                  : 'currentColor',
                opacity: blindMode 
                  ? (selectedTower === towerIndex ? 1 : 0.2)
                  : 0.2
              }}
            />

            {/* Goal Marker */}
            {towerIndex === 2 && (
              <div 
                className="absolute text-gray-400"
                style={{
                  bottom: 2,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  opacity: 0.2
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

  {/* Cards Area - Fixed height container */}
  <div className="h-[200px] flex items-center justify-center">
    {activeCards.length > 0 && (
      <div className="flex justify-center gap-4">
        {activeCards.map(card => {
          if (!card.icon) return null;
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => card.isNegative ? setNegativeCardPending(card) : activateCard(card)}
              className={`relative flex flex-col items-center justify-between p-4 
                border border-gray-400/20 rounded-lg animate-scale-in 
                ${card.color} hover:bg-white/5 transition-colors`}
              style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT
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
                <div className="font-medium text-gray-200 mb-1">{card.name}</div>
                <div className="font-mono text-xs text-gray-400">{card.description}</div>
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