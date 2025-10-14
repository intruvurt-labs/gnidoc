import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '@/lib/trpc';
import type { SubscriptionTier, PolicyMode } from '@/lib/noDemoEnforcement';
import type { DemoScanResult } from '@/lib/noDemoDetector';

type PolicySettings = {
  enabled: boolean;
  mode: PolicyMode;
  tier: SubscriptionTier;
  bixBalance: number;
};

type ViolationRecord = {
  id: string;
  timestamp: string;
  offendingLines: number;
  creditsAwarded: number;
  artifactId?: string;
  scanResult: DemoScanResult;
};

const STORAGE_KEY = 'policy-settings';
const VIOLATIONS_KEY = 'policy-violations';

export const [PolicyProvider, usePolicy] = createContextHook(() => {
  const [settings, setSettings] = useState<PolicySettings>({
    enabled: false,
    mode: 'disabled',
    tier: 1,
    bixBalance: 0,
  });

  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const checkCodeMutation = trpc.policy.checkCode.useMutation();
  const manualFlagMutation = trpc.policy.manualFlag.useMutation();
  const awardCreditsMutation = trpc.policy.awardCredits.useMutation();

  useEffect(() => {
    loadSettings();
    loadViolations();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[PolicyContext] Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadViolations = async () => {
    try {
      const stored = await AsyncStorage.getItem(VIOLATIONS_KEY);
      if (stored) {
        setViolations(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[PolicyContext] Failed to load violations:', error);
    }
  };

  const saveSettings = async (newSettings: Partial<PolicySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[PolicyContext] Failed to save settings:', error);
    }
  };

  const saveViolation = async (violation: ViolationRecord) => {
    const updated = [violation, ...violations].slice(0, 100);
    setViolations(updated);
    try {
      await AsyncStorage.setItem(VIOLATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[PolicyContext] Failed to save violation:', error);
    }
  };

  const checkCode = useCallback(
    async (code: string, overrideMode?: PolicyMode) => {
      try {
        const result = await checkCodeMutation.mutateAsync({
          code,
          tier: settings.tier,
          overrideMode,
        });

        if (result.creditsAwarded > 0) {
          await awardCreditsMutation.mutateAsync({
            amount: result.creditsAwarded,
            reason: 'Demo code detected',
            scanDetails: {
              offendingLines: result.scanResult.offendingLines,
              totalLines: result.scanResult.totalLines,
              confidence: result.scanResult.confidence,
            },
          });

          await saveSettings({ bixBalance: settings.bixBalance + result.creditsAwarded });

          await saveViolation({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            offendingLines: result.scanResult.offendingLines,
            creditsAwarded: result.creditsAwarded,
            scanResult: result.scanResult,
          });
        }

        return result;
      } catch (error) {
        console.error('[PolicyContext] Check code failed:', error);
        throw error;
      }
    },
    [checkCodeMutation, awardCreditsMutation, settings.tier, settings.bixBalance]
  );

  const manualFlag = useCallback(
    async (code: string, userNotes?: string, artifactId?: string) => {
      try {
        const result = await manualFlagMutation.mutateAsync({
          code,
          tier: settings.tier,
          userNotes,
          artifactId,
        });

        if (result.creditsAwarded > 0) {
          await awardCreditsMutation.mutateAsync({
            amount: result.creditsAwarded,
            reason: `Manual flag: ${userNotes || 'User reported violation'}`,
            artifactId,
            scanDetails: {
              offendingLines: result.scanResult.offendingLines,
              totalLines: result.scanResult.totalLines,
              confidence: result.scanResult.confidence,
            },
          });

          await saveSettings({ bixBalance: settings.bixBalance + result.creditsAwarded });

          await saveViolation({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            offendingLines: result.scanResult.offendingLines,
            creditsAwarded: result.creditsAwarded,
            artifactId,
            scanResult: result.scanResult,
          });
        }

        return result;
      } catch (error) {
        console.error('[PolicyContext] Manual flag failed:', error);
        throw error;
      }
    },
    [manualFlagMutation, awardCreditsMutation, settings.tier, settings.bixBalance]
  );

  const clearViolations = useCallback(async () => {
    setViolations([]);
    try {
      await AsyncStorage.removeItem(VIOLATIONS_KEY);
    } catch (error) {
      console.error('[PolicyContext] Failed to clear violations:', error);
    }
  }, []);

  const updateTier = useCallback(
    async (tier: SubscriptionTier) => {
      await saveSettings({ tier });
    },
    [settings]
  );

  const togglePolicy = useCallback(
    async (enabled: boolean) => {
      await saveSettings({ enabled });
    },
    [settings]
  );

  const setMode = useCallback(
    async (mode: PolicyMode) => {
      await saveSettings({ mode });
    },
    [settings]
  );

  return useMemo(
    () => ({
      settings,
      violations,
      isLoading,
      checkCode,
      manualFlag,
      clearViolations,
      updateTier,
      togglePolicy,
      setMode,
      isCheckingCode: checkCodeMutation.isPending,
      isFlagging: manualFlagMutation.isPending,
    }),
    [
      settings,
      violations,
      isLoading,
      checkCode,
      manualFlag,
      clearViolations,
      updateTier,
      togglePolicy,
      setMode,
      checkCodeMutation.isPending,
      manualFlagMutation.isPending,
    ]
  );
});
