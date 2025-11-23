import React, { createContext, useState, useContext, useEffect } from 'react';

/**
 * AuthContext.tsx - Global Authentication State
 * 
 * LEARNING OBJECTIVES:
 * 1. React Context API for global state
 * 2. Persisting auth state with localStorage
 * 3. Providing auth methods (login, logout) to all components
 * 4. Debugging with console logs
 */

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Debug helper
const DEBUG = import.meta.env.VITE_DEBUG === 'true';
const log = (...args: any[]) => {
  if (DEBUG) console.log('[AuthContext]', ...args);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check localStorage on mount
  useEffect(() => {
    log('Initializing auth state...');
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      log('Found stored credentials:', {
        token: storedToken.substring(0, 20) + '...',
        user: JSON.parse(storedUser)
      });
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    } else {
      log('No stored credentials found');
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    log('Login called:', { user: newUser, token: newToken.substring(0, 20) + '...' });
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    log('Login successful!');
  };

  const logout = () => {
    log('Logout called');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    log('Logout complete');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token,
      login,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
