import React, { useState, useEffect } from 'react';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (!isInstallable) return null;

  return (
    <button 
      onClick={handleInstallClick}
      className="bg-[var(--primary)] hover:bg-[#e55314] text-white text-[11px] md:text-xs font-bold px-3 py-1.5 md:py-2 rounded-full transition-colors flex items-center gap-2 shadow-sm animate-pulse"
    >
      <i className="fas fa-download"></i>
      <span className="hidden sm:inline">Installer l'app</span>
      <span className="sm:hidden">Installer</span>
    </button>
  );
};
