import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  adminLogin: (email: string, password: string, masterKey: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<User>;
  googleLogin: (credential: string) => Promise<{ user: User; isNewUser: boolean }>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ethniz_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ethniz_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUser = async () => {
      const savedToken = localStorage.getItem('ethniz_token');
      if (savedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('ethniz_user', JSON.stringify(res.data.user));
        } catch (err) {
          console.warn('Session expired, logging out');
          logout();
        }
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('ethniz_token', receivedToken);
    localStorage.setItem('ethniz_user', JSON.stringify(receivedUser));
    return receivedUser;
  };

  const adminLogin = async (email: string, password: string, masterKey: string): Promise<User> => {
    const res = await api.post('/auth/admin-login', { email, password, masterKey });
    const { token: receivedToken, user: receivedUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('ethniz_token', receivedToken);
    localStorage.setItem('ethniz_user', JSON.stringify(receivedUser));
    return receivedUser;
  };

  const register = async (name: string, email: string, password: string, phone?: string): Promise<User> => {
    const res = await api.post('/auth/register', { name, email, password, phone });
    const { token: receivedToken, user: receivedUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('ethniz_token', receivedToken);
    localStorage.setItem('ethniz_user', JSON.stringify(receivedUser));
    return receivedUser;
  };

  const googleLogin = async (credential: string): Promise<{ user: User; isNewUser: boolean }> => {
    const res = await api.post('/auth/google', { credential });
    const { token: receivedToken, user: receivedUser, isNewUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('ethniz_token', receivedToken);
    localStorage.setItem('ethniz_user', JSON.stringify(receivedUser));
    try {
      sessionStorage.setItem('ethniz_auth_modal_shown', 'true');
    } catch {
      // ignore
    }
    return { user: receivedUser, isNewUser: Boolean(isNewUser) };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ethniz_token');
    localStorage.removeItem('ethniz_user');
  };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updatedUser };
      localStorage.setItem('ethniz_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        adminLogin,
        register,
        googleLogin,
        logout,
        updateUser,
        isAdmin: user?.role === 'ADMIN'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
