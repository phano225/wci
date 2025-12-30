import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
    return (
        <footer className="bg-[#1a1a1a] text-white pt-16 pb-8 border-t-4 border-brand-red">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Column 1: About */}
                    <div className="space-y-6">
                        <Link to="/" className="block">
                             <div className="bg-white p-2 inline-block rounded-lg">
                               <img src="/logo.png" alt="Logo" className="h-16 w-auto" />
                            </div>
                       </Link>
                       <p className="text-gray-400 text-sm leading-relaxed">
                           Votre source d'information privilégiée sur l'actualité fluviale, politique et économique. Nous couvrons l'actualité en continu avec rigueur et indépendance.
                       </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-brand-red transition-colors text-white">
                                <i className="fab fa-facebook-f">f</i>
                            </a>
                            <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-brand-blue transition-colors text-white">
                                <i className="fab fa-twitter">t</i>
                            </a>
                            <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors text-white">
                                <i className="fab fa-instagram">i</i>
                            </a>
                        </div>
                    </div>

                    {/* Column 2: Categories */}
                    <div>
                        <h3 className="text-lg font-bold uppercase tracking-wider mb-6 border-b border-gray-700 pb-2 inline-block">Rubriques</h3>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><Link to="/?cat=politique" className="hover:text-brand-red transition-colors">Politique</Link></li>
                            <li><Link to="/?cat=societe" className="hover:text-brand-red transition-colors">Société</Link></li>
                            <li><Link to="/?cat=economie" className="hover:text-brand-red transition-colors">Économie</Link></li>
                            <li><Link to="/?cat=international" className="hover:text-brand-red transition-colors">International</Link></li>
                            <li><Link to="/?cat=sport" className="hover:text-brand-red transition-colors">Sport</Link></li>
                            <li><Link to="/?cat=culture" className="hover:text-brand-red transition-colors">Culture</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Quick Links */}
                    <div>
                        <h3 className="text-lg font-bold uppercase tracking-wider mb-6 border-b border-gray-700 pb-2 inline-block">Liens Utiles</h3>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><Link to="/contact" className="hover:text-brand-blue transition-colors">Contactez-nous</Link></li>
                            <li><a href="#" className="hover:text-brand-blue transition-colors">Mentions Légales</a></li>
                            <li><a href="#" className="hover:text-brand-blue transition-colors">Politique de Confidentialité</a></li>
                            <li><a href="#" className="hover:text-brand-blue transition-colors">Publicité</a></li>
                            <li><a href="#" className="hover:text-brand-blue transition-colors">Recrutement</a></li>
                        </ul>
                    </div>

                    {/* Column 4: Newsletter */}
                    <div>
                        <h3 className="text-lg font-bold uppercase tracking-wider mb-6 border-b border-gray-700 pb-2 inline-block">Newsletter</h3>
                        <p className="text-gray-400 text-sm mb-4">Abonnez-vous pour recevoir les dernières actualités directement dans votre boîte mail.</p>
                        <form className="space-y-2">
                            <input type="email" placeholder="Votre email" className="w-full p-3 bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-brand-red" />
                            <button className="w-full bg-brand-red text-white font-bold uppercase text-xs py-3 hover:bg-red-700 transition-colors tracking-widest">
                                Je m'abonne
                            </button>
                        </form>
                    </div>
                </div>

                {/* Bottom Bar */}
               <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 uppercase tracking-widest">
                   <p>&copy; {new Date().getFullYear()} Tous droits réservés.</p>
                   <div className="flex gap-6">
                        <Link to="/login" className="hover:text-white">Espace Admin</Link>
                        <a href="#" className="hover:text-white">Plan du site</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
