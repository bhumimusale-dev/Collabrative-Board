import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-slate-400 font-medium">Securing session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

