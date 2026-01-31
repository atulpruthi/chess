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
    <div className="w-full max-w-4xl mx-auto p-6 bg-slate-800 rounded-lg shadow-xl">
      <h2 className="text-4xl font-bold text-white mb-2 text-center">
        🤖 Play vs Bot
      </h2>
      <p className="text-gray-400 text-center mb-8">
        Choose your difficulty and color to begin
      </p>

      {/* Difficulty Selection */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Select Difficulty</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.keys(difficultyInfo) as DifficultyLevel[]).map((difficulty) => {
            const info = difficultyInfo[difficulty];
            const isSelected = selectedDifficulty === difficulty;
            
            return (
              <button
                key={difficulty}
                onClick={() => setSelectedDifficulty(difficulty)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-white bg-slate-700 scale-105'
                    : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                }`}
              >
                <div className="text-4xl mb-2">{info.icon}</div>
                <div className={`text-lg font-bold bg-gradient-to-r ${info.color} bg-clip-text text-transparent`}>
                  {info.name}
                </div>
                <div className="text-xs text-gray-400 mt-1">{info.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Selection */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Play As</h3>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setSelectedColor('white')}
            className={`flex-1 max-w-xs p-6 rounded-lg border-2 transition-all ${
              selectedColor === 'white'
                ? 'border-white bg-slate-700 scale-105'
                : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
            }`}
          >
            <div className="text-5xl mb-2">♔</div>
            <div className="text-xl font-bold text-white">White</div>
            <div className="text-sm text-gray-400 mt-1">You move first</div>
          </button>
          
          <button
            onClick={() => setSelectedColor('black')}
            className={`flex-1 max-w-xs p-6 rounded-lg border-2 transition-all ${
              selectedColor === 'black'
                ? 'border-white bg-slate-700 scale-105'
                : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
            }`}
          >
            <div className="text-5xl mb-2">♚</div>
            <div className="text-xl font-bold text-white">Black</div>
            <div className="text-sm text-gray-400 mt-1">Bot moves first</div>
          </button>
        </div>
      </div>

      {/* Start Button */}
      <div className="flex justify-center">
        <button
          onClick={handleStartGame}
          disabled={isLoading}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xl font-bold rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
        >
          {isLoading ? 'Starting Game...' : 'Start Game'}
        </button>
      </div>
    </div>
  );
};
