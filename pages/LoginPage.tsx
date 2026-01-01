
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { testSupabaseConnection } from '../test-supabase';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    console.log('Tentative de connexion avec:', email);

    try {
      const success = await login(email, password);
      console.log('Résultat de login:', success);
      if (success) {
        console.log('Redirection vers /admin');
        navigate('/admin');
      } else {
        console.log('Échec de connexion');
        setError('Email ou mot de passe incorrect.');
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      setError('Erreur de connexion. Vérifiez votre connexion internet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded shadow-lg w-full max-w-md border-t-4 border-brand-blue">
        <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
                <img src="/logo.png" alt="Logo" className="h-20 w-auto" />
            </div>
            <p className="text-sm text-gray-500 uppercase tracking-widest mt-1">Espace Administration</p>
        </div>
        
        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4 border border-red-200">
                {error}
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
            <input 
                type="email"
                required
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue outline-none bg-white text-gray-900 placeholder-gray-500"
                placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Mot de passe</label>
            <div className="relative">
                <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 pr-12 border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue outline-none bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Votre mot de passe"
                />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-blue transition-colors focus:outline-none"
                    title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                    {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    )}
                </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full bg-brand-blue text-white font-bold py-3 rounded hover:bg-blue-700 transition-colors shadow-md active:scale-[0.98] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Connexion en cours...' : 'Se Connecter'}
          </button>

          <button
            type="button"
            onClick={testSupabaseConnection}
            className="w-full bg-gray-500 text-white font-bold py-2 rounded hover:bg-gray-600 transition-colors shadow-md active:scale-[0.98] text-sm mt-2"
          >
            🔧 Tester Connexion Supabase
          </button>
          
          <div className="text-center mt-6 p-4 bg-gray-50 rounded text-xs text-gray-500 border border-gray-200">
            <p className="font-bold mb-1">Identifiants Démo :</p>
            <ul className="text-left space-y-1 mx-auto max-w-xs">
                <li><strong className="text-brand-dark">Admin:</strong> admin@example.com / admin</li>
                <li><strong className="text-brand-dark">Éditeur:</strong> editor@example.com / editor</li>
                <li><strong className="text-brand-dark">Contrib:</strong> contrib@example.com / contrib</li>
            </ul>
          </div>

          <div className="text-center mt-4">
            <button type="button" onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-brand-blue hover:underline transition-colors">
                Retour au site public
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
