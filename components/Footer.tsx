import React from 'react';
import { Link } from 'react-router-dom';
import { VisitorCounter } from './VisitorCounter';

export const Footer = () => {
    return (
        <footer className="bg-black text-white pt-12 pb-8 border-t-4 border-brand-red">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
                    
                    {/* Column 1: Info Entreprise */}
                    <div className="space-y-4">
                        <div className="bg-white p-2 inline-block rounded mb-2">
                             <img src="/logo.png" alt="World Canal Info" className="h-16 w-auto" />
                        </div>
                        <div className="space-y-2 text-gray-300">
                             <p>ADRESSE POSTALE : 01 BP 845 Abdj 01</p>
                             <p className="font-bold text-white uppercase">World Canal Info</p>
                             <p>PAYS ENTREPRISE : Presse en ligne</p>
                             <p>CAPITAL : 1000.000 F CFA</p>
                             <p>SIEGE SOCIAL : Cocody Bonoumin</p>
                             <p>RCCM-CI- Abidj-03-2022-B113-11685</p>
                             <p>N° RECEPISSE : N° 10/D 25/04/2023 Délivré/Procureur République Côte d'Ivoire</p>
                             <p>ADRESSE POSTALE : 01 BP 845 Abdj 01</p>
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-gray-800">
                            <VisitorCounter />
                        </div>
                    </div>

                    {/* Column 2: Contact & Équipe */}
                    <div className="space-y-6">
                        <div className="space-y-2 text-gray-300">
                            <p><span className="font-bold text-white">CONTACT :</span> +225 01 43 17 17 11 / 07 07 29 96 35</p>
                            <p><span className="font-bold text-white">EMAIL :</span> miensahglobal@gmail.com</p>
                            <p><span className="font-bold text-white">BANQUE :</span> GT-BANK – CI 1630120200000026383187</p>
                        </div>

                        <div className="space-y-4 pt-4">
                            <div>
                                <h4 className="font-bold text-white uppercase text-sm">Directeur de Publication</h4>
                                <p className="text-gray-300">Parfait KOFFI</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-white uppercase text-sm">Rédacteur en Chef</h4>
                                <p className="text-gray-300">Brice ZADI</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-white uppercase text-sm">Secrétaire de Rédaction</h4>
                                <p className="text-gray-300">Maxime KOUADIO</p>
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Siège Pays */}
                    <div>
                        <h3 className="text-lg font-bold text-white uppercase mb-6">Siege Pays</h3>
                        <ul className="space-y-2 text-gray-300">
                            <li>France</li>
                            <li>Belgique</li>
                            <li>Suisse</li>
                            <li>Canada</li>
                            <li>Sénégal</li>
                            <li>Mali</li>
                            <li>Niger</li>
                            <li>Burkina Faso</li>
                            <li>Bénin & Togo</li>
                            <li>Guinée Conakry</li>
                        </ul>
                    </div>

                </div>

                {/* Bottom Bar */}
               <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 uppercase tracking-widest">
                   <p>&copy; {new Date().getFullYear()} World Canal Info. Tous droits réservés.</p>
                   <div className="flex gap-6">
                        <Link to="/login" className="hover:text-white">Espace Admin</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};
