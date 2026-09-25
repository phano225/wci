export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  category: string;
  message: string;
  details?: any;
  durationMs?: number;
}

type LogListener = (logs: LogEntry[]) => void;

const STORAGE_KEY = 'wci_system_logs';
const MAX_LOGS = 150;

class SystemLogger {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();

  constructor() {
    this.loadFromStorage();
    this.setupGlobalHandlers();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored).slice(-MAX_LOGS);
      }
    } catch {
      this.logs = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(-MAX_LOGS)));
    } catch {
      // Ignore quota exceeded errors
    }
  }

  private notify() {
    const current = [...this.logs];
    this.listeners.forEach(fn => {
      try { fn(current); } catch {}
    });
  }

  private addEntry(level: LogEntry['level'], category: string, message: string, details?: any, durationMs?: number) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0'),
      level,
      category,
      message,
      details: details ? (typeof details === 'object' ? JSON.parse(JSON.stringify(details, this.getCircularReplacer())) : String(details)) : undefined,
      durationMs
    };

    this.logs.unshift(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    this.saveToStorage();
    this.notify();

    // Mirror to standard console
    const prefix = `[WCI ${level}][${category}] ${message}`;
    if (level === 'ERROR') {
      console.error(prefix, details || '');
    } else if (level === 'WARN') {
      console.warn(prefix, details || '');
    } else {
      console.log(prefix, details || '');
    }
  }

  private getCircularReplacer() {
    const seen = new WeakSet();
    return (_key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    };
  }

  private setupGlobalHandlers() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.error('Window Error', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('Promise Rejection', event.reason?.message || event.reason, {
        stack: event.reason?.stack
      });
    });
  }

  public info(category: string, message: string, details?: any, durationMs?: number) {
    this.addEntry('INFO', category, message, details, durationMs);
  }

  public warn(category: string, message: string, details?: any, durationMs?: number) {
    this.addEntry('WARN', category, message, details, durationMs);
  }

  public error(category: string, message: string, details?: any, durationMs?: number) {
    this.addEntry('ERROR', category, message, details, durationMs);
  }

  public success(category: string, message: string, details?: any, durationMs?: number) {
    this.addEntry('SUCCESS', category, message, details, durationMs);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.notify();
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const logger = new SystemLogger();
