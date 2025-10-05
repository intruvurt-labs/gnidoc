import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  credentials: Record<string, string>;
  settings: Record<string, any>;
  webhooks?: string[];
}

const STORAGE_KEY = 'gnidoc-integrations';

const DEFAULT_INTEGRATIONS: Integration[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments, subscriptions, and manage billing',
    category: 'crypto-payments',
    icon: '💳',
    status: 'disconnected',
    config: {},
    features: ['Payments', 'Subscriptions', 'Invoicing', 'Webhooks'],
    pricing: 'paid',
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'Web3 wallet integration for crypto transactions',
    category: 'web3-blockchain',
    icon: '🦊',
    status: 'disconnected',
    config: {},
    features: ['Wallet Connect', 'NFT Support', 'Token Transfers', 'Smart Contracts'],
    pricing: 'free',
  },
  {
    id: 'opensea',
    name: 'OpenSea',
    description: 'NFT marketplace integration',
    category: 'web3-blockchain',
    icon: '🌊',
    status: 'disconnected',
    config: {},
    features: ['NFT Listings', 'Collections', 'Trading', 'Analytics'],
    pricing: 'free',
  },
  {
    id: 'alchemy',
    name: 'Alchemy',
    description: 'Web3 development platform and blockchain APIs',
    category: 'web3-blockchain',
    icon: '⚗️',
    status: 'disconnected',
    config: {},
    features: ['Blockchain APIs', 'NFT APIs', 'Enhanced APIs', 'Webhooks'],
    pricing: 'freemium',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Commerce',
    description: 'Accept cryptocurrency payments',
    category: 'crypto-payments',
    icon: '🪙',
    status: 'disconnected',
    config: {},
    features: ['Crypto Payments', 'Multiple Coins', 'Instant Settlement', 'API Access'],
    pricing: 'free',
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Design collaboration and asset export',
    category: 'creator-tools',
    icon: '🎨',
    status: 'disconnected',
    config: {},
    features: ['Design Import', 'Asset Export', 'Collaboration', 'Version Control'],
    pricing: 'freemium',
  },
  {
    id: 'canva',
    name: 'Canva',
    description: 'Graphic design and content creation',
    category: 'creator-tools',
    icon: '✨',
    status: 'disconnected',
    config: {},
    features: ['Templates', 'Brand Kit', 'Export', 'Team Collaboration'],
    pricing: 'freemium',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Workspace and documentation integration',
    category: 'productivity',
    icon: '📝',
    status: 'disconnected',
    config: {},
    features: ['Database Sync', 'Documentation', 'Task Management', 'API Access'],
    pricing: 'freemium',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team communication and notifications',
    category: 'communication',
    icon: '💬',
    status: 'disconnected',
    config: {},
    features: ['Notifications', 'Bot Integration', 'Channels', 'Webhooks'],
    pricing: 'freemium',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Community and team chat integration',
    category: 'communication',
    icon: '🎮',
    status: 'disconnected',
    config: {},
    features: ['Bot Commands', 'Webhooks', 'Voice Channels', 'Roles'],
    pricing: 'free',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Email delivery and marketing automation',
    category: 'b2b-saas',
    icon: '📧',
    status: 'disconnected',
    config: {},
    features: ['Transactional Email', 'Marketing Campaigns', 'Analytics', 'Templates'],
    pricing: 'freemium',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS, voice, and video communication',
    category: 'communication',
    icon: '📱',
    status: 'disconnected',
    config: {},
    features: ['SMS', 'Voice Calls', 'Video', 'WhatsApp'],
    pricing: 'paid',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'E-commerce platform integration',
    category: 'b2c-commerce',
    icon: '🛍️',
    status: 'disconnected',
    config: {},
    features: ['Product Sync', 'Orders', 'Inventory', 'Customers'],
    pricing: 'paid',
  },
  {
    id: 'aws-s3',
    name: 'AWS S3',
    description: 'Cloud storage and file hosting',
    category: 'storage',
    icon: '☁️',
    status: 'disconnected',
    config: {},
    features: ['File Storage', 'CDN', 'Backup', 'Static Hosting'],
    pricing: 'paid',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Backend as a service with PostgreSQL',
    category: 'b2b-saas',
    icon: '⚡',
    status: 'disconnected',
    config: {},
    features: ['Database', 'Auth', 'Storage', 'Real-time'],
    pricing: 'freemium',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'AI models and GPT integration',
    category: 'ai-ml',
    icon: '🤖',
    status: 'disconnected',
    config: {},
    features: ['GPT-4', 'DALL-E', 'Whisper', 'Embeddings'],
    pricing: 'paid',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude AI assistant integration',
    category: 'ai-ml',
    icon: '🧠',
    status: 'disconnected',
    config: {},
    features: ['Claude 3', 'Long Context', 'Vision', 'Function Calling'],
    pricing: 'paid',
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Web and app analytics',
    category: 'analytics',
    icon: '📊',
    status: 'disconnected',
    config: {},
    features: ['User Tracking', 'Events', 'Conversions', 'Reports'],
    pricing: 'free',
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    description: 'Product analytics and user insights',
    category: 'analytics',
    icon: '📈',
    status: 'disconnected',
    config: {},
    features: ['Event Tracking', 'Funnels', 'Cohorts', 'A/B Testing'],
    pricing: 'freemium',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Code repository and CI/CD',
    category: 'productivity',
    icon: '🐙',
    status: 'disconnected',
    config: {},
    features: ['Repositories', 'Actions', 'Issues', 'Pull Requests'],
    pricing: 'freemium',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deployment and hosting platform',
    category: 'b2b-saas',
    icon: '▲',
    status: 'disconnected',
    config: {},
    features: ['Deployments', 'Edge Functions', 'Analytics', 'Domains'],
    pricing: 'freemium',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Workflow automation and app connections',
    category: 'productivity',
    icon: '⚙️',
    status: 'disconnected',
    config: {},
    features: ['Zaps', '5000+ Apps', 'Multi-step', 'Webhooks'],
    pricing: 'freemium',
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Spreadsheet-database hybrid',
    category: 'productivity',
    icon: '📋',
    status: 'disconnected',
    config: {},
    features: ['Databases', 'Views', 'Automations', 'API'],
    pricing: 'freemium',
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Scheduling and appointment booking',
    category: 'b2b-saas',
    icon: '📅',
    status: 'disconnected',
    config: {},
    features: ['Scheduling', 'Calendar Sync', 'Reminders', 'Integrations'],
    pricing: 'freemium',
  },
];

export const [IntegrationsProvider, useIntegrations] = createContextHook(() => {
  const [integrations, setIntegrations] = useState<Integration[]>(DEFAULT_INTEGRATIONS);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'all'>('all');

  const loadIntegrations = useCallback(async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setIntegrations(
          parsed.integrations.map((int: any) => ({
            ...int,
            connectedAt: int.connectedAt ? new Date(int.connectedAt) : undefined,
            lastSyncAt: int.lastSyncAt ? new Date(int.lastSyncAt) : undefined,
          }))
        );
        setConnections(parsed.connections || []);
        console.log(`[Integrations] Loaded ${parsed.integrations.length} integrations`);
      }
    } catch (error) {
      console.error('[Integrations] Failed to load:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveIntegrations = useCallback(
    async (newIntegrations: Integration[], newConnections: IntegrationConnection[]) => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            integrations: newIntegrations,
            connections: newConnections,
          })
        );
        setIntegrations(newIntegrations);
        setConnections(newConnections);
        console.log('[Integrations] Saved successfully');
      } catch (error) {
        console.error('[Integrations] Failed to save:', error);
      }
    },
    []
  );

  const connectIntegration = useCallback(
    async (
      integrationId: string,
      credentials: Record<string, string>,
      settings: Record<string, any> = {}
    ) => {
      console.log(`[Integrations] Connecting ${integrationId}...`);

      const updatedIntegrations = integrations.map((int) =>
        int.id === integrationId
          ? {
              ...int,
              status: 'connected' as const,
              connectedAt: new Date(),
              lastSyncAt: new Date(),
            }
          : int
      );

      const newConnection: IntegrationConnection = {
        integrationId,
        credentials,
        settings,
      };

      const updatedConnections = [...connections, newConnection];
      await saveIntegrations(updatedIntegrations, updatedConnections);

      console.log(`[Integrations] Connected ${integrationId}`);
    },
    [integrations, connections, saveIntegrations]
  );

  const disconnectIntegration = useCallback(
    async (integrationId: string) => {
      console.log(`[Integrations] Disconnecting ${integrationId}...`);

      const updatedIntegrations = integrations.map((int) =>
        int.id === integrationId
          ? {
              ...int,
              status: 'disconnected' as const,
              connectedAt: undefined,
              lastSyncAt: undefined,
            }
          : int
      );

      const updatedConnections = connections.filter(
        (conn) => conn.integrationId !== integrationId
      );

      await saveIntegrations(updatedIntegrations, updatedConnections);

      console.log(`[Integrations] Disconnected ${integrationId}`);
    },
    [integrations, connections, saveIntegrations]
  );

  const updateIntegrationSettings = useCallback(
    async (integrationId: string, settings: Record<string, any>) => {
      const updatedConnections = connections.map((conn) =>
        conn.integrationId === integrationId
          ? { ...conn, settings: { ...conn.settings, ...settings } }
          : conn
      );

      await saveIntegrations(integrations, updatedConnections);
      console.log(`[Integrations] Updated settings for ${integrationId}`);
    },
    [integrations, connections, saveIntegrations]
  );

  const syncIntegration = useCallback(
    async (integrationId: string) => {
      console.log(`[Integrations] Syncing ${integrationId}...`);

      const updatedIntegrations = integrations.map((int) =>
        int.id === integrationId ? { ...int, lastSyncAt: new Date() } : int
      );

      await saveIntegrations(updatedIntegrations, connections);
      console.log(`[Integrations] Synced ${integrationId}`);
    },
    [integrations, connections, saveIntegrations]
  );

  const filteredIntegrations = useMemo(() => {
    if (selectedCategory === 'all') return integrations;
    return integrations.filter((int) => int.category === selectedCategory);
  }, [integrations, selectedCategory]);

  const connectedIntegrations = useMemo(
    () => integrations.filter((int) => int.status === 'connected'),
    [integrations]
  );

  const integrationsByCategory = useMemo(() => {
    const grouped: Record<IntegrationCategory, Integration[]> = {
      'creator-tools': [],
      'web3-blockchain': [],
      'crypto-payments': [],
      productivity: [],
      'b2b-saas': [],
      'b2c-commerce': [],
      'ai-ml': [],
      analytics: [],
      communication: [],
      storage: [],
    };

    integrations.forEach((int) => {
      grouped[int.category].push(int);
    });

    return grouped;
  }, [integrations]);

  const getIntegrationConnection = useCallback(
    (integrationId: string) => {
      return connections.find((conn) => conn.integrationId === integrationId);
    },
    [connections]
  );

  return useMemo(
    () => ({
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
    }),
    [
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
    ]
  );
});
