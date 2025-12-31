import React, { useEffect, useState } from 'react';
import { AdLocation, AdType, Ad } from '../types';
import { getActiveAdByLocation } from '../services/api';

interface AdDisplayProps {
  location: AdLocation;
}

export const AdDisplay: React.FC<AdDisplayProps> = ({ location }) => {
  const [ad, setAd] = useState<Ad | undefined>();

  useEffect(() => {
    const fetchAd = async () => {
        const foundAd = await getActiveAdByLocation(location);
        setAd(foundAd);
    };
    
    fetchAd();
    // En production avec Firebase, on utiliserait onSnapshot pour le temps réel.
    // Ici un simple polling suffit pour l'exemple.
    const interval = setInterval(fetchAd, 10000);
    return () => clearInterval(interval);
  }, [location]);

  if (!ad) {
    // Show placeholder if no active ad
    let placeholderSize = '';
    let placeholderText = 'ESPACE PUB';
    if (location === AdLocation.HEADER_LEADERBOARD) { placeholderSize = '728x90'; placeholderText = '728x90'; }
    if (location === AdLocation.SIDEBAR_SQUARE) { placeholderSize = '300x250'; placeholderText = '300x250'; }
    if (location === AdLocation.SIDEBAR_SKYSCRAPER) { placeholderSize = '300x600'; placeholderText = '300x600'; }

    return (
        <div 
            className="bg-gray-100 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-300 mx-auto overflow-hidden"
            style={{ 
                width: location === AdLocation.HEADER_LEADERBOARD ? '100%' : undefined,
                maxWidth: location === AdLocation.HEADER_LEADERBOARD ? '728px' : '300px',
                height: location === AdLocation.HEADER_LEADERBOARD ? '90px' : location === AdLocation.SIDEBAR_SQUARE ? '250px' : '600px'
            }}
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
        <img 
            src={imageSrc} 
            alt={ad.title} 
            className="w-full h-full object-cover" 
            style={{ 
                maxHeight: location === AdLocation.HEADER_LEADERBOARD ? '90px' : undefined
            }}
        />
      );

      if (link) {
          return <a href={link} target="_blank" rel="noopener noreferrer" className="block mx-auto">{Content}</a>;
      }
      return <div className="mx-auto block">{Content}</div>;
  }

  // Render Video
  if (ad.type === AdType.VIDEO) {
      return (
        <div className="w-full h-full bg-black flex items-center justify-center mx-auto"
            style={{ 
                maxWidth: location === AdLocation.HEADER_LEADERBOARD ? '728px' : '300px',
                height: location === AdLocation.HEADER_LEADERBOARD ? '90px' : location === AdLocation.SIDEBAR_SQUARE ? '250px' : '600px'
            }}
        >
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
            className="mx-auto overflow-hidden"
            dangerouslySetInnerHTML={{ __html: ad.content }}
            style={{ 
                maxWidth: location === AdLocation.HEADER_LEADERBOARD ? '728px' : '300px',
                minHeight: location === AdLocation.HEADER_LEADERBOARD ? '90px' : '50px'
            }}
          />
      );
  }

  return null;
};
