import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, formatApiError } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('crewboard_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('crewboard_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize auth from token if available
  useEffect(() => {
    let isMounted = true;
    async function initAuth() {
      const storedToken = localStorage.getItem('crewboard_token');
      if (storedToken) {
        try {
          const profile = await authService.getMe();
          if (isMounted) {
            setUser(profile);
            localStorage.setItem('crewboard_user', JSON.stringify(profile));
          }
        } catch {
          if (isMounted) {
            localStorage.removeItem('crewboard_token');
            localStorage.removeItem('crewboard_user');
            setToken(null);
            setUser(null);
          }
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    }

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const data = await authService.login({ email, password });
      const authToken = data.access_token;
      const authUser = data.user;

      localStorage.setItem('crewboard_token', authToken);
      localStorage.setItem('crewboard_user', JSON.stringify(authUser));
      setToken(authToken);
      setUser(authUser);
      return authUser;
    } catch (err) {
      const message = formatApiError(err, 'Failed to sign in. Please verify your credentials.');
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const register = useCallback(async (fullName, email, password) => {
    setAuthError(null);
    try {
      await authService.register({
        full_name: fullName,
        email,
        password,
      });
      // Automatically log the user in following registration
      return await login(email, password);
    } catch (err) {
      const message = formatApiError(err, 'Registration failed. Please check your details.');
      setAuthError(message);
      throw new Error(message);
    }
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('crewboard_token');
    localStorage.removeItem('crewboard_user');
    localStorage.removeItem('crewboard_active_team_id');
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    authError,
    setAuthError,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
