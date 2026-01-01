import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase-config';

interface VisitorSettings {
  base_count: number;
}

interface VisitorCounterProps {
  variant?: 'default' | 'header';
}

export const VisitorCounter: React.FC<VisitorCounterProps> = ({ variant = 'default' }) => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Drapeaux (URLs from flagcdn)
  const africanFlags = [
    { code: 'sn', name: 'Sénégal' },
    { code: 'ci', name: 'Côte d\'Ivoire' },
    { code: 'ng', name: 'Nigeria' },
    { code: 'za', name: 'Afrique du Sud' },
    { code: 'ma', name: 'Maroc' },
  ];

  const otherFlags = [
    { code: 'fr', name: 'France' },
    { code: 'us', name: 'USA' },
    { code: 'gb', name: 'Royaume-Uni' },
    { code: 'de', name: 'Allemagne' },
    { code: 'ca', name: 'Canada' },
  ];

  const allFlags = [...africanFlags, ...otherFlags];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // On utilise la table 'ads' pour stocker la config (hack pour éviter migration)
        const { data, error } = await supabase
          .from('ads')
          .select('content')
          .eq('id', 'visitor_counter_config')
          .single();

        let base = 900000; // Valeur par défaut si pas de config
        if (data && data.content) {
            try {
                const parsed = JSON.parse(data.content);
                if (parsed.base_count) base = parseInt(parsed.base_count);
            } catch (e) {
                // content might be raw text if not json
            }
        }

        // Gestion de l'incrément local "fake"
        const storageKey = 'wci_visitor_offset';
        const lastOffset = parseInt(localStorage.getItem(storageKey) || '0');
        const newOffset = lastOffset + 100000 + Math.floor(Math.random() * 5000); // +100k et un peu d'aléatoire
        
        localStorage.setItem(storageKey, newOffset.toString());
        
        setCount(base + newOffset);
      } catch (err: any) {
        if (err.name !== 'AbortError' && err.message !== 'Failed to fetch') {
            console.error("Error fetching visitor count", err);
        }
        // Fallback
        setCount(1000000);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) return null;

  if (variant === 'header') {
      return (
        <div className="hidden xl:flex flex-col items-center justify-center space-y-1 mx-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm min-w-[200px]">
            {/* Icone et Compteur Compact */}
            <div className="flex items-center space-x-2">
                <div className="bg-blue-100 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <div className="text-xl font-black text-gray-800 tracking-tight">
                  {count.toLocaleString('fr-FR')} <span className="text-xs font-bold text-gray-500 uppercase">visiteurs</span>
                </div>
            </div>

            {/* Drapeaux Compact */}
            <div className="flex flex-wrap justify-center gap-1.5">
                {allFlags.map((flag) => (
                  <img 
                    key={flag.code}
                    src={`https://flagcdn.com/w40/${flag.code}.png`}
                    width="18"
                    height="13"
                    alt={flag.name}
                    title={flag.name}
                    className="rounded-sm shadow-sm opacity-90 hover:opacity-100 transition-opacity object-cover"
                    style={{ width: '18px', height: '13px' }}
                  />
                ))}
            </div>
        </div>
      );
  }

  return (
    <div className="bg-white border-t-4 border-blue-600 shadow-lg rounded-lg p-4 max-w-md mx-auto my-6 flex flex-col items-center justify-center space-y-3 transform hover:scale-105 transition-transform duration-300">
      {/* Icone et Compteur */}
      <div className="flex items-center space-x-3">
        <div className="bg-blue-100 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        </div>
        <div className="text-3xl font-extrabold text-gray-800 tracking-tight">
          {count.toLocaleString('fr-FR')} <span className="text-xl font-medium text-gray-500">visiteurs</span>
        </div>
      </div>

      {/* Drapeaux */}
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {allFlags.map((flag) => (
          <img 
            key={flag.code}
            src={`https://flagcdn.com/w40/${flag.code}.png`}
            srcSet={`https://flagcdn.com/w80/${flag.code}.png 2x`}
            width="24"
            height="18"
            alt={flag.name}
            title={flag.name}
            className="rounded shadow-sm hover:opacity-80 transition-opacity object-cover border border-gray-200"
            style={{ width: '24px', height: '18px' }} // Taille favicon-ish
          />
        ))}
      </div>
      <div className="text-xs text-gray-400 font-medium">Ils nous suivent depuis le monde entier</div>
    </div>
  );
};
