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
      {/* Top Bar - Dark/Black */}
      <div className="bg-black text-white text-[11px] font-bold uppercase tracking-wider py-2 border-b border-gray-800">
        <div className="container mx-auto px-4 flex justify-between items-center">
            {/* Left: Date */}
            <div className="flex items-center gap-4">
                <span className="text-gray-400 hidden sm:inline">
                    {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
            </div>

            {/* Right: Socials + Account */}
            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-3 border-r border-gray-700 pr-4 mr-2">
                    <a href="#" className="hover:text-brand-red transition-colors"><i className="fab fa-facebook-f"></i> FB</a>
                    <a href="#" className="hover:text-brand-red transition-colors"><i className="fab fa-twitter"></i> TW</a>
                    <a href="#" className="hover:text-brand-red transition-colors"><i className="fab fa-youtube"></i> YT</a>
                 </div>
                 <Link to="/contact" className="hover:text-brand-red transition-colors hidden sm:block">Nous contacter</Link>
                 {!user ? (
                    <Link to="/login" className="flex items-center gap-1 hover:text-brand-red transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        Connexion
                    </Link>
                 ) : (
                    <div className="flex items-center gap-2">
                        <Link to="/admin" className="text-brand-red">Admin</Link>
                        <button onClick={logout} className="text-gray-400 hover:text-white">X</button>
                    </div>
                 )}
            </div>
        </div>
      </div>

      {/* Main Header / Logo Area */}
      <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Logo Left */}
        <Link to="/" className="flex-shrink-0">
            <img 
                src="/logo.png" 
                alt="Logo" 
                className="h-[80px] md:h-[100px] w-auto object-contain" 
            />
        </Link>
        
        {/* Ad Space Right (Leaderboard) */}
        <div className="hidden md:block w-[728px] h-[90px] bg-gray-100 flex items-center justify-center border border-gray-200">
            <AdDisplay location={AdLocation.HEADER_LEADERBOARD} />
        </div>
      </div>

      {/* Navigation Links - RED BAR */}
      <nav className="bg-[#E50914] sticky top-0 z-40 shadow-md border-t-4 border-black">
        <div className="container mx-auto px-0 md:px-4">
            <div className="flex items-center justify-between">
                
                {/* Mobile Menu Button */}
                <button className="md:hidden p-3 text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Desktop Nav */}
                <ul className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row absolute md:relative top-full left-0 w-full md:w-auto bg-[#E50914] md:bg-transparent shadow-lg md:shadow-none text-white text-[13px] font-bold uppercase tracking-wider`}>
                    <li className="border-b md:border-b-0 border-red-700">
                        <Link to="/" className="block py-4 px-4 bg-black bg-opacity-20 hover:bg-black hover:bg-opacity-40 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                            </svg>
                        </Link>
                    </li>
                    {categories.map((cat) => (
                        <li key={cat} className="border-b md:border-b-0 border-red-700 md:border-l border-red-600">
                            <Link to={`/?cat=${cat}`} className="block py-4 px-5 hover:bg-black hover:bg-opacity-20 transition-colors whitespace-nowrap">
                                {cat}
                            </Link>
                        </li>
                    ))}
                </ul>

                {/* Search Icon (Right) */}
                <div className="hidden md:block pr-2">
                    <button className="p-2 text-white hover:bg-black hover:bg-opacity-20 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                </div>

            </div>
        </div>
      </nav>

      {/* Ticker / Flash Info */}
      <div className="bg-gray-100 border-b border-gray-300 py-2">
        <div className="container mx-auto px-4 flex items-center">
            <div className="bg-[#E50914] text-white text-[10px] font-bold uppercase px-3 py-1 mr-0 relative after:content-[''] after:absolute after:right-[-10px] after:top-0 after:border-l-[10px] after:border-l-[#E50914] after:border-t-[10px] after:border-t-transparent after:border-b-[10px] after:border-b-transparent z-10">
                Flash Info
            </div>
            <div className="flex-1 overflow-hidden relative h-5 ml-6">
                <div className="animate-marquee whitespace-nowrap text-xs font-bold text-gray-800 uppercase tracking-wide">
                    <span className="mx-8">🔴 Le président annonce une nouvelle réforme des retraites</span>
                    <span className="mx-8">🔴 Canicule : 15 départements en vigilance rouge</span>
                    <span className="mx-8">🔴 Football : La France qualifiée pour la finale</span>
                    <span className="mx-8">🔴 Économie : Le CAC 40 atteint un nouveau record historique</span>
                </div>
            </div>
        </div>
      </div>
    </header>
  );
};
