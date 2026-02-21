import { StrictMode, lazy, Suspense } from 'react'
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
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route 
          path="/auth" 
          element={!isAuthenticated ? <AuthPage /> : <Navigate to="/lobby" replace />} 
        />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <GameLobby />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game"
          element={
            <ProtectedRoute>
              <MultiplayerGame />
            </ProtectedRoute>
          }
        />
        <Route
          path="/local"
          element={
            <ProtectedRoute>
              {new URLSearchParams(location.search).get('mode') ? (
                <App />
              ) : (
                <Navigate to="/lobby" replace />
              )}
            </ProtectedRoute>
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
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game-replay/:gameId"
          element={
            <ProtectedRoute>
              <GameReplay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game-analysis/:gameId"
          element={
            <ProtectedRoute>
              <GameAnalysis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:userId?"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
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
          element={
            <ProtectedRoute>
              <TacticalPuzzle />
            </ProtectedRoute>
          }
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
          element={
            <ProtectedRoute>
              <Tutorial />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rules"
          element={
            <ProtectedRoute>
              <ChessRules />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/lobby" : "/auth"} replace />} />
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
