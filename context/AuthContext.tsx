import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { getUsers, initDB, saveUser } from '../services/mockDatabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
        try {
            // Étape 1: Initialiser la base de données (PHP ou Local)
            await initDB();
            
            // Étape 2: Vérifier si une session existe
            const storedUser = localStorage.getItem('wci_current_session');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                // On vérifie si l'utilisateur existe toujours en base
                const users = await getUsers();
                const validUser = users.find(u => u.id === parsedUser.id);
                if (validUser) {
                    setUser(validUser);
                } else {
                    localStorage.removeItem('wci_current_session');
                }
            }
        } catch (e) {
            console.error("Auth initialization error:", e);
        } finally {
            setIsLoading(false);
        }
    };
    initialize();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
        const users = await getUsers();
        const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        
        if (foundUser) {
          setUser(foundUser);
          localStorage.setItem('wci_current_session', JSON.stringify(foundUser));
          return true;
        }
        return false;
    } catch (e) {
        console.error("Login Error:", e);
        return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('wci_current_session');
  };

  const updateUser = async (userData: User) => {
    setUser(userData);
    localStorage.setItem('wci_current_session', JSON.stringify(userData));
    await saveUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
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