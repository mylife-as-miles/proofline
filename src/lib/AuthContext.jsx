import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

// Required platform shell. Proofline keeps all reader data locally in IndexedDB.
export const AuthProvider = ({ children }) => {
  const [state] = useState({
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
  });

  useEffect(() => {
    void base44;
  }, []);

  return <AuthContext.Provider value={{ ...state, navigateToLogin: () => {} }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
