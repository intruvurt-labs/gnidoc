import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

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
  resetDate: string;
}

const STORAGE_KEY = 'subscription-state';

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

interface SubscriptionState {
  currentTier: SubscriptionTier;
  usageLimits: UsageLimit[];
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  autoRenew: boolean;
}

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const { user, upgradeSubscription } = useAuth();
  
  const [state, setState] = useState<SubscriptionState>({
    currentTier: (user?.subscription as SubscriptionTier) || 'free',
    usageLimits: [],
    autoRenew: true,
  });

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const loadState = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState(prev => ({
          ...prev,
          ...parsed,
          currentTier: (user?.subscription as SubscriptionTier) || parsed.currentTier,
        }));
        console.log('[Subscription] State loaded');
      }
    } catch (error) {
      console.error('[Subscription] Failed to load state:', error);
    }
  }, [user?.subscription]);

  const saveState = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
    } catch (error) {
      console.error('[Subscription] Failed to save state:', error);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    saveState();
  }, [state, saveState]);

  useEffect(() => {
    if (user?.subscription && user.subscription !== state.currentTier) {
      setState(prev => ({ ...prev, currentTier: user.subscription as SubscriptionTier }));
    }
  }, [user?.subscription, state.currentTier]);

  const getCurrentPlan = useCallback(() => {
    return subscriptionPlans.find(plan => plan.id === state.currentTier) || subscriptionPlans[0];
  }, [state.currentTier]);

  const canAccessFeature = useCallback((feature: string): boolean => {
    
    const featureMap: Record<string, SubscriptionTier[]> = {
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

    const allowedTiers = featureMap[feature] || [];
    return allowedTiers.includes(state.currentTier);
  }, [state.currentTier]);

  const getCollaborationSeats = useCallback((): number => {
    const seatMap: Record<SubscriptionTier, number> = {
      free: 1,
      basic: 3,
      pro: 10,
      enterprise: 999,
    };
    return seatMap[state.currentTier];
  }, [state.currentTier]);

  const checkUsageLimit = useCallback((feature: string): { allowed: boolean; remaining: number } => {
    const limit = state.usageLimits.find(l => l.feature === feature);
    
    if (!limit) {
      return { allowed: true, remaining: Infinity };
    }

    const allowed = limit.used < limit.limit;
    const remaining = Math.max(0, limit.limit - limit.used);
    
    return { allowed, remaining };
  }, [state.usageLimits]);

  const incrementUsage = useCallback((feature: string, amount: number = 1) => {
    setState(prev => {
      const usageLimits = prev.usageLimits.map(limit => {
        if (limit.feature === feature) {
          return { ...limit, used: limit.used + amount };
        }
        return limit;
      });

      const existingLimit = usageLimits.find(l => l.feature === feature);
      if (!existingLimit) {
        const plan = getCurrentPlan();
        const featureLimits: Record<string, number> = {
          'app-generations': plan.id === 'free' ? 10 : plan.id === 'basic' ? 50 : plan.id === 'pro' ? 200 : 999,
          'ai-requests': plan.id === 'free' ? 100 : plan.id === 'basic' ? 500 : plan.id === 'pro' ? 2000 : 9999,
        };

        usageLimits.push({
          feature,
          used: amount,
          limit: featureLimits[feature] || 999,
          resetDate: getNextMonthDate(),
        });
      }

      return { ...prev, usageLimits };
    });
  }, [getCurrentPlan]);

  const upgradeTier = useCallback(async (tier: SubscriptionTier) => {
    if (tier === state.currentTier) {
      throw new Error('Already on this tier');
    }

    const tierOrder: SubscriptionTier[] = ['free', 'basic', 'pro', 'enterprise'];
    const currentIndex = tierOrder.indexOf(state.currentTier);
    const newIndex = tierOrder.indexOf(tier);

    if (newIndex < currentIndex) {
      throw new Error('Cannot downgrade tier');
    }

    setState(prev => ({
      ...prev,
      currentTier: tier,
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: getNextMonthDate(),
    }));

    if (upgradeSubscription && tier !== 'free') {
      await upgradeSubscription(tier);
    }

    console.log('[Subscription] Upgraded to:', tier);
    return true;
  }, [state.currentTier, upgradeSubscription]);

  const cancelSubscription = useCallback(async () => {
    setState(prev => ({
      ...prev,
      autoRenew: false,
    }));

    console.log('[Subscription] Subscription cancelled');
    return true;
  }, []);

  const reactivateSubscription = useCallback(async () => {
    setState(prev => ({
      ...prev,
      autoRenew: true,
    }));

    console.log('[Subscription] Subscription reactivated');
    return true;
  }, []);

  return useMemo(() => ({
    ...state,
    plans: subscriptionPlans,
    currentPlan: getCurrentPlan(),
    canAccessFeature,
    getCollaborationSeats,
    checkUsageLimit,
    incrementUsage,
    upgradeTier,
    cancelSubscription,
    reactivateSubscription,
  }), [
    state,
    getCurrentPlan,
    canAccessFeature,
    getCollaborationSeats,
    checkUsageLimit,
    incrementUsage,
    upgradeTier,
    cancelSubscription,
    reactivateSubscription,
  ]);
});

function getNextMonthDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}
