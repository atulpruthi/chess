import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthPage } from './components/AuthPage.tsx'
import { GameLobby } from './components/GameLobby.tsx'
import { MultiplayerGame } from './components/MultiplayerGame.tsx'
import Dashboard from './components/Dashboard.tsx'
import GameHistory from './components/GameHistory.tsx'
import Leaderboard from './components/Leaderboard.tsx'
import GameReplay from './components/GameReplay.tsx'
import GameAnalysis from './components/GameAnalysis.tsx'
import { UserProfile } from './components/UserProfile.tsx'
import AdminDashboard from './components/AdminDashboard.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { useAuthStore } from './store/authStore.ts'

const Router = () => {
  const { isAuthenticated } = useAuthStore();

  return (
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
            <App />
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
        path="/profile"
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
      <Route path="/" element={<Navigate to={isAuthenticated ? "/lobby" : "/auth"} replace />} />
    </Routes>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  </StrictMode>,
)
