import React, { useEffect, useState } from 'react';
import { AdLocation, AdType, Ad } from '../types';
import { getActiveAdByLocation } from '../services/mockDatabase';

interface AdDisplayProps {
  location: AdLocation;
}

export const AdDisplay: React.FC<AdDisplayProps> = ({ location }) => {
  const [ad, setAd] = useState<Ad | undefined>();

  // Poll for changes just for the demo effect (in real app, use Context or React Query)
  useEffect(() => {
    const fetchAd = () => {
        const foundAd = getActiveAdByLocation(location);
        setAd(foundAd);
    };
    
    fetchAd();
    // Refresh every 5 seconds to show changes without refresh in this dev environment
    const interval = setInterval(fetchAd, 5000);
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
      const Content = (
        <img 
            src={ad.content} 
            alt={ad.title} 
            className="w-full h-full object-cover" 
            style={{ 
                maxHeight: location === AdLocation.HEADER_LEADERBOARD ? '90px' : undefined
            }}
        />
      );

      if (ad.linkUrl) {
          return <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block mx-auto">{Content}</a>;
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