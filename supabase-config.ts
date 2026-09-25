import { createClient } from '@supabase/supabase-js';
import { logger } from './src/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Safe sequential in-memory lock: évite le deadlock de l'API Web Locks tout en empêchant la collision des refresh tokens
let currentLock: Promise<any> = Promise.resolve();

const memoryLock = async <T>(_name: string, _timeout: number, acquire: () => Promise<T>): Promise<T> => {
  const previousLock = currentLock;
  let release: () => void = () => {};
  currentLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  
  try {
    await previousLock;
  } catch {
    // Ignorer les erreurs des locks précédents
  }
  
  try {
    return await acquire();
  } finally {
    release();
  }
};

// Wrapper fetch personnalisé avec timeout de 15s et capture de télémétrie dans logger
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const start = performance.now();
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  
  // Extraire l'endpoint pour un affichage lisible
  let endpoint = urlStr;
  try {
    const u = new URL(urlStr);
    endpoint = `${u.pathname}${u.search ? u.search.slice(0, 80) : ''}`;
  } catch {}

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    logger.error('Supabase Network', `Timeout requête (>15s): ${endpoint}`);
  }, 15000);

  try {
    const response = await fetch(input, {
      ...init,
      signal: init?.signal || controller.signal,
    });
    const duration = Math.round(performance.now() - start);

    if (!response.ok && response.status >= 400) {
      logger.warn('Supabase API', `Statut HTTP ${response.status} (${duration}ms): ${endpoint}`);
    } else if (duration > 3000) {
      logger.warn('Supabase Latency', `Requête lente (${duration}ms): ${endpoint}`);
    } else {
      logger.info('Supabase Query', `Succès (${duration}ms): ${endpoint}`, undefined, duration);
    }

    return response;
  } catch (err: any) {
    const duration = Math.round(performance.now() - start);
    if (err.name === 'AbortError') {
      logger.error('Supabase Timeout', `Requête interrompue après ${duration}ms: ${endpoint}`, { endpoint, duration });
    } else {
      logger.error('Supabase Network', `Erreur réseau (${duration}ms): ${err.message || endpoint}`, { endpoint, error: err.message, duration });
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'wci_auth_token_v3',
    lock: memoryLock
  },
  global: {
    fetch: customFetch
  }
});
