import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../supabase-config';
import { getUsers, saveUser } from '../services/mockDatabase';

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
    console.log('Initialisation de l\'authentification...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Changement d\'état auth:', event, session?.user?.email);
      if (session?.user) {
        try {
          console.log('Récupération des utilisateurs...');
          const users = await getUsers();
          console.log('Utilisateurs trouvés:', users.length);
          const profile = users.find(u => u.email === session.user.email);
          console.log('Profil trouvé:', profile);
          if (profile) {
            setUser(profile);
            console.log('Utilisateur connecté:', profile.name);
          } else {
            console.log('Aucun profil trouvé pour cet email');
            setUser(null);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du profil:', error);
          setUser(null);
        }
      } else {
        console.log('Aucune session active');
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Tentative de connexion pour:', email);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Erreur de connexion Supabase:', error);
        return false;
      }
      console.log('Connexion Supabase réussie');
      return true;
    } catch (e) {
      console.error("Erreur lors de la connexion:", e);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateUser = async (userData: User) => {
    setUser(userData);
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