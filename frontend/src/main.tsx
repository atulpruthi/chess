import { StrictMode, lazy, Suspense, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './index.css'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { useAuthStore } from './store/authStore.ts'
import { registerServiceWorker } from './services/sw-registration'

// Lazy load all route components for better performance
const App = lazy(() => import('./App.tsx'))
const AuthPage = lazy(() => import('./components/AuthPage.tsx').then(module => ({ default: module.AuthPage })))
const GameLobby = lazy(() => import('./components/GameLobby.tsx').then(module => ({ default: module.GameLobby })))
const MultiplayerGame = lazy(() => import('./components/MultiplayerGame.tsx').then(module => ({ default: module.MultiplayerGame })))
const Dashboard = lazy(() => import('./components/Dashboard.tsx'))
const GameHistory = lazy(() => import('./components/GameHistory.tsx'))
const Leaderboard = lazy(() => import('./components/Leaderboard.tsx'))
const GameReplay = lazy(() => import('./components/GameReplay.tsx'))
const GameAnalysis = lazy(() => import('./components/GameAnalysis.tsx'))
const UserProfile = lazy(() => import('./components/UserProfile.tsx').then(module => ({ default: module.UserProfile })))
const AdminDashboard = lazy(() => import('./components/AdminDashboard.tsx'))
const TacticalPuzzle = lazy(() => import('./components/TacticalPuzzle.tsx'))
const Settings = lazy(() => import('./components/Settings.tsx'))
const Tutorial = lazy(() => import('./components/Tutorial.tsx'))
const ChessRules = lazy(() => import('./components/ChessRules.tsx'))

// Loading fallback component
const LoadingFallback = () => (
  <div className="lobby-shell flex items-center justify-center">
    <div className="text-white text-xl animate-pulse">Loading...</div>
  </div>
)

const Router = () => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/auth') {
      sessionStorage.setItem(
        'auth:returnTo',
        `${location.pathname}${location.search}${location.hash ?? ''}`
      );
    }
  }, [location.pathname, location.search, location.hash]);

  const resolveReturnTo = (state: unknown): string | null => {
    if (!state || typeof state !== 'object') return null;
    const maybeState = state as { from?: unknown };
    const from = maybeState.from;

    if (!from) return null;
    if (typeof from === 'string') return from;
    if (typeof from === 'object') {
      const fromLoc = from as { pathname?: unknown; search?: unknown; hash?: unknown };
      if (typeof fromLoc.pathname !== 'string') return null;
      const search = typeof fromLoc.search === 'string' ? fromLoc.search : '';
      const hash = typeof fromLoc.hash === 'string' ? fromLoc.hash : '';
      return `${fromLoc.pathname}${search}${hash}`;
    }

    return null;
  };

  // Determine default redirect based on user role
  const getDefaultRedirect = () => {
    if (!isAuthenticated) return '/auth';
    return user?.role === 'admin' ? '/admin' : '/lobby';
  };

  const getPostAuthRedirect = () => {
    const fromState = resolveReturnTo(location.state);
    const stored = sessionStorage.getItem('auth:returnTo');
    const target = fromState ?? stored;
    if (target && !target.startsWith('/auth')) return target;
    return getDefaultRedirect();
  };

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route 
          path="/auth" 
          element={!isAuthenticated ? <AuthPage /> : <Navigate to={getPostAuthRedirect()} replace />} 
        />
        <Route
          path="/lobby"
          element={<GameLobby />}
        />
        <Route
          path="/game"
          element={<MultiplayerGame />}
        />
        <Route
          path="/local"
          element={
            new URLSearchParams(location.search).get('mode') ? (
              <App />
            ) : (
              <Navigate to="/lobby" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game-history"
          element={
            <ProtectedRoute>
              <GameHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={<Leaderboard />}
        />
        <Route
          path="/game-replay/:gameId"
          element={<GameReplay />}
        />
        <Route
          path="/game-analysis/:gameId"
          element={<GameAnalysis />}
        />
        <Route
          path="/profile/:userId?"
          element={<UserProfile />}
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/puzzles"
          element={<TacticalPuzzle />}
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tutorial"
          element={<Tutorial />}
        />
        <Route
          path="/rules"
          element={<ChessRules />}
        />
        <Route path="/" element={<Navigate to="/lobby" replace />} />
      </Routes>
    </Suspense>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  </StrictMode>,
)

// Register service worker for PWA functionality
registerServiceWorker();
