import React from 'react';
import { useMultiplayerGameStore } from '../store/multiplayerGameStore';

export const MultiplayerLobby: React.FC<{ onGameStart: () => void }> = ({ onGameStart }) => {
  const { isSearching, startSearching, cancelSearch } = useMultiplayerGameStore();

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-slate-800 rounded-lg shadow-xl">
      <h2 className="text-4xl font-bold text-white mb-2 text-center">
        👥 Online Multiplayer
      </h2>
      <p className="text-gray-400 text-center mb-8">
        Find an opponent and play in real-time
      </p>

      {!isSearching ? (
        <div className="text-center">
          <div className="mb-8 p-6 bg-slate-700 rounded-lg">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-2xl font-bold text-white mb-2">Quick Match</h3>
            <p className="text-gray-300 mb-4">
              Get matched with a random player of similar skill level
            </p>
            <p className="text-sm text-gray-400">
              • Random color assignment<br />
              • Standard rules<br />
              • Real-time gameplay
            </p>
          </div>

          <button
            onClick={() => {
              startSearching();
              onGameStart();
            }}
            className="px-12 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white text-xl font-bold rounded-lg hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all shadow-lg"
          >
            Find Match
          </button>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Searching for opponent...
          </h3>
          <p className="text-gray-400 mb-6">
            This usually takes less than a minute
          </p>
          <button
            onClick={cancelSearch}
            className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all"
          >
            Cancel Search
          </button>
        </div>
      )}
    </div>
  );
};
