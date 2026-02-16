import React from 'react';
import { useMultiplayerGameStore } from '../store/multiplayerGameStore';
import { glassCardSoftClass } from '../styles/appTheme';

export const MultiplayerLobby: React.FC<{ onGameStart: () => void }> = ({ onGameStart }) => {
  const { isSearching, startSearching, cancelSearch } = useMultiplayerGameStore();

  return (
    <div className={`w-full p-6 shadow-[0_14px_50px_rgba(0,0,0,0.45)]`}>
      <h2 className="text-[22px] font-semibold text-white mb-2 text-center">👥 Online Multiplayer</h2>
      <p className="text-white/55 text-center mb-8">Find an opponent and play in real-time</p>

      {!isSearching ? (
        <div className="text-center">
          <div className="card-lift mb-8 p-6 rounded-3xl bg-white/[0.03] backdrop-blur-xl shadow-[0_14px_50px_rgba(0,0,0,0.35)]">
            <div className="text-5xl mb-4">🎮</div>
            <h3 className="text-[20px] font-semibold text-white mb-2">Quick Match</h3>
            <p className="text-white/60 mb-4">Get matched with a random player of similar skill level</p>
            <p className="text-[14px] text-white/45 leading-relaxed">
              • Random color assignment
              <br />• Standard rules
              <br />• Real-time gameplay
            </p>
          </div>

          <button
            onClick={() => {
              startSearching();
              onGameStart();
            }}
            className="find-match-btn find-match-btn--full transition-all duration-200"
          >
            Find Match
          </button>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div> 
            <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <h3 className="text-[24px] font-bold text-white mb-2">Searching for opponent...</h3>
          <p className="text-white/60 mb-1">This usually takes less than a minute</p>
          <p className="text-white/40 text-[14px] mb-6">Looking for players near your rating</p>
          <button
            onClick={cancelSearch}
            className="px-8 py-3 bg-red-500/20 border border-red-500/30 text-red-200 font-medium rounded-xl hover:bg-red-500/30 transition-all active:scale-[0.97]"
          >
            Cancel Search
          </button>
        </div>
      )}
    </div>
  );
};
