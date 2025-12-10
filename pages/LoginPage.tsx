import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, we would take email/password. 
    // Here we map role to the mock user email for simplicity
    let email = '';
    switch (role) {
        case UserRole.ADMIN: email = 'admin@worldcanalinfo.com'; break;
        case UserRole.EDITOR: email = 'editor@worldcanalinfo.com'; break;
        case UserRole.CONTRIBUTOR: email = 'contrib@worldcanalinfo.com'; break;
    }
    login(email, role);
    navigate('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-lg w-full max-w-md border-t-4 border-brand-blue">
        <div className="text-center mb-6">
            <h1 className="text-2xl font-serif font-bold text-brand-dark">World Canal Info</h1>
            <p className="text-sm text-gray-500 uppercase tracking-widest mt-1">Espace Administration</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Sélectionnez un Rôle (Simulation)</label>
            <select 
                value={role} 
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue outline-none bg-white"
            >
                <option value={UserRole.ADMIN}>Administrateur</option>
                <option value={UserRole.EDITOR}>Éditeur</option>
                <option value={UserRole.CONTRIBUTOR}>Contributeur</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
                * Dans cette démo, choisir un rôle connectera automatiquement l'utilisateur mock associé.
            </p>
          </div>
          <button type="submit" className="w-full bg-brand-blue text-white font-bold py-3 rounded hover:bg-blue-700 transition-colors">
            Se Connecter
          </button>
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