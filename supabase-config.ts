import { createClient } from '@supabase/supabase-js';
import { logger } from './src/logger';

const RAW_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vdbnsfoagmdshylonbyo.supabase.co';
// Supprimer tout slash final pour éviter la formation de double slash //rest/v1
const SUPABASE_URL = RAW_SUPABASE_URL.trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Bypass Web Locks API et locks en mémoire séquentiels : évite tout interblocage (deadlock) réentrant
const bypassLock = ((_name: string, _timeout: number, acquire: () => Promise<any>) => acquire()) as any;

// Wrapper fetch personnalisé avec normalisation d'URL et télémétrie logger
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const start = performance.now();
  
  // Normaliser l'URL pour supprimer d'éventuels doubles slashes parasites
  let cleanInput = input;
  if (typeof input === 'string') {
    cleanInput = input.replace(/([^:])\/\/+/g, '$1/');
  }

  const urlStr = typeof cleanInput === 'string' 
    ? cleanInput 
    : cleanInput instanceof URL 
      ? cleanInput.toString() 
      : (cleanInput as Request).url;
  
  let endpoint = urlStr;
  try {
    const u = new URL(urlStr);
    endpoint = `${u.pathname}${u.search ? u.search.slice(0, 80) : ''}`;
  } catch {}

  const controller = new AbortController();
  const timeoutMs = endpoint.includes('/storage/') ? 60000 : 20000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Utiliser window.fetch ou fetch global avec les options originales
    const fetchFn = (typeof window !== 'undefined' && window.fetch) ? window.fetch.bind(window) : fetch;
    const response = await fetchFn(cleanInput, {
      ...init,
      signal: init?.signal || controller.signal
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
      logger.error('Supabase Timeout', `Requête interrompue après timeout (${duration}ms): ${endpoint}`);
    } else {
      logger.error('Supabase Network', `Échec requête réseau (${duration}ms): ${endpoint}`);
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
    lock: bypassLock
  },
  global: {
    fetch: customFetch
  }
});
