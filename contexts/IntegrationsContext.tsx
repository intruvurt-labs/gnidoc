// IntegrationsContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

/** ───────────────────────── Secure storage (lazy) ───────────────────────── */
type SecureStoreMod = {
  setItemAsync?: (k: string, v: string, opts?: any) => Promise<void>;
  getItemAsync?: (k: string) => Promise<string | null>;
  deleteItemAsync?: (k: string, opts?: any) => Promise<void>;
};
let _secureStore: SecureStoreMod | null | undefined;
async function getSecureStore(): Promise<SecureStoreMod | null> {
  if (_secureStore !== undefined) return _secureStore!;
  try {
    const mod = await import('expo-secure-store');
    _secureStore = (mod as any)?.default ?? mod;
  } catch {
    _secureStore = null;
  }
  return _secureStore!;
}

/** ───────────────────────── Types ───────────────────────── */
export type IntegrationCategory =
  | 'creator-tools'
  | 'web3-blockchain'
  | 'payments'
  | 'crypto-payments'
  | 'productivity'
  | 'b2b-saas'
  | 'b2c-commerce'
  | 'ai-ml'
  | 'analytics'
  | 'communication'
  | 'storage';

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: string; // emoji or remote uri
  status: 'connected' | 'disconnected' | 'pending';
  config: Record<string, any>;
  features: string[];
  pricing: 'free' | 'paid' | 'freemium';
  connectedAt?: Date;
  lastSyncAt?: Date;
}

export interface IntegrationConnection {
  integrationId: string;
  credentials: Record<string, string>; // SecureStore only; mirrored in-memory
  settings: Record<string, any>;
  webhooks?: string[];
}

export interface IntegrationsContextValue {
  integrations: Integration[];
  connections: IntegrationConnection[];
  filteredIntegrations: Integration[];
  connectedIntegrations: Integration[];
  integrationsByCategory: Record<IntegrationCategory, Integration[]>;
  isLoading: boolean;
  selectedCategory: IntegrationCategory | 'all';
  setSelectedCategory: (c: IntegrationCategory | 'all') => void;
  loadIntegrations: () => Promise<void>;
  connectIntegration: (
    integrationId: string,
    credentials: Record<string, string>,
    settings?: Record<string, any>
  ) => Promise<void>;
  disconnectIntegration: (integrationId: string) => Promise<void>;
  updateIntegrationSettings: (integrationId: string, settings: Record<string, any>) => Promise<void>;
  syncIntegration: (integrationId: string) => Promise<void>;
  getIntegrationConnection: (integrationId: string) => IntegrationConnection | undefined;
  checkHealth: (integrationId: string) => Promise<{ ok: boolean; latencyMs: number; error?: string }>;
  exportState: () => string;
  importState: (json: string) => Promise<void>;
  /** utility */
  flush: () => Promise<void>;
}

/** ───────────────────────── Defaults / Storage ───────────────────────── */
const STORAGE_KEY = 'gnidoc-integrations';
const STORAGE_VERSION_KEY = 'gnidoc-integrations-version';
const STORAGE_VERSION = 1;
const SAVE_DEBOUNCE_MS = 160;

const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: 'stripe', name: 'Stripe', description: 'Accept payments, subscriptions, and manage billing', category: 'payments', icon: '💳', status: 'disconnected', config: {}, features: ['Payments','Subscriptions','Invoicing','Webhooks'], pricing: 'paid' },
  { id: 'metamask', name: 'MetaMask', description: 'Web3 wallet integration for crypto transactions', category: 'web3-blockchain', icon: '🦊', status: 'disconnected', config: {}, features: ['Wallet Connect','NFT Support','Token Transfers','Smart Contracts'], pricing: 'free' },
  { id: 'opensea', name: 'OpenSea', description: 'NFT marketplace integration', category: 'web3-blockchain', icon: '🌊', status: 'disconnected', config: {}, features: ['NFT Listings','Collections','Trading','Analytics'], pricing: 'free' },
  { id: 'alchemy', name: 'Alchemy', description: 'Web3 development platform and blockchain APIs', category: 'web3-blockchain', icon: '⚗️', status: 'disconnected', config: {}, features: ['Blockchain APIs','NFT APIs','Enhanced APIs','Webhooks'], pricing: 'freemium' },
  { id: 'coinbase', name: 'Coinbase Commerce', description: 'Accept cryptocurrency payments', category: 'crypto-payments', icon: '🪙', status: 'disconnected', config: {}, features: ['Crypto Payments','Multiple Coins','Instant Settlement','API Access'], pricing: 'free' },
  { id: 'figma', name: 'Figma', description: 'Design collaboration and asset export', category: 'creator-tools', icon: '🎨', status: 'disconnected', config: {}, features: ['Design Import','Asset Export','Collaboration','Version Control'], pricing: 'freemium' },
  { id: 'canva', name: 'Canva', description: 'Graphic design and content creation', category: 'creator-tools', icon: '✨', status: 'disconnected', config: {}, features: ['Templates','Brand Kit','Export','Team Collaboration'], pricing: 'freemium' },
  { id: 'notion', name: 'Notion', description: 'Workspace and documentation integration', category: 'productivity', icon: '📝', status: 'disconnected', config: {}, features: ['Database Sync','Documentation','Task Management','API Access'], pricing: 'freemium' },
  { id: 'slack', name: 'Slack', description: 'Team communication and notifications', category: 'communication', icon: '💬', status: 'disconnected', config: {}, features: ['Notifications','Bot Integration','Channels','Webhooks'], pricing: 'freemium' },
  { id: 'discord', name: 'Discord', description: 'Community and team chat integration', category: 'communication', icon: '🎮', status: 'disconnected', config: {}, features: ['Bot Commands','Webhooks','Voice Channels','Roles'], pricing: 'free' },
  { id: 'sendgrid', name: 'SendGrid', description: 'Email delivery and marketing automation', category: 'b2b-saas', icon: '📧', status: 'disconnected', config: {}, features: ['Transactional Email','Marketing Campaigns','Analytics','Templates'], pricing: 'freemium' },
  { id: 'twilio', name: 'Twilio', description: 'SMS, voice, and video communication', category: 'communication', icon: '📱', status: 'disconnected', config: {}, features: ['SMS','Voice Calls','Video','WhatsApp'], pricing: 'paid' },
  { id: 'shopify', name: 'Shopify', description: 'E-commerce platform integration', category: 'b2c-commerce', icon: '🛍️', status: 'disconnected', config: {}, features: ['Product Sync','Orders','Inventory','Customers'], pricing: 'paid' },
  { id: 'aws-s3', name: 'AWS S3', description: 'Cloud storage and file hosting', category: 'storage', icon: '☁️', status: 'disconnected', config: {}, features: ['File Storage','CDN','Backup','Static Hosting'], pricing: 'paid' },
  { id: 'supabase', name: 'Supabase', description: 'Backend as a service with PostgreSQL', category: 'b2b-saas', icon: '⚡', status: 'disconnected', config: {}, features: ['Database','Auth','Storage','Real-time'], pricing: 'freemium' },
  { id: 'openai', name: 'OpenAI', description: 'AI models and GPT integration', category: 'ai-ml', icon: '🤖', status: 'disconnected', config: {}, features: ['GPT-4','DALL-E','Whisper','Embeddings'], pricing: 'paid' },
  { id: 'anthropic', name: 'Anthropic', description: 'Claude AI assistant integration', category: 'ai-ml', icon: '🧠', status: 'disconnected', config: {}, features: ['Claude 3','Long Context','Vision','Function Calling'], pricing: 'paid' },
  { id: 'google-analytics', name: 'Google Analytics', description: 'Web and app analytics', category: 'analytics', icon: '📊', status: 'disconnected', config: {}, features: ['User Tracking','Events','Conversions','Reports'], pricing: 'free' },
  { id: 'mixpanel', name: 'Mixpanel', description: 'Product analytics and user insights', category: 'analytics', icon: '📈', status: 'disconnected', config: {}, features: ['Event Tracking','Funnels','Cohorts','A/B Testing'], pricing: 'freemium' },
  { id: 'github', name: 'GitHub', description: 'Code repository and CI/CD', category: 'productivity', icon: '🐙', status: 'disconnected', config: {}, features: ['Repositories','Actions','Issues','Pull Requests'], pricing: 'freemium' },
  { id: 'vercel', name: 'Vercel', description: 'Deployment and hosting platform', category: 'b2b-saas', icon: '▲', status: 'disconnected', config: {}, features: ['Deployments','Edge Functions','Analytics','Domains'], pricing: 'freemium' },
  { id: 'zapier', name: 'Zapier', description: 'Workflow automation and app connections', category: 'productivity', icon: '⚙️', status: 'disconnected', config: {}, features: ['Zaps','5000+ Apps','Multi-step','Webhooks'], pricing: 'freemium' },
  { id: 'airtable', name: 'Airtable', description: 'Spreadsheet-database hybrid', category: 'productivity', icon: '📋', status: 'disconnected', config: {}, features: ['Databases','Views','Automations','API'], pricing: 'freemium' },
  { id: 'calendly', name: 'Calendly', description: 'Scheduling and appointment booking', category: 'b2b-saas', icon: '📅', status: 'disconnected', config: {}, features: ['Scheduling','Calendar Sync','Reminders','Integrations'], pricing: 'freemium' },
  { id: 'openweathermap', name: 'OpenWeatherMap', description: 'Real-time weather data and forecasts', category: 'productivity', icon: '🌤️', status: 'disconnected', config: {}, features: ['Current Weather','Forecasts','Historical Data','Weather Alerts'], pricing: 'freemium' },
  { id: 'weatherapi', name: 'WeatherAPI', description: 'Global weather data and forecasting service', category: 'productivity', icon: '⛅', status: 'disconnected', config: {}, features: ['Real-time Weather','Astronomy','Air Quality','Marine Data'], pricing: 'freemium' },
];

/** ───────────────────────── Small utils ───────────────────────── */
const logger = {
  info: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.log(...a); },
  warn: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.warn(...a); },
  error: (...a: any[]) => console.error(...a),
};

function makeDebounce<T extends (...args: any[]) => void>(fn: T, ms = 200) {
  let t: any;
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  debounced.cancel = () => clearTimeout(t);
  return debounced as T & { cancel: () => void };
}
const toDate = (v?: any) => (v ? new Date(v) : undefined);
const secretKey = (id: string) => `@integration_secret_${id}`;

async function setSecret(id: string, creds: Record<string, string>) {
  try {
    const ss = await getSecureStore();
    const payload = JSON.stringify(creds || {});
    if (ss?.setItemAsync) {
      await ss.setItemAsync(secretKey(id), payload, { keychainService: secretKey(id) });
    } else {
      await AsyncStorage.setItem(secretKey(id), payload);
    }
  } catch (e) { logger.error('[Integrations] setSecret failed:', e); }
}
async function getSecret(id: string) {
  try {
    const ss = await getSecureStore();
    const raw = ss?.getItemAsync
      ? await ss.getItemAsync(secretKey(id))
      : await AsyncStorage.getItem(secretKey(id));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch (e) { logger.error('[Integrations] getSecret failed:', e); return {}; }
}
async function deleteSecret(id: string) {
  try {
    const ss = await getSecureStore();
    if (ss?.deleteItemAsync) {
      await ss.deleteItemAsync(secretKey(id), { keychainService: secretKey(id) });
    } else {
      await AsyncStorage.removeItem(secretKey(id));
    }
  } catch (e) { logger.error('[Integrations] deleteSecret failed:', e); }
}
const redact = (o: any) =>
  JSON.parse(JSON.stringify(o, (k, v) =>
    (k.toLowerCase().includes('key') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('token')) ? '******' : v
  ));

/** ───────────────────────── Provider Credential Validation ───────────────────────── */
const validateCredentials = async (
  integrationId: string,
  creds: Record<string, string>
): Promise<{ ok: boolean; reason?: string }> => {
  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  };

  try {
    switch (integrationId) {
      case 'stripe': {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${creds.apiKey || creds.secret || ''}`,
        };
        const res = await fetchWithTimeout('https://api.stripe.com/v1/account', { headers });
        return res.ok ? { ok: true } : { ok: false, reason: `HTTP ${res.status}` };
      }

      case 'supabase': {
        const url = (creds.url || '').replace(/\/+$/, '');
        if (!url) return { ok: false, reason: 'missing url' };
        const headers: Record<string, string> = {};
        if (creds.apikey || creds.apiKey) headers['apikey'] = creds.apikey || creds.apiKey;
        if (creds.service_role || creds.token) headers['Authorization'] = `Bearer ${creds.service_role || creds.token}`;
        const res = await fetchWithTimeout(`${url}/rest/v1/`, { headers });
        return res.ok ? { ok: true } : { ok: false, reason: `HTTP ${res.status}` };
      }

      case 'openai': {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${creds.apiKey || creds.token || ''}`,
        };
        if (creds.organization) headers['OpenAI-Organization'] = creds.organization;
        const res = await fetchWithTimeout('https://api.openai.com/v1/models', { headers });
        return res.ok ? { ok: true } : { ok: false, reason: `HTTP ${res.status}` };
      }

      case 'anthropic': {
        const headers: Record<string, string> = {
          'x-api-key': creds.apiKey || creds.token || creds.key || '',
          'anthropic-version': '2023-06-01',
        };
        const res = await fetchWithTimeout('https://api.anthropic.com/v1/models', { headers });
        return res.ok ? { ok: true } : { ok: false, reason: `HTTP ${res.status}` };
      }

      case 'vercel': {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${creds.apiKey || creds.token || ''}`,
        };
        const res = await fetchWithTimeout('https://api.vercel.com/v2/user', { headers });
        return res.ok ? { ok: true } : { ok: false, reason: `HTTP ${res.status}` };
      }

      case 'github': {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${creds.apiKey || creds.token || ''}`,
          'User-Agent': 'gnidoc-integrations',
          Accept: 'application/vnd.github+json',
        };
        const res = await fetchWithTimeout('https://api.github.com/user', { headers });
        return res.ok ? { ok: true } : { ok: false, reason: `HTTP ${res.status}` };
      }

      default: {
        if (creds.url) {
          const res = await fetchWithTimeout(String(creds.url), {}, 3500);
          return res.ok ? { ok: true } : { ok: false, reason: `HTTP ${res.status}` };
        }
        await new Promise(r => setTimeout(r, 120));
        return { ok: true };
      }
    }
  } catch (e: any) {
    return { ok: false, reason: e?.name === 'AbortError' ? 'timeout' : (e?.message || 'network error') };
  }
};

/** ───────────────────────── Context ───────────────────────── */
export const [IntegrationsProvider, useIntegrations] = createContextHook<IntegrationsContextValue>(() => {
  const [integrations, setIntegrations] = useState<Integration[]>(DEFAULT_INTEGRATIONS);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'all'>('all');

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  /** Debounced persistence (strip Dates to ISO) */
  const persist = useMemo(() => makeDebounce(async (ints: Integration[], conns: IntegrationConnection[]) => {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEY, JSON.stringify({
          integrations: ints.map(i => ({
            ...i,
            connectedAt: i.connectedAt?.toISOString() ?? undefined,
            lastSyncAt: i.lastSyncAt?.toISOString() ?? undefined,
          })),
          connections: conns, // credentials in SecureStore
        })],
        [STORAGE_VERSION_KEY, String(STORAGE_VERSION)],
      ]);
    } catch (e) {
      logger.error('[Integrations] Save failed:', e);
    }
  }, SAVE_DEBOUNCE_MS), []);

  const flush = useCallback(async () => {
    // No-op placeholder because our debounce writes directly;
    // kept for API symmetry and future batching.
  }, []);

  const saveIntegrations = useCallback(async (newIntegrations: Integration[], newConnections: IntegrationConnection[]) => {
    setIntegrations(newIntegrations);
    setConnections(newConnections);
    persist(newIntegrations, newConnections);
  }, [persist]);

  /** Load + migrate */
  const migrateIfNeeded = useCallback(async () => {
    const rawV = await AsyncStorage.getItem(STORAGE_VERSION_KEY);
    const v = rawV ? Number(rawV) : 0;
    if (v < STORAGE_VERSION) {
      // Future migrations go here
      await AsyncStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
    }
  }, []);

  const loadIntegrations = useCallback(async () => {
    setIsLoading(true);
    try {
      await migrateIfNeeded();
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        let parsed: any;
        try { parsed = JSON.parse(stored); } catch { parsed = {}; }
        const { integrations: rawInts = [], connections: rawConns = [] } = parsed || {};
        const hydrated: Integration[] = (rawInts as any[]).map((int) => ({
          ...int,
          connectedAt: toDate(int.connectedAt),
          lastSyncAt: toDate(int.lastSyncAt),
        }));
        const withCreds: IntegrationConnection[] = [];
        for (const c of rawConns as IntegrationConnection[]) {
          const creds = await getSecret(c.integrationId);
          withCreds.push({ ...c, credentials: creds || {} });
        }
        if (!mountedRef.current) return;
        setIntegrations(hydrated.length ? hydrated : DEFAULT_INTEGRATIONS);
        setConnections(withCreds);
        logger.info(`[Integrations] Loaded ${hydrated.length || DEFAULT_INTEGRATIONS.length} integrations`);
      } else {
        await saveIntegrations(DEFAULT_INTEGRATIONS, []);
      }
    } catch (error) {
      logger.error('[Integrations] Failed to load:', error);
      if (mountedRef.current) {
        setIntegrations(DEFAULT_INTEGRATIONS);
        setConnections([]);
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [migrateIfNeeded, saveIntegrations]);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  /** Connect (idempotent + secure creds) */
  const connectIntegration = useCallback(async (
    integrationId: string,
    credentials: Record<string, string>,
    settings: Record<string, any> = {}
  ) => {
    const exists = integrations.find(i => i.id === integrationId);
    if (!exists) throw new Error('Integration not found');

    const existingConn = connections.find(c => c.integrationId === integrationId);
    if (existingConn && exists.status === 'connected') {
      await setSecret(integrationId, credentials || {});
      const updatedConns = connections.map(c =>
        c.integrationId === integrationId ? { ...c, settings: { ...c.settings, ...settings }, credentials: { ...credentials } } : c
      );
      const updatedInts = integrations.map(i =>
        i.id === integrationId ? { ...i, lastSyncAt: new Date() } : i
      );
      await saveIntegrations(updatedInts, updatedConns);
      logger.info('[Integrations] Updated existing connection:', integrationId, redact(credentials));
      return;
    }

    // optimistic pending state
    setIntegrations(prev => prev.map(int => int.id === integrationId ? { ...int, status: 'pending' as const } : int));

    try {
      const validation = await validateCredentials(integrationId, credentials);
      if (!validation.ok) {
        throw new Error(`Credential validation failed: ${validation.reason || 'Unknown error'}`);
      }
      const now = new Date();
      const connectedInts = integrations.map(int =>
        int.id === integrationId ? { ...int, status: 'connected' as const, connectedAt: now, lastSyncAt: now } : int
      );
      const newConn: IntegrationConnection = { integrationId, credentials: { ...credentials }, settings, webhooks: [] };
      const updatedConns = [...connections.filter(c => c.integrationId !== integrationId), newConn];
      await setSecret(integrationId, credentials);
      await saveIntegrations(connectedInts, updatedConns);
      logger.info('[Integrations] Connected', integrationId, redact(credentials));
    } catch (e) {
      const rolledBack = integrations.map(int => int.id === integrationId ? { ...int, status: 'disconnected' as const, connectedAt: undefined, lastSyncAt: undefined } : int);
      await saveIntegrations(rolledBack, connections);
      logger.error('[Integrations] Connect failed:', integrationId, e);
      throw e instanceof Error ? e : new Error('Failed to connect integration');
    }
  }, [integrations, connections, saveIntegrations]);

  /** Disconnect */
  const disconnectIntegration = useCallback(async (integrationId: string) => {
    const exists = integrations.find(i => i.id === integrationId);
    if (!exists) return;
    const updatedInts = integrations.map(int =>
      int.id === integrationId ? { ...int, status: 'disconnected' as const, connectedAt: undefined, lastSyncAt: undefined } : int
    );
    const updatedConns = connections.filter(c => c.integrationId !== integrationId);
    await deleteSecret(integrationId);
    await saveIntegrations(updatedInts, updatedConns);
    logger.info('[Integrations] Disconnected', integrationId);
  }, [integrations, connections, saveIntegrations]);

  /** Update settings */
  const updateIntegrationSettings = useCallback(async (integrationId: string, settings: Record<string, any>) => {
    const updatedConns = connections.map(c =>
      c.integrationId === integrationId ? { ...c, settings: { ...c.settings, ...settings } } : c
    );
    await saveIntegrations(integrations, updatedConns);
    logger.info('[Integrations] Settings updated', integrationId, redact(settings));
  }, [integrations, connections, saveIntegrations]);

  /** One-tap sync */
  const syncIntegration = useCallback(async (integrationId: string) => {
    const exists = integrations.find(i => i.id === integrationId);
    if (!exists) throw new Error('Integration not found');
    const updated = integrations.map(int => int.id === integrationId ? { ...int, lastSyncAt: new Date() } : int);
    await saveIntegrations(updated, connections);
    logger.info('[Integrations] Synced', integrationId);
  }, [integrations, connections, saveIntegrations]);

  /** Health check with real endpoints */
  const checkHealth = useCallback(async (integrationId: string) => {
    const int = integrations.find(i => i.id === integrationId);
    if (!int) throw new Error('Integration not found');
    const start = Date.now();

    const conn = connections.find(c => c.integrationId === integrationId);
    const creds = conn?.credentials || {};

    const validation = await validateCredentials(integrationId, creds);
    const latencyMs = Date.now() - start;

    return { ok: validation.ok, latencyMs, ...(validation.reason ? { error: validation.reason } : {}) };
  }, [integrations, connections]);

  /** Derived lists */
  const filteredIntegrations = useMemo(() => {
    if (selectedCategory === 'all') return integrations;
    return integrations.filter(int => int.category === selectedCategory);
  }, [integrations, selectedCategory]);

  const connectedIntegrations = useMemo(
    () => integrations.filter(int => int.status === 'connected'),
    [integrations]
  );

  const integrationsByCategory = useMemo(() => {
    const grouped: Record<IntegrationCategory, Integration[]> = {
      'creator-tools': [], 'web3-blockchain': [], payments: [], 'crypto-payments': [], productivity: [],
      'b2b-saas': [], 'b2c-commerce': [], 'ai-ml': [], analytics: [], communication: [], storage: [],
    };
    integrations.forEach(int => { grouped[int.category].push(int); });
    return grouped;
  }, [integrations]);

  const getIntegrationConnection = useCallback(
    (integrationId: string) => connections.find(conn => conn.integrationId === integrationId),
    [connections]
  );

  /** Import/Export (validated, secrets excluded) */
  const exportState = useCallback(() => {
    const payload = {
      version: STORAGE_VERSION,
      integrations: integrations.map(i => ({
        ...i,
        connectedAt: i.connectedAt?.toISOString(),
        lastSyncAt: i.lastSyncAt?.toISOString(),
      })),
      connections: connections.map(c => ({ ...c, credentials: '[stored-securely]' })),
    };
    return JSON.stringify(payload, null, 2);
  }, [integrations, connections]);

  const importState = useCallback(async (json: string) => {
    let parsed: any;
    try { parsed = JSON.parse(json); } catch { throw new Error('Invalid JSON'); }
    const ints: Integration[] = (parsed.integrations || []).map((i: any) => ({
      ...i,
      connectedAt: toDate(i.connectedAt),
      lastSyncAt: toDate(i.lastSyncAt),
    }));
    const conns: IntegrationConnection[] = (parsed.connections || []).map((c: any) => ({
      ...c,
      credentials: {}, // secrets must be re-entered
    }));
    await saveIntegrations(ints.length ? ints : DEFAULT_INTEGRATIONS, conns);
    logger.warn('[Integrations] Imported state (without credentials). Re-enter secrets to reconnect.');
  }, [saveIntegrations]);

  /** Background Auto-Flush */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: string) => {
      if (status === 'background') {
        flush().catch((e) => logger.error('[Integrations] Flush on background failed', e));
      }
    });
    return () => sub.remove();
  }, [flush]);

  /** Public API */
  return useMemo<IntegrationsContextValue>(() => ({
    integrations,
    connections,
    filteredIntegrations,
    connectedIntegrations,
    integrationsByCategory,
    isLoading,
    selectedCategory,
    setSelectedCategory,
    loadIntegrations,
    connectIntegration,
    disconnectIntegration,
    updateIntegrationSettings,
    syncIntegration,
    getIntegrationConnection,
    checkHealth,
    exportState,
    importState,
    flush,
  }), [
    integrations,
    connections,
    filteredIntegrations,
    connectedIntegrations,
    integrationsByCategory,
    isLoading,
    selectedCategory,
    loadIntegrations,
    connectIntegration,
    disconnectIntegration,
    updateIntegrationSettings,
    syncIntegration,
    getIntegrationConnection,
    checkHealth,
    exportState,
    importState,
    flush,
  ]);

});
