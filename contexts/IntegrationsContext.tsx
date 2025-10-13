// IntegrationsContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Secure secrets with graceful fallback */
let SecureStore: typeof import('expo-secure-store') | null = null;
(async () => {
  try { SecureStore = await import('expo-secure-store'); } catch { SecureStore = null; }
})();

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: string;
  status: 'connected' | 'disconnected' | 'pending';
  config: Record<string, any>;
  features: string[];
  pricing: 'free' | 'paid' | 'freemium';
  connectedAt?: Date;
  lastSyncAt?: Date;
}

export type IntegrationCategory =
  | 'creator-tools'
  | 'web3-blockchain'
  | 'crypto-payments'
  | 'productivity'
  | 'b2b-saas'
  | 'b2c-commerce'
  | 'ai-ml'
  | 'analytics'
  | 'communication'
  | 'storage';

export interface IntegrationConnection {
  integrationId: string;
  credentials: Record<string, string>; // stored in SecureStore; mirrored in-memory only
  settings: Record<string, any>;
  webhooks?: string[];
}

/** ───────────────────────── Defaults / Storage ───────────────────────── **/
const STORAGE_KEY = 'gnidoc-integrations';
const SAVE_DEBOUNCE_MS = 160;

const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: 'stripe', name: 'Stripe', description: 'Accept payments, subscriptions, and manage billing', category: 'crypto-payments', icon: '💳', status: 'disconnected', config: {}, features: ['Payments','Subscriptions','Invoicing','Webhooks'], pricing: 'paid' },
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

/** ───────────────────────── Small utils ───────────────────────── **/
const logger = {
  info: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.log(...a); },
  warn: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.warn(...a); },
  error: (...a: any[]) => console.error(...a),
};

function debounce<T extends (...args: any[]) => void>(fn: T, ms = 200) {
  let t: any; return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const toDate = (v?: any) => (v ? new Date(v) : undefined);
const secretKey = (id: string) => `@integration_secret_${id}`;
async function setSecret(id: string, creds: Record<string, string>) {
  try {
    const payload = JSON.stringify(creds || {});
    if (SecureStore?.setItemAsync) {
      await SecureStore.setItemAsync(secretKey(id), payload, { keychainService: secretKey(id) });
    } else {
      await AsyncStorage.setItem(secretKey(id), payload);
    }
  } catch (e) { logger.error('[Integrations] setSecret failed:', e); }
}
async function getSecret(id: string) {
  try {
    const raw = SecureStore?.getItemAsync
      ? await SecureStore.getItemAsync(secretKey(id))
      : await AsyncStorage.getItem(secretKey(id));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch (e) { logger.error('[Integrations] getSecret failed:', e); return {}; }
}
async function deleteSecret(id: string) {
  try {
    if (SecureStore?.deleteItemAsync) {
      await SecureStore.deleteItemAsync(secretKey(id), { keychainService: secretKey(id) });
    } else {
      await AsyncStorage.removeItem(secretKey(id));
    }
  } catch (e) { logger.error('[Integrations] deleteSecret failed:', e); }
}
const redact = (o: any) => JSON.parse(JSON.stringify(o, (k, v) => (k.toLowerCase().includes('key') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('token') ? '******' : v)));

/** ───────────────────────── Context ───────────────────────── **/
export const [IntegrationsProvider, useIntegrations] = createContextHook(() => {
  const [integrations, setIntegrations] = useState<Integration[]>(DEFAULT_INTEGRATIONS);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'all'>('all');

  // Prevent overlapping saves
  const saveQueued = useRef(false);

  /** Debounced persistence (strip Dates to ISO) */
  const persist = useCallback(
    debounce(async (ints: Integration[], conns: IntegrationConnection[]) => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            integrations: ints.map(i => ({
              ...i,
              connectedAt: i.connectedAt?.toISOString() ?? undefined,
              lastSyncAt: i.lastSyncAt?.toISOString() ?? undefined,
            })),
            connections: conns, // credentials live in SecureStore; this is settings only mirror
          })
        );
      } catch (e) { logger.error('[Integrations] Save failed:', e); }
      finally { saveQueued.current = false; }
    }, SAVE_DEBOUNCE_MS),
    []
  );

  const saveIntegrations = useCallback(async (newIntegrations: Integration[], newConnections: IntegrationConnection[]) => {
    setIntegrations(newIntegrations);
    setConnections(newConnections);
    if (!saveQueued.current) {
      saveQueued.current = true;
      persist(newIntegrations, newConnections);
    }
  }, [persist]);

  /** Load persisted state (rehydrate dates + secrets) */
  const loadIntegrations = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { integrations: rawInts = [], connections: rawConns = [] } = JSON.parse(stored) || {};
        const hydrated: Integration[] = (rawInts as any[]).map(int => ({
          ...int,
          connectedAt: toDate(int.connectedAt),
          lastSyncAt: toDate(int.lastSyncAt),
        }));
        // Rehydrate credentials for in-memory convenience (still stored securely)
        const withCreds: IntegrationConnection[] = [];
        for (const c of rawConns as IntegrationConnection[]) {
          const creds = await getSecret(c.integrationId);
          withCreds.push({ ...c, credentials: creds });
        }
        setIntegrations(hydrated.length ? hydrated : DEFAULT_INTEGRATIONS);
        setConnections(withCreds);
        logger.info(`[Integrations] Loaded ${hydrated.length || DEFAULT_INTEGRATIONS.length} integrations`);
      } else {
        // First run: seed defaults
        await saveIntegrations(DEFAULT_INTEGRATIONS, []);
      }
    } catch (error) {
      logger.error('[Integrations] Failed to load:', error);
    } finally {
      setIsLoading(false);
    }
  }, [saveIntegrations]);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  /** Connect (idempotent + secure creds) */
  const connectIntegration = useCallback(async (
    integrationId: string,
    credentials: Record<string, string>,
    settings: Record<string, any> = {}
  ) => {
    const exists = integrations.find(i => i.id === integrationId);
    if (!exists) throw new Error('Integration not found');

    // Prevent duplicate connections
    const already = connections.find(c => c.integrationId === integrationId);
    if (already && exists.status === 'connected') {
      // Update credentials/settings if reconnect
      await setSecret(integrationId, credentials || {});
      const updatedConns = connections.map(c => c.integrationId === integrationId ? { ...c, settings: { ...c.settings, ...settings }, credentials: { ...credentials } } : c);
      const updatedInts = integrations.map(i => i.id === integrationId ? { ...i, lastSyncAt: new Date() } : i);
      await saveIntegrations(updatedInts, updatedConns);
      logger.info('[Integrations] Updated existing connection:', integrationId, redact(credentials));
      return;
    }

    const updatedInts = integrations.map(int =>
      int.id === integrationId ? { ...int, status: 'pending' as const } : int
    );
    setIntegrations(updatedInts);

    try {
      // Simulate health check / token validation hook (optional)
      // await validateCredentials(integrationId, credentials);

      const now = new Date();
      const connectedInts = updatedInts.map(int =>
        int.id === integrationId ? { ...int, status: 'connected' as const, connectedAt: now, lastSyncAt: now } : int
      );

      const newConn: IntegrationConnection = { integrationId, credentials: { ...credentials }, settings, webhooks: [] };
      const updatedConns = [...connections.filter(c => c.integrationId !== integrationId), newConn];

      // Persist secrets securely
      await setSecret(integrationId, credentials);
      await saveIntegrations(connectedInts, updatedConns);

      logger.info('[Integrations] Connected', integrationId, redact(credentials));
    } catch (e) {
      // Rollback status on failure
      const rolledBack = integrations.map(int => int.id === integrationId ? { ...int, status: 'disconnected' as const } : int);
      await saveIntegrations(rolledBack, connections);
      logger.error('[Integrations] Connect failed:', integrationId, e);
      throw e instanceof Error ? e : new Error('Failed to connect integration');
    }
  }, [integrations, connections, saveIntegrations]);

  /** Disconnect (idempotent + secret purge) */
  const disconnectIntegration = useCallback(async (integrationId: string) => {
    const exists = integrations.find(i => i.id === integrationId);
    if (!exists) return;

    const updatedInts = integrations.map(int =>
      int.id === integrationId
        ? { ...int, status: 'disconnected' as const, connectedAt: undefined, lastSyncAt: undefined }
        : int
    );
    const updatedConns = connections.filter(c => c.integrationId !== integrationId);

    await deleteSecret(integrationId);
    await saveIntegrations(updatedInts, updatedConns);
    logger.info('[Integrations] Disconnected', integrationId);
  }, [integrations, connections, saveIntegrations]);

  /** Update settings only (keeps creds untouched unless explicitly provided elsewhere) */
  const updateIntegrationSettings = useCallback(async (integrationId: string, settings: Record<string, any>) => {
    const updatedConns = connections.map(c =>
      c.integrationId === integrationId ? { ...c, settings: { ...c.settings, ...settings } } : c
    );
    await saveIntegrations(integrations, updatedConns);
    logger.info('[Integrations] Settings updated', integrationId, redact(settings));
  }, [integrations, connections, saveIntegrations]);

  /** One-tap sync (updates lastSyncAt; your app can call remote APIs here) */
  const syncIntegration = useCallback(async (integrationId: string) => {
    const exists = integrations.find(i => i.id === integrationId);
    if (!exists) throw new Error('Integration not found');
    const updated = integrations.map(int => int.id === integrationId ? { ...int, lastSyncAt: new Date() } : int);
    await saveIntegrations(updated, connections);
    logger.info('[Integrations] Synced', integrationId);
  }, [integrations, connections, saveIntegrations]);

  /** Optional: quick health check stub (replace with real API pings) */
  const checkHealth = useCallback(async (integrationId: string) => {
    const int = integrations.find(i => i.id === integrationId);
    if (!int) throw new Error('Integration not found');
    // Fake latency + status
    const start = Date.now();
    await new Promise(r => setTimeout(r, 150));
    return { ok: int.status === 'connected', latencyMs: Date.now() - start };
  }, [integrations]);

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
      'creator-tools': [], 'web3-blockchain': [], 'crypto-payments': [], productivity: [],
      'b2b-saas': [], 'b2c-commerce': [], 'ai-ml': [], analytics: [], communication: [], storage: [],
    };
    integrations.forEach(int => { grouped[int.category].push(int); });
    return grouped;
  }, [integrations]);

  const getIntegrationConnection = useCallback(
    (integrationId: string) => connections.find(conn => conn.integrationId === integrationId),
    [connections]
  );

  /** DX helpers: import/export (no secrets in export) */
  const exportState = useCallback(() => {
    const payload = {
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
    const parsed = JSON.parse(json);
    const ints: Integration[] = (parsed.integrations || []).map((i: any) => ({
      ...i,
      connectedAt: toDate(i.connectedAt),
      lastSyncAt: toDate(i.lastSyncAt),
    }));
    const conns: IntegrationConnection[] = (parsed.connections || []).map((c: any) => ({
      ...c,
      credentials: {}, // do not trust imported secrets
    }));
    await saveIntegrations(ints.length ? ints : DEFAULT_INTEGRATIONS, conns);
    logger.warn('[Integrations] Imported state (without credentials). Re-enter secrets to reconnect.');
  }, [saveIntegrations]);

  /** Public API (unchanged + extras) */
  return useMemo(() => ({
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
    // extras
    checkHealth,
    exportState,
    importState,
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
  ]);
});

/** (Optional) If you later add real credential validation per provider */
// async function validateCredentials(integrationId: string, creds: Record<string,string>) {
//   if (!creds || !Object.keys(creds).length) throw new Error('Missing credentials');
//   // Add provider-specific checks here (e.g., ping API, list resources, etc.)
// }
