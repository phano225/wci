import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../supabase-config';
import { getUsers, saveUser, IS_OFFLINE_MODE } from '../services/api';

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
          let users = await getUsers();
          
          // Retry logic for unstable connection
          if (users.length === 0) {
              console.warn('Liste utilisateurs vide, nouvelle tentative dans 2s...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              users = await getUsers();
          }

          console.log('Utilisateurs trouvés:', users.length);
          const profile = users.find(u => u.email === session.user.email);
          console.log('Profil trouvé:', profile);
          
          if (profile) {
            setUser(profile);
            console.log('Utilisateur connecté:', profile.name);
          } else if (users.length === 0 && session.user.email) {
            // Fallback: If we have a session but couldn't fetch the profile (likely network error),
            // keep the user logged in with basic info from session to avoid kicking them out.
            console.warn('Utilisation du profil de secours (session active mais DB inaccessible)');
            setUser({
                id: session.user.id,
                email: session.user.email,
                name: session.user.email.split('@')[0], // Fallback name
                role: 'CONTRIBUTOR', // Safe default
                active: true,
                createdAt: new Date().toISOString()
            } as User);
          } else {
            console.log('Aucun profil trouvé pour cet email dans la base');
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
    // --- MODE HORS LIGNE ---
    if (IS_OFFLINE_MODE) {
        console.log('MODE HORS LIGNE: Connexion locale simulée.');
        const demoUsers = [
            { email: 'admin@example.com', password: 'admin', role: 'ADMIN', name: 'Administrateur' },
            { email: 'admin@example.com', password: 'admin123', role: 'ADMIN', name: 'Administrateur' },
            { email: 'editor@example.com', password: 'editor', role: 'EDITOR', name: 'Éditeur' },
            { email: 'contrib@example.com', password: 'contrib', role: 'CONTRIBUTOR', name: 'Contributeur' }
        ];
        const demoUser = demoUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (demoUser) {
            setUser({
                id: 'demo-' + demoUser.role,
                email: demoUser.email,
                name: demoUser.name,
                role: demoUser.role as any,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                active: true
            });
            return true;
        }
        return false;
    }

    console.log('--- LOGIN START (Supabase Real) ---');
    try {
      console.log('Tentative de connexion pour:', email);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Erreur de connexion Supabase:', error);
        
        // FALLBACK: Mode démo si Supabase échoue ou n'est pas configuré
        // Ceci permet de tester l'interface sans backend fonctionnel
        console.log('Tentative de connexion en mode DÉMO/FALLBACK...');
        
        const demoUsers = [
            { email: 'admin@example.com', password: 'admin', role: 'ADMIN', name: 'Administrateur' },
            { email: 'admin@example.com', password: 'admin123', role: 'ADMIN', name: 'Administrateur' }, // Support both for transition
            { email: 'editor@example.com', password: 'editor', role: 'EDITOR', name: 'Éditeur' },
            { email: 'contrib@example.com', password: 'contrib', role: 'CONTRIBUTOR', name: 'Contributeur' }
        ];

        console.log('Utilisateurs démo disponibles:', demoUsers);
        console.log('Comparaison avec:', email, password);

        const demoUser = demoUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        
        if (demoUser) {
            console.log('Connexion DÉMO réussie pour:', demoUser.name);
            const userProfile: User = {
                id: 'demo-' + demoUser.role,
                email: demoUser.email,
                name: demoUser.name,
                role: demoUser.role as any,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                active: true
            };
            setUser(userProfile);
            return true;
        } else {
            console.log('Échec connexion DÉMO: Aucun utilisateur correspondant trouvé');
        }
 
        return false;
      }
      console.log('Connexion Supabase réussie');
      return true;
    } catch (e) {
      console.error("Erreur lors de la connexion:", e);
      // Fallback en cas d'erreur inattendue aussi
        const demoUsers = [
            { email: 'admin@example.com', password: 'admin', role: 'admin', name: 'Administrateur' },
            { email: 'editor@example.com', password: 'editor', role: 'editor', name: 'Éditeur' },
            { email: 'contrib@example.com', password: 'contrib', role: 'contributor', name: 'Contributeur' }
        ];

        const demoUser = demoUsers.find(u => u.email === email && u.password === password);
        
        if (demoUser) {
            console.log('Connexion DÉMO (après exception) réussie pour:', demoUser.name);
            const userProfile: User = {
                id: 'demo-' + demoUser.role,
                email: demoUser.email,
                name: demoUser.name,
                role: demoUser.role as any,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                active: true
            };
            setUser(userProfile);
            return true;
        }
      return false;
    }
  };

  const logout = async () => {
    if (IS_OFFLINE_MODE) {
        setUser(null);
        return;
    }
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