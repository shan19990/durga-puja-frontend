// context/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext<{
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  getAccessToken: () => string | null;
}>({
  isLoggedIn: false,
  setIsLoggedIn: () => {},
  getAccessToken: () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const access = document.cookie.includes('access=');
    setIsLoggedIn(access);
  }, []);

  const getAccessToken = (): string | null => {
    const match = document.cookie.match(/(?:^|; )access=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, setIsLoggedIn, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
