import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const success = await login(email, password);
    if (success) {
        navigate('/admin');
    } else {
        setError('Email ou mot de passe incorrect.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-lg w-full max-w-md border-t-4 border-brand-blue">
        <div className="text-center mb-6">
            <h1 className="text-2xl font-serif font-bold text-brand-dark">World Canal Info</h1>
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
                placeholder="Votre email professionnel"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Mot de passe</label>
            <input 
                type="password"
                required
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue outline-none bg-white text-gray-900 placeholder-gray-500"
                placeholder="Votre mot de passe"
            />
          </div>
          <button type="submit" className="w-full bg-brand-blue text-white font-bold py-3 rounded hover:bg-blue-700 transition-colors">
            Se Connecter
          </button>
          
          <div className="text-center mt-6 p-4 bg-gray-50 rounded text-xs text-gray-500 border border-gray-200">
            <p className="font-bold mb-1">Identifiants Démo :</p>
            <ul className="text-left space-y-1 mx-auto max-w-xs">
                <li><strong className="text-brand-dark">Admin:</strong> admin@worldcanalinfo.com / admin</li>
                <li><strong className="text-brand-dark">Éditeur:</strong> editor@worldcanalinfo.com / editor</li>
                <li><strong className="text-brand-dark">Contrib:</strong> contrib@worldcanalinfo.com / contrib</li>
            </ul>
          </div>

          <div className="text-center mt-4">
            <button type="button" onClick={() => navigate('/')} className="text-sm text-gray-500 hover:underline">
                Retour au site public
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};