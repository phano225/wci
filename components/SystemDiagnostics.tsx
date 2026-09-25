import React, { useState, useEffect } from 'react';
import { logger, LogEntry } from '../src/logger';
import { supabase } from '../supabase-config';

export const SystemDiagnostics: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ERROR' | 'WARN' | 'SUCCESS'>('ALL');
  const [search, setSearch] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ status: 'IDLE' | 'OK' | 'ERROR'; latencyMs?: number; message?: string }>({ status: 'IDLE' });
  const [authStatus, setAuthStatus] = useState<{ userEmail?: string; tokenExpiry?: string; status: 'CHECKING' | 'LOGGED_IN' | 'ANONYMOUS' }>({ status: 'CHECKING' });

  useEffect(() => {
    const unsubscribe = logger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });

    checkAuth();
    runPingTest();

    return () => unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const expDate = session.expires_at ? new Date(session.expires_at * 1000).toLocaleTimeString('fr-FR') : 'Inconnue';
        setAuthStatus({
          status: 'LOGGED_IN',
          userEmail: session.user.email,
          tokenExpiry: expDate
        });
      } else {
        setAuthStatus({ status: 'ANONYMOUS' });
      }
    } catch (e: any) {
      setAuthStatus({ status: 'ANONYMOUS' });
    }
  };

  const runPingTest = async () => {
    setIsTesting(true);
    setDbStatus({ status: 'IDLE' });
    const start = performance.now();
    try {
      const { data, error } = await supabase.from('categories').select('id').limit(1);
      const latency = Math.round(performance.now() - start);
      if (error) {
        setDbStatus({ status: 'ERROR', latencyMs: latency, message: error.message });
        logger.error('Diagnostic', `Test Supabase échoué (${latency}ms): ${error.message}`, error);
      } else {
        setDbStatus({ status: 'OK', latencyMs: latency });
        logger.success('Diagnostic', `Test de connexion Supabase réussi (${latency}ms)`);
      }
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      setDbStatus({ status: 'ERROR', latencyMs: latency, message: err.message || 'Erreur inconnue' });
      logger.error('Diagnostic', `Exception test Supabase (${latency}ms): ${err.message}`, err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearSession = async () => {
    if (!confirm('Cette action va réinitialiser les clés de session locales et recharger la page. Continuer ?')) return;
    try {
      localStorage.removeItem('wci_auth_token_v3');
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      alert('Erreur réinitialisation session');
    }
  };

  const filteredLogs = logs.filter(entry => {
    if (filter !== 'ALL' && entry.level !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return entry.message.toLowerCase().includes(q) ||
             entry.category.toLowerCase().includes(q) ||
             (entry.details && JSON.stringify(entry.details).toLowerCase().includes(q));
    }
    return true;
  });

  const getBadgeStyle = (level: LogEntry['level']) => {
    switch (level) {
      case 'ERROR': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'WARN': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'SUCCESS': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Database Status Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Base de données Supabase</span>
            <span className={`w-3 h-3 rounded-full ${dbStatus.status === 'OK' ? 'bg-emerald-500 animate-pulse' : dbStatus.status === 'ERROR' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-black text-gray-900">
              {dbStatus.status === 'OK' ? `${dbStatus.latencyMs} ms` : dbStatus.status === 'ERROR' ? 'Erreur' : 'Test en cours...'}
            </span>
            <span className="text-xs font-bold text-gray-400">temps de réponse</span>
          </div>
          <button
            onClick={runPingTest}
            disabled={isTesting}
            className="w-full py-2 bg-gray-50 hover:bg-gray-100 active:scale-98 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition-all flex items-center justify-center gap-2"
          >
            <i className={`fas fa-rotate ${isTesting ? 'animate-spin' : ''}`}></i>
            Tester la connexion
          </button>
        </div>

        {/* Auth Session Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Session Authentification</span>
            <i className="fas fa-shield-alt text-brand-blue"></i>
          </div>
          <div className="mb-3">
            <div className="text-sm font-black text-gray-900 truncate">
              {authStatus.userEmail || 'Non connecté'}
            </div>
            <div className="text-xs text-gray-400">
              Expiration token : {authStatus.tokenExpiry || 'N/A'}
            </div>
          </div>
          <button
            onClick={checkAuth}
            className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition-all"
          >
            Vérifier session
          </button>
        </div>

        {/* Cache & Lock Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Verrous & Stockage Local</span>
            <i className="fas fa-database text-amber-500"></i>
          </div>
          <div className="mb-3">
            <div className="text-sm font-black text-gray-900">
              {logs.length} événements enregistrés
            </div>
            <div className="text-xs text-gray-400">
              Mode de verrouillage séquentiel actif
            </div>
          </div>
          <button
            onClick={handleClearSession}
            className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl border border-red-200 transition-all flex items-center justify-center gap-2"
            title="Utile si une requête semble bloquée indéfiniment"
          >
            <i className="fas fa-trash-can"></i>
            Purger session locale
          </button>
        </div>
      </div>

      {/* Logs Console Container */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">Capteur de logs en temps réel</span>
            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold">
              {filteredLogs.length}
            </span>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-gray-200/60 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${filter === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilter('ERROR')}
                className={`px-3 py-1 rounded-lg transition-all ${filter === 'ERROR' ? 'bg-red-500 text-white shadow-xs' : 'text-gray-500 hover:text-red-600'}`}
              >
                Erreurs
              </button>
              <button
                onClick={() => setFilter('WARN')}
                className={`px-3 py-1 rounded-lg transition-all ${filter === 'WARN' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-500 hover:text-amber-600'}`}
              >
                Avertissements
              </button>
              <button
                onClick={() => setFilter('SUCCESS')}
                className={`px-3 py-1 rounded-lg transition-all ${filter === 'SUCCESS' ? 'bg-emerald-500 text-white shadow-xs' : 'text-gray-500 hover:text-emerald-600'}`}
              >
                Succès
              </button>
            </div>

            <input
              type="text"
              placeholder="Filtrer par texte..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />

            <button
              onClick={() => logger.clearLogs()}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all"
            >
              Effacer
            </button>
          </div>
        </div>

        {/* Logs Table / Stream */}
        <div className="max-h-[500px] overflow-y-auto font-mono text-xs divide-y divide-gray-100">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <i className="fas fa-clipboard-check text-3xl mb-2 text-gray-300"></i>
              <p>Aucun log correspondant pour le moment.</p>
            </div>
          ) : (
            filteredLogs.map(entry => (
              <div key={entry.id} className="p-3 hover:bg-gray-50/80 transition-colors flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-400 font-normal">{entry.timestamp}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeStyle(entry.level)}`}>
                      {entry.level}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 font-bold">
                      {entry.category}
                    </span>
                    <span className="text-gray-800 font-semibold">{entry.message}</span>
                  </div>
                  {entry.durationMs !== undefined && (
                    <span className="text-gray-400 text-[11px] shrink-0 font-bold">
                      {entry.durationMs}ms
                    </span>
                  )}
                </div>
                {entry.details && (
                  <pre className="mt-1 p-2 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-[11px] max-h-32">
                    {typeof entry.details === 'object' ? JSON.stringify(entry.details, null, 2) : String(entry.details)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
