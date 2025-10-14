import { scanForDemoCode, calculateBixCredits, DemoScanResult } from './noDemoDetector';

export type SubscriptionTier = 1 | 2 | 3 | 4 | 5;

export type PolicyMode = 'disabled' | 'warn' | 'block';

export type PolicyConfig = {
  enabled: boolean;
  mode: PolicyMode;
  creditPerLine: number;
  manualFlagMultiplier: number;
  minConfidence: number;
};

export type EnforcementResult = {
  allowed: boolean;
  scanResult: DemoScanResult;
  creditsAwarded: number;
  message: string;
  requiresRegeneration: boolean;
};

const TIER_POLICIES: Record<SubscriptionTier, PolicyConfig> = {
  1: {
    enabled: false,
    mode: 'disabled',
    creditPerLine: 0,
    manualFlagMultiplier: 1,
    minConfidence: 0.5,
  },
  2: {
    enabled: false,
    mode: 'disabled',
    creditPerLine: 0,
    manualFlagMultiplier: 1,
    minConfidence: 0.5,
  },
  3: {
    enabled: true,
    mode: 'block',
    creditPerLine: 10,
    manualFlagMultiplier: 2,
    minConfidence: 0.6,
  },
  4: {
    enabled: true,
    mode: 'warn',
    creditPerLine: 15,
    manualFlagMultiplier: 2.5,
    minConfidence: 0.5,
  },
  5: {
    enabled: true,
    mode: 'warn',
    creditPerLine: 20,
    manualFlagMultiplier: 3,
    minConfidence: 0.4,
  },
};

export function getTierPolicy(tier: SubscriptionTier): PolicyConfig {
  return TIER_POLICIES[tier];
}

export function enforceNoDemo(
  code: string,
  tier: SubscriptionTier,
  userOverride?: Partial<PolicyConfig>
): EnforcementResult {
  const policy = { ...getTierPolicy(tier), ...userOverride };

  if (!policy.enabled) {
    return {
      allowed: true,
      scanResult: { totalLines: 0, offendingLines: 0, findings: [], confidence: 1 },
      creditsAwarded: 0,
      message: 'Policy disabled for this tier',
      requiresRegeneration: false,
    };
  }

  const scanResult = scanForDemoCode(code);

  if (scanResult.offendingLines === 0) {
    return {
      allowed: true,
      scanResult,
      creditsAwarded: 0,
      message: 'Code passed validation',
      requiresRegeneration: false,
    };
  }

  if (scanResult.confidence < policy.minConfidence) {
    return {
      allowed: true,
      scanResult,
      creditsAwarded: 0,
      message: 'Confidence below threshold, allowing code',
      requiresRegeneration: false,
    };
  }

  const creditsAwarded = calculateBixCredits(scanResult.offendingLines, policy.creditPerLine);

  if (policy.mode === 'block') {
    return {
      allowed: false,
      scanResult,
      creditsAwarded,
      message: `Blocked: ${scanResult.offendingLines} mock/demo lines detected. ${creditsAwarded} Bix credits awarded. Regeneration required.`,
      requiresRegeneration: true,
    };
  }

  return {
    allowed: true,
    scanResult,
    creditsAwarded,
    message: `Warning: ${scanResult.offendingLines} mock/demo lines detected. ${creditsAwarded} Bix credits awarded.`,
    requiresRegeneration: false,
  };
}

export function handleManualFlag(
  code: string,
  tier: SubscriptionTier,
  userNotes?: string
): EnforcementResult {
  const policy = getTierPolicy(tier);
  const scanResult = scanForDemoCode(code);

  const creditsAwarded = calculateBixCredits(
    scanResult.offendingLines,
    policy.creditPerLine,
    policy.manualFlagMultiplier
  );

  return {
    allowed: false,
    scanResult,
    creditsAwarded,
    message: `Manual flag: ${scanResult.offendingLines} lines flagged. ${creditsAwarded} Bix credits awarded (${policy.manualFlagMultiplier}× multiplier). Notes: ${userNotes || 'None'}`,
    requiresRegeneration: true,
  };
}
