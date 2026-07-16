import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Dashboard } from './components/Dashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { WhiteboardCanvas } from './canvas/WhiteboardCanvas';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { Minimap } from './components/Minimap';
import { globalBoardStore } from './crdt/boardStore';

import { SearchPage } from './components/SearchPage';
import { Marketplace } from './components/Marketplace';

import { AuthProvider } from './components/AuthContext';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { VerifyEmail } from './components/VerifyEmail';
import { VerifyCode } from './components/VerifyCode';
import { Profile } from './components/Profile';

import { fetchAndApplyTemplate } from './utils/templateHelper';
import { ShortcutProvider } from './context/ShortcutContext';

// Board Canvas Workspace Wrapper
const BoardWorkspace: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();

  useEffect(() => {
    if (boardId) {
      // Connect whiteboard sync session using the Board UUID
      // Automatically generate a collaborative username
      const username = 'User-' + Math.random().toString(36).substr(2, 4);
      globalBoardStore.initRoom(boardId, username);

      // Apply URL template parameter if present
      const params = new URLSearchParams(window.location.search);
      const templateId = params.get('template');
      if (templateId) {
        setTimeout(() => {
          fetchAndApplyTemplate(templateId, globalBoardStore);
        }, 800);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    return () => {
      globalBoardStore.destroy();
    };
  }, [boardId]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      {/* Main Collaborative Spatial Canvas */}
      <WhiteboardCanvas />

      {/* Control Panels */}
      <TopBar />
      <Toolbar />
      <Minimap />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ShortcutProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify-code" element={<VerifyCode />} />
            
            {/* Protected Dashboard Route */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            {/* Protected Profile Route */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />

            {/* Protected Whiteboard Board Route */}
            <Route 
              path="/board/:boardId" 
              element={
                <ProtectedRoute>
                  <BoardWorkspace />
                </ProtectedRoute>
              } 
            />

            {/* Global Search Route */}
            <Route 
              path="/search" 
              element={
                <ProtectedRoute>
                  <SearchPage />
                </ProtectedRoute>
              } 
            />

            {/* Community Marketplace Route */}
            <Route 
              path="/marketplace" 
              element={
                <ProtectedRoute>
                  <Marketplace />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Router>
      </ShortcutProvider>
    </AuthProvider>
  );
};

export default App;
