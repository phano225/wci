import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { getUsers, initDB } from '../services/mockDatabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
        await initDB(); // Seed database if empty
        const storedUser = localStorage.getItem('lavenir_current_user');
        if (storedUser) {
           setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Note: Pour une vraie sécurité, utilisez auth.signInWithEmailAndPassword de Firebase Auth.
    // Ici on continue d'utiliser la collection "users" pour correspondre à votre modèle existant.
    try {
        const users = await getUsers();
        const foundUser = users.find(u => u.email === email && u.password === password);
        
        if (foundUser) {
          setUser(foundUser);
          localStorage.setItem('lavenir_current_user', JSON.stringify(foundUser));
          return true;
        } else {
          return false;
        }
    } catch (e) {
        console.error(e);
        return false;
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
