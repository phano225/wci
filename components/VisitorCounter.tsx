import React from 'react';

interface VisitorCounterProps {
  variant?: 'default' | 'header';
}

export const VisitorCounter: React.FC<VisitorCounterProps> = ({ variant = 'default' }) => {
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

  if (variant === 'header') {
      return (
        <div className="hidden xl:flex flex-col items-center justify-center space-y-1 mx-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm min-w-[200px]">
            {/* Icone et Titre Compact */}
            <div className="flex items-center space-x-2">
                <div className="bg-blue-100 p-1.5 rounded-full shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <div className="text-xs font-bold text-gray-800 tracking-tight">
                  Les internautes nous suivent depuis :
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
                    className="rounded-xs shadow-xs opacity-90 hover:opacity-100 hover:scale-110 transition-all object-cover"
                    style={{ width: '18px', height: '13px' }}
                  />
                ))}
            </div>
        </div>
      );
  }

  return (
    <div className="bg-white border-t-4 border-blue-600 shadow-lg rounded-lg p-5 max-w-md mx-auto my-6 flex flex-col items-center justify-center space-y-3 transform hover:scale-105 transition-transform duration-300">
      {/* Icone et Titre */}
      <div className="flex items-center space-x-3">
        <div className="bg-blue-100 p-2 rounded-full shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        </div>
        <div className="text-base sm:text-lg font-bold text-gray-800 tracking-tight text-center">
          Les internautes nous suivent depuis :
        </div>
      </div>

      {/* Drapeaux */}
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        {allFlags.map((flag) => (
          <img 
            key={flag.code}
            src={`https://flagcdn.com/w40/${flag.code}.png`}
            srcSet={`https://flagcdn.com/w80/${flag.code}.png 2x`}
            width="24"
            height="18"
            alt={flag.name}
            title={flag.name}
            className="rounded shadow-xs hover:scale-110 transition-transform object-cover border border-gray-200"
            style={{ width: '24px', height: '18px' }}
          />
        ))}
      </div>
      <div className="text-xs text-gray-400 font-medium">Dans le monde entier</div>
    </div>
  );
};
