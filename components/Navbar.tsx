import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole, AdLocation } from '../types';
import { getCategories } from '../services/mockDatabase';
import { AdDisplay } from './AdDisplay';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const loadCats = async () => {
        const cats = await getCategories();
        setCategories(cats.map(c => c.name));
    };
    loadCats();
  }, []);

  return (
    <header className="flex flex-col w-full bg-white shadow-sm z-50">
      {/* Top Bar */}
      <div className="bg-brand-dark text-white text-xs py-1 px-4 md:px-8 flex justify-between items-center">
        <span className="hidden md:inline">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        <div className="flex space-x-4">
          <a href="#" className="hover:text-brand-gray">Newsletter</a>
          <Link to="/contact" className="hover:text-brand-gray">Contact</Link>
          {!user ? (
             <Link to="/login" className="font-bold text-brand-yellow hover:text-yellow-300">Connexion Espace Pro</Link>
          ) : (
            <div className="flex items-center gap-2">
                <span className="text-gray-300">Bonjour, {user.name}</span>
                <Link to="/admin" className="font-bold text-brand-blue bg-white px-2 py-0.5 rounded text-xs">Admin</Link>
                <button onClick={logout} className="text-red-400 hover:text-red-300">Quitter</button>
            </div>
          )}
        </div>
      </div>

      {/* Main Header / Logo */}
      <div className="py-4 px-4 md:px-8 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <button className="md:hidden text-3xl text-brand-dark" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                ☰
            </button>
            <Link to="/" className="flex items-center gap-4 group">
                {/* Logo Image - Fixed URL */}
                <div className="relative">
                    <img 
                        src="https://placehold.co/150x150/0055a4/ffffff?text=WCI" 
                        alt="World Canal Info Logo" 
                        className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] object-cover rounded-full border-4 border-white shadow-md group-hover:scale-105 transition-transform bg-white" 
                    />
                </div>
                <div className="hidden sm:block">
                     <h1 className="text-3xl md:text-5xl font-serif font-bold text-brand-blue tracking-tighter leading-none">
                        World Canal
                    </h1>
                    <span className="text-2xl md:text-4xl font-bold text-brand-red bg-brand-yellow px-2 inline-block transform -skew-x-6 mt-1 shadow-sm">
                        Info
                    </span>
                </div>
            </Link>
        </div>
        
        {/* Ad Space - Dynamic */}
        <div className="hidden lg:flex flex-col items-center w-full lg:w-auto">
            <AdDisplay location={AdLocation.HEADER_LEADERBOARD} />
        </div>
      </div>

      {/* Navigation Links */}
      <nav className={`${isMenuOpen ? 'block' : 'hidden'} md:block border-b border-brand-red border-t-4 border-t-brand-blue bg-white sticky top-0 z-40 shadow-sm`}>
        <div className="container mx-auto">
            {/* Mobile: Vertical List, Desktop: Horizontal */}
            <ul className="flex flex-col md:flex-row md:justify-center text-sm font-bold uppercase tracking-wide">
                <li className="border-b md:border-b-0 border-gray-200">
                    <Link to="/" onClick={() => setIsMenuOpen(false)} className="block py-3 px-4 hover:bg-brand-blue hover:text-white transition-colors bg-brand-red text-white">À la Une</Link>
                </li>
                {categories.map((cat) => (
                    <li key={cat} className="border-b md:border-b-0 border-gray-200">
                        <Link to={`/?cat=${cat}`} onClick={() => setIsMenuOpen(false)} className="block py-3 px-4 text-gray-800 hover:bg-brand-blue hover:text-white transition-colors">
                            {cat}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
      </nav>
    </header>
  );
};
