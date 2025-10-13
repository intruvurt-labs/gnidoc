import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { z } from 'zod';

/** ───────────────────────── Types ───────────────────────── */

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface SubscriptionFeature {
  name: string;
  included: boolean;
  limit?: string;
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  billingPeriod: 'month' | 'year';
  credits: number;
  features: SubscriptionFeature[];
  popular?: boolean;
  color: string;
}

export interface UsageLimit {
  feature: string;
  used: number;
  limit: number;
  resetDate: string; // ISO
}

interface SubscriptionState {
  currentTier: SubscriptionTier;
  usageLimits: UsageLimit[];
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  autoRenew: boolean;
}

/** ───────────────────────── Constants ───────────────────────── */

const STORAGE_KEY = 'subscription-state';
const SCHEMA_VERSION = 1;

// Plans (business truth)
const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Freemium',
    price: 0,
    billingPeriod: 'month',
    credits: 100,
    color: '#6B7280',
    features: [
      { name: '100 Bix credits/month', included: true },
      { name: '1 collaboration seat', included: true },
      { name: 'Basic AI models', included: true },
      { name: 'Community support', included: true },
      { name: 'Advanced models', included: false },
      { name: 'Priority support', included: false },
      { name: 'Custom integrations', included: false },
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 19,
    billingPeriod: 'month',
    credits: 500,
    color: '#3B82F6',
    features: [
      { name: '500 Bix credits/month', included: true },
      { name: '3 collaboration seats', included: true },
      { name: 'All AI models', included: true },
      { name: 'Email support', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Priority support', included: false },
      { name: 'Custom integrations', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    billingPeriod: 'month',
    credits: 2000,
    color: '#8B5CF6',
    popular: true,
    features: [
      { name: '2000 Bix credits/month', included: true },
      { name: '10 collaboration seats', included: true },
      { name: 'All AI models + MGA', included: true },
      { name: 'Priority support', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'White-label options', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    billingPeriod: 'month',
    credits: 10000,
    color: '#F59E0B',
    features: [
      { name: '10000+ Bix credits/month', included: true },
      { name: 'Unlimited seats', included: true },
      { name: 'All AI models + Custom', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'White-label options', included: true },
      { name: 'SLA guarantee', included: true },
      { name: 'On-premise deployment', included: true },
    ],
  },
];

// Feature access matrix
const FEATURE_ACCESS: Record<string, SubscriptionTier[]> = {
  'basic-models': ['free', 'basic', 'pro', 'enterprise'],
  'advanced-models': ['basic', 'pro', 'enterprise'],
  'mga-models': ['pro', 'enterprise'],
  'custom-models': ['enterprise'],
  'collaboration': ['free', 'basic', 'pro', 'enterprise'],
  'analytics': ['basic', 'pro', 'enterprise'],
  'priority-support': ['pro', 'enterprise'],
  'custom-integrations': ['pro', 'enterprise'],
  'white-label': ['pro', 'enterprise'],
  'on-premise': ['enterprise'],
};

// Per-tier numeric hard limits for tracked features
const FEATURE_LIMITS: Record<
  SubscriptionTier,
  Record<string, number>
> = {
  free: { 'app-generations': 10, 'ai-requests': 100 },
  basic: { 'app-generations': 50, 'ai-requests': 500 },
  pro: { 'app-generations': 200, 'ai-requests': 2000 },
  enterprise: { 'app-generations': 999, 'ai-requests': 9999 },
};

const COLLAB_SEATS: Record<SubscriptionTier, number> = {
  free: 1,
  basic: 3,
  pro: 10,
  enterprise: 999,
};

/** ───────────────────────── Schemas ───────────────────────── */

const UsageLimitSchema = z.object({
  feature: z.string().min(1),
  used: z.number().int().min(0),
  limit: z.number().int().min(1),
  resetDate: z.string().datetime(),
});

const StateSchema = z.object({
  __v: z.number().optional(), // schema version (internal)
  currentTier: z.custom<SubscriptionTier>((v) => ['free', 'basic', 'pro', 'enterprise'].includes(String(v))),
  usageLimits: z.array(UsageLimitSchema),
  subscriptionStartDate: z.string().datetime().optional(),
  subscriptionEndDate: z.string().datetime().optional(),
  autoRenew: z.boolean(),
});

const DEFAULT_STATE: SubscriptionState & { __v: number } = {
  __v: SCHEMA_VERSION,
  currentTier: 'free',
  usageLimits: [],
  autoRenew: true,
};

/** ───────────────────────── Utils ───────────────────────── */

function getPlan(tier: SubscriptionTier): SubscriptionPlan {
  return subscriptionPlans.find((p) => p.id === tier) || subscriptionPlans[0];
}

function nextMonthISO(from: Date = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function isPast(dateISO: string): boolean {
  return new Date(dateISO).getTime() < Date.now();
}

function migrateState(input: any): SubscriptionState & { __v: number } {
  // Merge with defaults, clamp values, and tag version
  const merged = {
    ...DEFAULT_STATE,
    ...input,
    __v: SCHEMA_VERSION,
  };

  // Validate usage entries
  const safeUsage: UsageLimit[] = Array.isArray(merged.usageLimits)
    ? merged.usageLimits
        .map((u: any) => {
          const used = Math.max(0, Number(u?.used ?? 0));
          const limit = Math.max(1, Number(u?.limit ?? 1));
          const resetDate = typeof u?.resetDate === 'string' ? u.resetDate : nextMonthISO();
          const feature = String(u?.feature ?? '').trim();
          if (!feature) return null;
          return { feature, used, limit, resetDate };
        })
        .filter(Boolean) as UsageLimit[]
    : [];

  return {
    currentTier: merged.currentTier,
    usageLimits: safeUsage,
    subscriptionStartDate: merged.subscriptionStartDate,
    subscriptionEndDate: merged.subscriptionEndDate,
    autoRenew: !!merged.autoRenew,
    __v: SCHEMA_VERSION,
  };
}

async function loadStateFromStorage(): Promise<SubscriptionState & { __v: number }> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_STATE };
  try {
    const parsed = JSON.parse(raw);
    const migrated = migrateState(parsed);
    const check = StateSchema.safeParse(migrated);
    if (check.success) return migrated;
  } catch {}
  return { ...DEFAULT_STATE };
}

async function saveStateToStorage(state: SubscriptionState & { __v: number }) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureRollover(
  state: SubscriptionState & { __v: number }
): SubscriptionState & { __v: number } {
  const now = new Date();
  let changed = false;

  const nextUsage = state.usageLimits.map((u) => {
    if (!u.resetDate || isPast(u.resetDate)) {
      changed = true;
      return { ...u, used: 0, resetDate: nextMonthISO(now) };
    }
    return u;
  });

  if (changed) {
    return { ...state, usageLimits: nextUsage };
  }
  return state;
}

function upsertUsageLimit(
  state: SubscriptionState & { __v: number },
  feature: string,
  tier: SubscriptionTier
): SubscriptionState & { __v: number } {
  const existing = state.usageLimits.find((l) => l.feature === feature);
  if (existing) return state;

  const limit = FEATURE_LIMITS[tier]?.[feature] ?? 999;
  return {
    ...state,
    usageLimits: [
      ...state.usageLimits,
      { feature, used: 0, limit, resetDate: nextMonthISO() },
    ],
  };
}

/** ───────────────────────── Context ───────────────────────── */

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const { user, upgradeSubscription } = useAuth();

  const [state, setState] = useState<SubscriptionState & { __v: number }>(() => ({
    ...DEFAULT_STATE,
    currentTier: (user?.subscription as SubscriptionTier) || 'free',
  }));

  // Load on mount
  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadStateFromStorage();
        const withTier = {
          ...loaded,
          currentTier: (user?.subscription as SubscriptionTier) || loaded.currentTier,
        };
        const rolled = ensureRollover(withTier);
        setState(rolled);
        if (rolled !== withTier) {
          await saveStateToStorage(rolled);
        }
      } catch (e) {
        // noop
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on change
  useEffect(() => {
    (async () => {
      try {
        await saveStateToStorage(state);
      } catch (e) {
        // noop
      }
    })();
  }, [state]);

  // Sync when auth tier changes
  useEffect(() => {
    if (user?.subscription && user.subscription !== state.currentTier) {
      setState((prev) => ({ ...prev, currentTier: user.subscription as SubscriptionTier }));
    }
  }, [user?.subscription, state.currentTier]);

  /** Getters */

  const getCurrentPlan = useCallback((): SubscriptionPlan => {
    return getPlan(state.currentTier);
  }, [state.currentTier]);

  const canAccessFeature = useCallback(
    (feature: string): boolean => {
      const allowed = FEATURE_ACCESS[feature] || [];
      return allowed.includes(state.currentTier);
    },
    [state.currentTier]
  );

  const getCollaborationSeats = useCallback((): number => {
    return COLLAB_SEATS[state.currentTier] ?? 1;
  }, [state.currentTier]);

  const checkUsageLimit = useCallback(
    (feature: string): { allowed: boolean; remaining: number } => {
      // ensure a record exists for this feature at current tier
      let next = upsertUsageLimit(state, feature, state.currentTier);
      // handle rollover if needed
      next = ensureRollover(next);
      if (next !== state) setState(next);

      const limit = next.usageLimits.find((l) => l.feature === feature)!;
      const allowed = limit.used < limit.limit;
      const remaining = Math.max(0, limit.limit - limit.used);
      return { allowed, remaining };
    },
    [state]
  );

  /** Mutations */

  const incrementUsage = useCallback(
    (feature: string, amount: number = 1) => {
      setState((prev) => {
        // ensure exists with current tier limits
        let next = upsertUsageLimit(prev, feature, prev.currentTier);
        // apply rollover if needed
        next = ensureRollover(next);

        const usageLimits = next.usageLimits.map((l) =>
          l.feature === feature ? { ...l, used: l.used + amount } : l
        );

        return { ...next, usageLimits };
      });
    },
    []
  );

  const upgradeTier = useCallback(
    async (tier: SubscriptionTier) => {
      if (tier === state.currentTier) {
        throw new Error('Already on this tier');
      }

      const order: SubscriptionTier[] = ['free', 'basic', 'pro', 'enterprise'];
      const currentIndex = order.indexOf(state.currentTier);
      const newIndex = order.indexOf(tier);

      if (newIndex < currentIndex) {
        throw new Error('Cannot downgrade tier');
      }

      const nowISO = new Date().toISOString();
      const endISO = nextMonthISO();

      // Persist immediately, then call auth upgrade hook (if available)
      setState((prev) => ({
        ...prev,
        currentTier: tier,
        subscriptionStartDate: nowISO,
        subscriptionEndDate: endISO,
      }));

      if (upgradeSubscription && tier !== 'free') {
        await upgradeSubscription(tier);
      }

      return true;
    },
    [state.currentTier, upgradeSubscription]
  );

  const cancelSubscription = useCallback(async () => {
    setState((prev) => ({ ...prev, autoRenew: false }));
    return true;
  }, []);

  const reactivateSubscription = useCallback(async () => {
    setState((prev) => ({ ...prev, autoRenew: true }));
    return true;
  }, []);

  /** Exposed API */

  return useMemo(
    () => ({
      // state
      currentTier: state.currentTier,
      usageLimits: state.usageLimits,
      subscriptionStartDate: state.subscriptionStartDate,
      subscriptionEndDate: state.subscriptionEndDate,
      autoRenew: state.autoRenew,

      // derived
      plans: subscriptionPlans,
      currentPlan: getCurrentPlan(),

      // capabilities
      canAccessFeature,
      getCollaborationSeats,
      checkUsageLimit,

      // actions
      incrementUsage,
      upgradeTier,
      cancelSubscription,
      reactivateSubscription,
    }),
    [
      state.currentTier,
      state.usageLimits,
      state.subscriptionStartDate,
      state.subscriptionEndDate,
      state.autoRenew,
      getCurrentPlan,
      canAccessFeature,
      getCollaborationSeats,
      checkUsageLimit,
      incrementUsage,
      upgradeTier,
      cancelSubscription,
      reactivateSubscription,
    ]
  );
});

/** ───────────────────────── Helpers ───────────────────────── */

function getNextMonthDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}
