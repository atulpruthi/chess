import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer>
      <div>
        <div className="flex flex-row gap-12 justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white/80 tracking-wide uppercase">Company</h3>
            <ul className="text-sm text-white/60">
              <li><a href="#" className="hover:text-white/90 transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-white/90 transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-white/90 transition-colors">Support</a></li>
              <li><a href="#" className="hover:text-white/90 transition-colors">About Us</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white/80 tracking-wide uppercase">Play</h3>
            <ul className="text-sm text-white/60">
              <li><Link to="/lobby" className="hover:text-white/90 transition-colors">Lobby</Link></li>
              <li><Link to="/local?mode=bot" className="hover:text-white/90 transition-colors">Play vs Bot</Link></li>
              <li><Link to="/local?mode=multiplayer" className="hover:text-white/90 transition-colors">Online Multiplayer</Link></li>
              <li><Link to="/local?mode=local" className="hover:text-white/90 transition-colors">Local Game</Link></li>
              <li><Link to="/puzzles" className="hover:text-white/90 transition-colors">Puzzles</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white/80 tracking-wide uppercase">Explore</h3>
            <ul className="text-sm text-white/60">
              <li><Link to="/leaderboard" className="hover:text-white/90 transition-colors">Leaderboard</Link></li>
              <li><Link to="/game-history" className="hover:text-white/90 transition-colors">Game History</Link></li>
              <li><Link to="/dashboard" className="hover:text-white/90 transition-colors">Dashboard</Link></li>
              <li><Link to="/tutorial" className="hover:text-white/90 transition-colors">Tutorial</Link></li>
              <li><Link to="/rules" className="hover:text-white/90 transition-colors">Chess Rules</Link></li>
              <li><Link to="/settings" className="hover:text-white/90 transition-colors">Settings</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 text-xs text-white/40">
          © 2026 Brilliant Knightz. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
