import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('zayani_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('zayani_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const res = await apiRequest('/auth/me');
          setUser(res.user);
          localStorage.setItem('zayani_user', JSON.stringify(res.user));
        } catch (e) {
          console.warn('Auth check failed:', e.message);
          logout();
        }
      }
      setLoading(false);
    };

    const handleExpired = () => logout();
    window.addEventListener('auth-expired', handleExpired);

    checkAuth();
    return () => window.removeEventListener('auth-expired', handleExpired);
  }, [token]);

  const login = async (email, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('zayani_token', res.token);
    localStorage.setItem('zayani_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('zayani_token');
    localStorage.removeItem('zayani_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
