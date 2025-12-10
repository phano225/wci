import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { getUsers, initDB } from '../services/mockDatabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, role: UserRole) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initDB();
    const storedUser = localStorage.getItem('lavenir_current_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, role: UserRole) => {
    // Simple mock login based on predefined email/role match or generic login
    const users = getUsers();
    const foundUser = users.find(u => u.email === email && u.role === role);
    
    // Fallback for demo purposes if exact match not found in initial seed
    const targetUser = foundUser || users.find(u => u.role === role);

    if (targetUser) {
      setUser(targetUser);
      localStorage.setItem('lavenir_current_user', JSON.stringify(targetUser));
    } else {
      alert('Utilisateur non trouvé pour cette démo. Utilisez les identifiants suggérés.');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lavenir_current_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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