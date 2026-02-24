import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';
import { soundService } from '../services/soundService';
import { useAuthStore } from '../store/authStore';
import brilliantknightzLogo from '../assets/brilliantknightz.png';
import brilliantknightzBanner from '../assets/brilliantknightzbgremoved.png';
import { IconChessboard, IconGlobe, IconMagnifier, IconPlus, IconRobot } from './icons/NavIcons';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/lobby', { replace: true });
  };
  const { 
    mode, 
    boardTheme, 
    soundEnabled, 
    animationsEnabled,
    setMode, 
    setBoardTheme, 
    toggleSound, 
    toggleAnimations 
  } = useThemeStore();

  const [volume, setVolume] = React.useState(soundService.getVolume() * 100);

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    soundService.setVolume(value / 100);
  };

  const handleSoundToggle = () => {
    toggleSound();
    soundService.setEnabled(!soundEnabled);
    if (!soundEnabled) {
      soundService.playNotification();
    }
  };

  const boardThemes = [
    { id: 'classic' as const, name: 'Classic', colors: { light: '#F0D9B5', dark: '#B58863' } },
    { id: 'modern' as const, name: 'Modern', colors: { light: '#EEEED2', dark: '#769656' } },
    { id: 'blue' as const, name: 'Blue', colors: { light: '#DEE3E6', dark: '#8CA2AD' } },
    { id: 'green' as const, name: 'Green', colors: { light: '#FFFFDD', dark: '#86A666' } },
    { id: 'purple' as const, name: 'Purple', colors: { light: '#E8E0F0', dark: '#9B7BB5' } },
  ];

  return (
    <div className="lobby-shell">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8">
        <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
          <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
          <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAuthenticated && (
              <div className="sidebar-user-avatar" style={{ fontSize: '20px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
                  : (user?.username?.[0] ?? 'U').toUpperCase()
                }
              </div>
            )}
            <button
              type="button"
              className="sidebar-user"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
              aria-label={isAuthenticated ? "Open dashboard" : "Login"}
              style={{ width: 'auto', minWidth: 'unset', maxWidth: '120px' }}
            >
              <div>
                <div className="sidebar-user-name">{isAuthenticated ? (user?.username ?? 'User') : 'Login'}</div>
                <div className="sidebar-user-hint">{isAuthenticated ? 'Dashboard' : 'Sign in'}</div>
              </div>
            </button>
          </div>
        </div>

        <div className="lobby-layout">
          <aside className="lobby-sidebar">
            <div className="lobby-sidebar-nav">
              <button onClick={() => navigate('/lobby')} className="btn-secondary sidebar-btn">
                <IconMagnifier className="nav-icon" />
                <span>Find Match</span>
              </button>
              <button onClick={() => navigate('/lobby')} className="btn-secondary sidebar-btn">
                <IconPlus className="nav-icon" />
                <span>Create Game</span>
              </button>
              <button onClick={() => navigate('/local?mode=multiplayer', { preventScrollReset: true })} className="btn-secondary sidebar-btn">
                <IconGlobe className="nav-icon" />
                <span>Online Multiplayer</span>
              </button>
              <button onClick={() => navigate('/local?mode=local', { preventScrollReset: true })} className="btn-secondary sidebar-btn">
                <IconChessboard className="nav-icon" />
                <span>Local Game</span>
              </button>
              <button onClick={() => navigate('/local?mode=bot', { preventScrollReset: true })} className="btn-secondary sidebar-btn">
                <IconRobot className="nav-icon" />
                <span>Play vs Bot</span>
              </button>
              <button onClick={() => navigate('/puzzles')} className="btn-secondary sidebar-btn">
                <span className="nav-icon text-xl">🧩</span>
                <span>Tactical Puzzles</span>
              </button>
              <button onClick={() => navigate('/tutorial')} className="btn-secondary sidebar-btn">
                <span className="nav-icon text-xl">📚</span>
                <span>Tutorial</span>
              </button>
              <button onClick={() => navigate('/rules')} className="btn-secondary sidebar-btn">
                <span className="nav-icon text-xl">📖</span>
                <span>Chess Rules</span>
              </button>
            </div>

            {isAuthenticated && (
              <div className="lobby-sidebar-footer">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-secondary sidebar-btn sidebar-btn--logout"
                >
                  <span>Logout</span>
                </button>
              </div>
            )}
          </aside>

          <main className="lobby-main">
        {/* Header */}
        <header className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[30px] font-extrabold">⚙️ Settings</div>
              <div className="text-slate-500 text-sm mt-2">Customize your chess experience</div>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {/* Appearance Settings */}
          <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl px-10 py-12 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
            <div className="text-[15px] font-semibold tracking-[0.22em] text-white/60 mb-2">APPEARANCE</div>
            <div className="h-px bg-white/10 mt-6 mb-10" />
            
            {/* Theme Mode */}
            <div className="mb-9">
              <div className="text-xl font-medium text-white/80 mb-4">Color Mode</div>
              <div className="flex gap-4">
                <button
                  onClick={() => setMode('light')}
                  className={`flex-1 h-14 px-6 rounded-2xl font-semibold transition-all active:scale-[0.97] ${
                    mode === 'light'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_10px_22px_rgba(59,130,246,0.25)]'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  ☀️ Light Mode
                </button>
                <button
                  onClick={() => setMode('dark')}
                  className={`flex-1 h-14 px-6 rounded-2xl font-semibold transition-all active:scale-[0.97] ${
                    mode === 'dark'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_10px_22px_rgba(59,130,246,0.25)]'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  🌙 Dark Mode
                </button>
              </div>
            </div>

            {/* Board Theme */}
            <div>
              <div className="text-xl font-medium text-white/80 mb-4">Board Theme</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {boardThemes.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => setBoardTheme(theme.id)}
                    className={`p-4 rounded-2xl transition-all active:scale-[0.97] ${
                      boardTheme === theme.id
                        ? 'ring-2 ring-blue-500 bg-white/10'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="mb-3 grid grid-cols-2 h-16 rounded-lg overflow-hidden shadow-lg">
                      <div style={{ backgroundColor: theme.colors.light }} />
                      <div style={{ backgroundColor: theme.colors.dark }} />
                      <div style={{ backgroundColor: theme.colors.dark }} />
                      <div style={{ backgroundColor: theme.colors.light }} />
                    </div>
                    <div className="text-sm font-semibold text-white/90">{theme.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sound Settings */}
          <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl px-10 py-12 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
            <div className="text-[15px] font-semibold tracking-[0.22em] text-white/60 mb-2">SOUND</div>
            <div className="h-px bg-white/10 mt-6 mb-10" />
            
            {/* Sound Toggle */}
            <div className="mb-9 flex items-center justify-between">
              <div>
                <div className="text-xl font-medium text-white/90">Sound Effects</div>
                <div className="text-sm text-white/50 mt-1">
                  Play sounds for moves, captures, and game events
                </div>
              </div>
              <button
                onClick={handleSoundToggle}
                className={`relative w-16 h-9 rounded-full transition-all ${
                  soundEnabled ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_4px_14px_rgba(16,185,129,0.4)]' : 'bg-white/10'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-7 h-7 bg-white rounded-full transition-transform shadow-lg ${
                    soundEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Volume Slider */}
            {soundEnabled && (
              <div>
                <div className="text-base font-medium text-white/80 mb-4">
                  Volume: {volume}%
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer mb-6"
                  style={{
                    background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${volume}%, rgba(255, 255, 255, 0.1) ${volume}%, rgba(255, 255, 255, 0.1) 100%)`
                  }}
                />
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => soundService.playMove()}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium border border-white/10 transition-all active:scale-[0.97]"
                  >
                    🎵 Move
                  </button>
                  <button
                    onClick={() => soundService.playCapture()}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium border border-white/10 transition-all active:scale-[0.97]"
                  >
                    ⚔️ Capture
                  </button>
                  <button
                    onClick={() => soundService.playCheck()}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium border border-white/10 transition-all active:scale-[0.97]"
                  >
                    ⚠️ Check
                  </button>
                  <button
                    onClick={() => soundService.playCheckmate()}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium border border-white/10 transition-all active:scale-[0.97]"
                  >
                    👑 Checkmate
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Animation Settings */}
          <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl px-10 py-12 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
            <div className="text-[15px] font-semibold tracking-[0.22em] text-white/60 mb-2">ANIMATIONS</div>
            <div className="h-px bg-white/10 mt-6 mb-10" />
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-medium text-white/90">Piece Animations</div>
                <div className="text-sm text-white/50 mt-1">
                  Smooth animations when pieces move
                </div>
              </div>
              <button
                onClick={toggleAnimations}
                className={`relative w-16 h-9 rounded-full transition-all ${
                  animationsEnabled ? 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-[0_4px_14px_rgba(168,85,247,0.4)]' : 'bg-white/10'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-7 h-7 bg-white rounded-full transition-transform shadow-lg ${
                    animationsEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl px-10 py-12 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
            <div className="text-[15px] font-semibold tracking-[0.22em] text-white/60 mb-2">KEYBOARD SHORTCUTS</div>
            <div className="h-px bg-white/10 mt-6 mb-10" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/80 font-medium">Flip board</span>
                <kbd className="px-3 py-2 bg-white/10 rounded-lg font-mono text-sm border border-white/20">F</kbd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/80 font-medium">New game</span>
                <kbd className="px-3 py-2 bg-white/10 rounded-lg font-mono text-sm border border-white/20">Ctrl+N</kbd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/80 font-medium">Undo move</span>
                <kbd className="px-3 py-2 bg-white/10 rounded-lg font-mono text-sm border border-white/20">Ctrl+Z</kbd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/80 font-medium">Redo move</span>
                <kbd className="px-3 py-2 bg-white/10 rounded-lg font-mono text-sm border border-white/20">Ctrl+Y</kbd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/80 font-medium">Previous move</span>
                <kbd className="px-3 py-2 bg-white/10 rounded-lg font-mono text-sm border border-white/20">←</kbd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/80 font-medium">Next move</span>
                <kbd className="px-3 py-2 bg-white/10 rounded-lg font-mono text-sm border border-white/20">→</kbd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/80 font-medium">First move</span>
                <kbd className="px-3 py-2 bg-white/10 rounded-lg font-mono text-sm border border-white/20">Home</kbd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/80 font-medium">Last move</span>
                <kbd className="px-3 py-2 bg-white/10 rounded-lg font-mono text-sm border border-white/20">End</kbd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/80 font-medium">Analyze game</span>
                <kbd className="px-3 py-2 bg-white/10 rounded-lg font-mono text-sm border border-white/20">Ctrl+A</kbd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/80 font-medium">Resign</span>
                <kbd className="px-3 py-2 bg-white/10 rounded-lg font-mono text-sm border border-white/20">Ctrl+Shift+R</kbd>
              </div>
            </div>
          </div>
        </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;
