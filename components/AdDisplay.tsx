import React, { useEffect, useState } from 'react';
import { AdLocation, AdType, Ad } from '../types';
import { getActiveAdByLocation } from '../services/api';

interface AdDisplayProps {
  location: AdLocation;
}

export const AdDisplay: React.FC<AdDisplayProps> = ({ location }) => {
  const [ad, setAd] = useState<Ad | undefined>();

  useEffect(() => {
    let isMounted = true;
    const fetchAd = async () => {
        try {
            const foundAd = await getActiveAdByLocation(location);
            if (isMounted) setAd(foundAd);
        } catch (error) {
            const LOG_DEBUG = import.meta.env.VITE_LOG_LEVEL === 'debug';
            if (LOG_DEBUG) console.warn('Error fetching ad (silencieux en prod):', error);
        }
    };
    
    fetchAd();
    
    // Polling toutes les 30 secondes au lieu de 10 pour économiser la bande passante
    const interval = setInterval(fetchAd, 30000);
    return () => {
        isMounted = false;
        clearInterval(interval);
    };
  }, [location]);

  // Responsive container classes
  const containerClass =
    location === AdLocation.HEADER_LEADERBOARD
      ? 'w-full max-w-[728px] h-[90px]'
      : location === AdLocation.SIDEBAR_SQUARE
      ? // Horizontal (mobile/tablette) -> 90px; Desktop -> 300x250
        'w-full md:max-w-[300px] h-[90px] md:h-[250px]'
      : // SKYSCRAPER: Horizontal (mobile/tablette) -> 90px; Desktop -> 300x600
        'w-full md:max-w-[300px] h-[90px] md:h-[600px]';

  if (!ad) {
    // Show placeholder if no active ad
    let placeholderText = 'PUB';
    if (location === AdLocation.HEADER_LEADERBOARD) placeholderText = '728x90';
    if (location === AdLocation.SIDEBAR_SQUARE) placeholderText = '300x250';
    if (location === AdLocation.SIDEBAR_SKYSCRAPER) placeholderText = '300x600';

    return (
      <div
        className={`bg-gray-100 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-300 mx-auto overflow-hidden ${containerClass}`}
      >
        ESPACE {placeholderText}
      </div>
    );
  }

  // Render Image
  if (ad.type === AdType.IMAGE) {
      const imageSrc = ad.imageUrl || ad.content;
      const link = ad.linkUrl || ad.targetUrl;
      
      const Content = (
        <div className={`mx-auto overflow-hidden ${containerClass}`}>
          <img 
              src={imageSrc} 
              alt={ad.title} 
              className="w-full h-full object-cover" 
          />
        </div>
      );

      if (link) {
          return <a href={link} target="_blank" rel="noopener noreferrer" className="block">{Content}</a>;
      }
      return Content;
  }

  // Render Video
  if (ad.type === AdType.VIDEO) {
      return (
        <div className={`bg-black flex items-center justify-center mx-auto overflow-hidden relative ${containerClass}`}>
            <video 
                src={ad.content} 
                autoPlay 
                muted 
                loop 
                playsInline 
                className="w-full h-full object-cover"
                style={{ pointerEvents: ad.linkUrl ? 'none' : 'auto' }}
            />
             {ad.linkUrl && (
                <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10"></a>
            )}
        </div>
      );
  }

  // Render Script / HTML
  if (ad.type === AdType.SCRIPT) {
      return (
          <div 
            className={`mx-auto overflow-hidden ${containerClass}`}
            dangerouslySetInnerHTML={{ __html: ad.content }}
          />
      );
  }

  return null;
};
