import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

// WARNING: Using localStorage for authentication state is insecure and vulnerable to XSS attacks.
// This is a placeholder implementation ONLY. Replace with httpOnly cookies or a secure session mechanism before production.

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem('demo-auth') === 'true';
  });

  const login = useCallback(() => {
    localStorage.setItem('demo-auth', 'true');
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('demo-auth');
    setAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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
