import React, { useState } from 'react';
import { useBotGameStore, type DifficultyLevel } from '../store/botGameStore';

interface BotSelectionProps {
  onStartGame: () => void;
}

const difficultyInfo = {
  easy: {
    name: 'Easy',
    description: 'Perfect for beginners',
    color: 'from-green-600 to-emerald-600',
    icon: '🐢',
  },
  medium: {
    name: 'Medium',
    description: 'Good challenge for intermediate players',
    color: 'from-blue-600 to-cyan-600',
    icon: '🦊',
  },
  hard: {
    name: 'Hard',
    description: 'For advanced players',
    color: 'from-orange-600 to-red-600',
    icon: '🦁',
  },
  expert: {
    name: 'Expert',
    description: 'Maximum strength - good luck!',
    color: 'from-purple-600 to-pink-600',
    icon: '🐉',
  },
};

export const BotSelection: React.FC<BotSelectionProps> = ({ onStartGame }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('medium');
  const [selectedColor, setSelectedColor] = useState<'white' | 'black'>('white');
  const [isLoading, setIsLoading] = useState(false);
  const createGame = useBotGameStore((state) => state.createGame);

  const handleStartGame = async () => {
    setIsLoading(true);
    try {
      await createGame(selectedDifficulty, selectedColor);
      onStartGame();
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('Failed to start game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card card-lift text-[15px] leading-[1.5]">
      <div className="text-center mb-6">
        <h2 className="text-white font-bold">🤖 Play vs Bot</h2>
        <p>Choose your difficulty and color to begin</p>
      </div>

      {/* Difficulty Selection */}
      <div className="mb-6">
        <label className="block text-white/80 mb-3 font-medium">Difficulty</label>
        <div className="time-controls">
          {(Object.keys(difficultyInfo) as DifficultyLevel[]).map((difficulty) => {
            const info = difficultyInfo[difficulty];
            const isSelected = selectedDifficulty === difficulty;

            return (
              <button
                key={difficulty}
                type="button"
                onClick={() => setSelectedDifficulty(difficulty)}
                className={`time-card ${isSelected ? 'active' : ''}`}
                aria-pressed={isSelected}
              >
                <h4 className="text-white font-semibold">
                  {info.icon} {info.name}
                </h4>
                <span>{info.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Selection */}
      <div className="mb-6">
        <label className="block text-white/80 mb-3 font-medium">Play as</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setSelectedColor('white')}
            className={`time-card ${selectedColor === 'white' ? 'active' : ''}`}
            aria-pressed={selectedColor === 'white'}
          >
            <h4 className="text-white font-semibold">♔ White</h4>
            <span>You move first</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedColor('black')}
            className={`time-card ${selectedColor === 'black' ? 'active' : ''}`}
            aria-pressed={selectedColor === 'black'}
          >
            <h4 className="text-white font-semibold">♚ Black</h4>
            <span>Bot moves first</span>
          </button>
        </div>
      </div>

      {/* Start Button */}
      <div className="mt-5 flex justify-center" style={{ marginTop: '20px' }}>
        
          <button
            onClick={handleStartGame}
            disabled={isLoading}
            className="find-match-btn transition-all duration-200 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Starting Game…' : 'Start Game'}
          </button>
        
      </div>
    </div>
  );
};
