import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import type { User } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (req: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  checkSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async (): Promise<boolean> => {
    try {
      const refreshed = await api.refreshToken();
      if (refreshed) {
        const profile = await api.getProfile();
        setUser(profile);
        return true;
      }
    } catch (e) {
      console.error('Failed to initialize session:', e);
    } finally {
      setLoading(false);
    }
    setUser(null);
    return false;
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (req: any) => {
    setLoading(true);
    try {
      const res = await api.login(req);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
