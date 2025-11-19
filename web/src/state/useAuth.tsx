import { useCallback, useState } from 'react';

export const useAuth = () => {
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

  return { isAuthenticated, login, logout };
};
