import React from 'react';
import { Navbar } from './Navbar';

export const PublicLayout = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:px-8">
        {children}
      </main>
      <footer className="bg-brand-dark text-white py-12 mt-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
            <div>
                <h3 className="text-xl font-serif font-bold mb-4">World Canal Info</h3>
                <p className="text-gray-400">Le premier journal numérique d'informations générales. L'actualité en temps réel sur tous les canaux.</p>
            </div>
            <div>
                <h4 className="font-bold mb-4 text-brand-red">RUBRIQUES</h4>
                <ul className="space-y-2 text-gray-400">
                    <li>Politique</li>
                    <li>Économie</li>
                    <li>Société</li>
                    <li>Sport</li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold mb-4 text-brand-red">LÉGAL</h4>
                <ul className="space-y-2 text-gray-400">
                    <li>Mentions légales</li>
                    <li>Politique de confidentialité</li>
                    <li>CGU</li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold mb-4 text-brand-red">SUIVEZ-NOUS</h4>
                <div className="flex space-x-4">
                    <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-500">F</span>
                    <span className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-sky-400">T</span>
                    <span className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-500">Y</span>
                </div>
            </div>
        </div>
        <div className="text-center text-gray-600 text-xs mt-12 pt-4 border-t border-gray-800">
            © {new Date().getFullYear()} World Canal Info. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
};