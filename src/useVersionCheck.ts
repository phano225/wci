import { useEffect } from 'react';

export const useVersionCheck = () => {
  useEffect(() => {
    const LOG_DEBUG = import.meta.env.VITE_LOG_LEVEL === 'debug';

    const controller = new AbortController();
    const signal = controller.signal;

    const checkVersion = async () => {
      try {
        // Add timestamp to avoid caching of version.json itself
        const response = await fetch(`/version.json?t=${Date.now()}`, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
            signal
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const serverVersion = data.version;
        const localVersion = localStorage.getItem('app_version');

        if (LOG_DEBUG) console.log(`🔍 Version Check: Local=${localVersion}, Server=${serverVersion}`);

        if (localVersion && localVersion !== serverVersion) {
          if (LOG_DEBUG) console.log('✨ New version detected! Refreshing...');
          localStorage.setItem('app_version', serverVersion);
          
          // Clear caches if possible
          if ('caches' in window) {
            try {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
                if (LOG_DEBUG) console.log('🧹 Cache cleared');
            } catch (e) {
                console.error('Failed to clear cache', e);
            }
          }
          // Clear localStorage app caches (wci_cache_*)
          try {
            const keys = Object.keys(localStorage);
            keys.forEach(k => { if (k.startsWith('wci_cache_')) localStorage.removeItem(k); });
          } catch {}
          
          // Hard reload from server
          window.location.reload();
        } else if (!localVersion) {
          // First visit or storage cleared, set current version
          localStorage.setItem('app_version', serverVersion);
        }
      } catch (error: any) {
        // Ignore network errors and aborts
        if (
            error.name === 'AbortError' || 
            error.message?.includes('aborted') || 
            error.message === 'Failed to fetch' ||
            error.message?.includes('NetworkError') ||
            error.message?.includes('Network request failed')
        ) return;
        
        if (LOG_DEBUG) console.warn('Silent version check error:', error);
      }
    };

    // Check on mount + soon after to catch immediate deploy updates
    checkVersion();
    const early = setTimeout(checkVersion, 5000);

    // Check on visibility change (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Check periodically (every 5 minutes)
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => {
      controller.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
      clearTimeout(early);
    };
  }, []);
};
