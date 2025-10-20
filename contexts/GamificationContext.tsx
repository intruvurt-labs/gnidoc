// GamificationContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

/** ───────────────────────── Types ───────────────────────── **/
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
}

export interface Referral {
  id: string;
  code: string;
  referredEmail: string;
  referredName: string;
  creditsEarned: number;
  status: 'pending' | 'active' | 'completed';
  createdAt: string;
}

export interface IterationStats {
  totalIterations: number;
  successfulBuilds: number;
  failedBuilds: number;
  totalCreditsSpent: number;
  averageBuildTime: number;
  lastBuildDate?: string;
}

interface GamificationState {
  credits: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  achievements: Achievement[];
  referrals: Referral[];
  referralCode: string;
  iterationStats: IterationStats;
  streak: number;
  lastActiveDate: string; // ISO
  dailyCredits: number;
  dailyCreditsMax: number;
  lastRegenDate: string; // ISO
}

/** ───────────────────────── Constants ───────────────────────── **/
const STORAGE_KEY = 'gamification-state';
const SAVE_DEBOUNCE_MS = 150;
const DAILY_CREDITS_MAX = 50;
const DAILY_CREDITS_REGEN_RATE = 5; // credits per day

const initialAchievements: Achievement[] = [
  { id: 'first-build',    title: 'First Build',    description: 'Generate your first app', icon: '🎯', points: 100,  progress: 0, maxProgress: 1 },
  { id: 'power-user',     title: 'Power User',     description: 'Generate 10 apps',        icon: '⚡', points: 500,  progress: 0, maxProgress: 10 },
  { id: 'referral-master',title: 'Referral Master',description: 'Refer 5 friends',         icon: '🤝', points: 1000, progress: 0, maxProgress: 5 },
  { id: 'streak-warrior', title: 'Streak Warrior', description: 'Maintain a 7-day streak', icon: '🔥', points: 750,  progress: 0, maxProgress: 7 },
  { id: 'code-master',    title: 'Code Master',    description: 'Generate 100 apps',       icon: '👑', points: 5000, progress: 0, maxProgress: 100 },
];

/** ───────────────────────── Utils ───────────────────────── **/
const logger = {
  info: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.log(...a); },
  warn: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.warn(...a); },
  error: (...a: any[]) => console.error(...a),
};

function safeJSON<T>(raw: any, fallback: T): T {
  try { return typeof raw === 'string' ? JSON.parse(raw) as T : (raw ?? fallback); }
  catch { return fallback; }
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms = 200) {
  let t: any; return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function calculateXPForLevel(level: number): number {
  return Math.floor(1000 * Math.pow(1.5, level - 1));
}

function seedReferralCode(seed: string | undefined): string {
  if (!seed) return randomReferralCode();

  // FNV-1a 32-bit hash with better distribution
  let h = 0x811c9dc5; // 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars (no I/O/0/1)
  let code = '';
  for (let i = 0; i < 8; i++) {
    // mix & spread: rotate + xor-shift for better distribution
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
    const idx = Math.abs(h) % chars.length;
    code += chars[idx];
    // advance with rotation
    h = (h << 5) | (h >>> 27);
  }
  return code;
}

function randomReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = ''; for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Calendar-day diff (local)
function diffInCalendarDays(aISO: string, bISO: string): number {
  const a = new Date(aISO); a.setHours(0,0,0,0);
  const b = new Date(bISO); b.setHours(0,0,0,0);
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

/** ───────────────────────── Context ───────────────────────── **/
export const [GamificationProvider, useGamification] = createContextHook(() => {
  const { user, updateCredits } = useAuth();

  const [state, setState] = useState<GamificationState>(() => ({
    credits: user?.credits ?? 100,
    level: 1,
    xp: 0,
    xpToNextLevel: 1000,
    achievements: initialAchievements,
    referrals: [],
    referralCode: seedReferralCode(user?.id || user?.email),
    iterationStats: {
      totalIterations: 0,
      successfulBuilds: 0,
      failedBuilds: 0,
      totalCreditsSpent: 0,
      averageBuildTime: 0,
    },
    streak: 0,
    lastActiveDate: new Date().toISOString(),
    dailyCredits: DAILY_CREDITS_MAX,
    dailyCreditsMax: DAILY_CREDITS_MAX,
    lastRegenDate: new Date().toISOString(),
  }));

  // Keep latest state in a ref so the debounced callback always reads fresh data
  const stateRef = useRef<GamificationState>(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  /** ───────── Debounced save (always-fresh) ───────── **/
  const persist = useMemo(() => debounce(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
    } catch (e) {
      logger.error('[Gamification] Save failed:', e);
    }
  }, SAVE_DEBOUNCE_MS), []);

  /** ───────── Load on mount ───────── **/
  const loadState = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = safeJSON<GamificationState>(stored, state);

      // Merge with defaults to keep future compatibility
      setState(prev => ({
        credits: user?.credits ?? parsed.credits ?? prev.credits,
        level: parsed.level ?? prev.level,
        xp: parsed.xp ?? prev.xp,
        xpToNextLevel: parsed.xpToNextLevel ?? prev.xpToNextLevel,
        achievements: mergeAchievements(parsed.achievements ?? prev.achievements),
        referrals: parsed.referrals ?? prev.referrals,
        referralCode: parsed.referralCode || seedReferralCode(user?.id || user?.email) || prev.referralCode,
        iterationStats: {
          totalIterations: parsed.iterationStats?.totalIterations ?? 0,
          successfulBuilds: parsed.iterationStats?.successfulBuilds ?? 0,
          failedBuilds: parsed.iterationStats?.failedBuilds ?? 0,
          totalCreditsSpent: parsed.iterationStats?.totalCreditsSpent ?? 0,
          averageBuildTime: parsed.iterationStats?.averageBuildTime ?? 0,
          lastBuildDate: parsed.iterationStats?.lastBuildDate,
        },
        streak: parsed.streak ?? prev.streak,
        lastActiveDate: parsed.lastActiveDate ?? prev.lastActiveDate,
        dailyCredits: parsed.dailyCredits ?? DAILY_CREDITS_MAX,
        dailyCreditsMax: parsed.dailyCreditsMax ?? DAILY_CREDITS_MAX,
        lastRegenDate: parsed.lastRegenDate ?? new Date().toISOString(),
      }));

      logger.info('[Gamification] State loaded');
    } catch (error) {
      logger.error('[Gamification] Failed to load state:', error);
    }
  }, [state, user?.credits, user?.id, user?.email]);

  useEffect(() => { loadState(); }, [loadState]);

  /** ───────── Auto-save on change (debounced) ───────── **/
  useEffect(() => {
    persist();
  }, [state, persist]);

  /** ───────── Sync credits from Auth (one-way) ───────── **/
  useEffect(() => {
    if (typeof user?.credits === 'number' && user.credits !== state.credits) {
      setState(prev => ({ ...prev, credits: user.credits as number }));
    }
  }, [user?.credits, state.credits]);

  /** ───────── Core helpers ───────── **/
  const addCredits = useCallback(async (amount: number, reason: string) => {
    if (!Number.isFinite(amount)) return state.credits;
    setState(prev => ({ ...prev, credits: Math.max(0, prev.credits + amount) }));
    if (updateCredits) { try { await updateCredits(amount); } catch {} }
    logger.info(`[Gamification] +${amount} credits (${reason})`);
    return state.credits + amount;
  }, [state.credits, updateCredits]);

  const spendCredits = useCallback(async (amount: number, reason: string) => {
    amount = Math.abs(Number(amount) || 0);
    if (amount === 0) return state.credits;

    let allowed = true;
    setState(prev => {
      if (prev.credits < amount) { allowed = false; return prev; }
      return { ...prev, credits: prev.credits - amount };
    });
    if (!allowed) throw new Error('Insufficient credits');

    if (updateCredits) { try { await updateCredits(-amount); } catch {} }
    logger.info(`[Gamification] -${amount} credits (${reason})`);
    return state.credits - amount;
  }, [state.credits, updateCredits]);

  const addXP = useCallback((amount: number, reason: string) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setState(prev => {
      let xp = prev.xp + amount;
      let level = prev.level;
      let xpToNext = prev.xpToNextLevel;

      const logs: (() => void)[] = []; // delayed credit grants

      while (xp >= xpToNext) {
        xp -= xpToNext;
        level += 1;
        xpToNext = calculateXPForLevel(level + 1);

        const levelBonus = level * 50;
        logs.push(() => addCredits(levelBonus, `Level ${level} bonus`));
        logger.info(`[Gamification] Level up → ${level}`);
      }

      // Execute bonuses out of setState to avoid nested setState warnings
      setTimeout(() => logs.forEach(fn => fn()), 0);

      logger.info(`[Gamification] +${amount} XP (${reason})`);
      return { ...prev, xp, level, xpToNextLevel: xpToNext };
    });
  }, [addCredits]);

  const unlockAchievement = useCallback((achievementId: string) => {
    setState(prev => {
      const idx = prev.achievements.findIndex(a => a.id === achievementId);
      if (idx < 0) return prev;
      const ach = prev.achievements[idx];
      if (ach.unlockedAt) return prev; // idempotent

      // reward outside of setState (credits/xp functions handle their own state)
      setTimeout(() => {
        addXP(ach.points, `Achievement: ${ach.title}`);
        addCredits(Math.floor(ach.points / 2), `Achievement: ${ach.title}`);
      }, 0);

      const achievements = prev.achievements.slice();
      achievements[idx] = { ...ach, unlockedAt: new Date().toISOString(), progress: ach.maxProgress };
      return { ...prev, achievements };
    });
  }, [addXP, addCredits]);

  const updateAchievementProgress = useCallback((achievementId: string, progress: number) => {
    setState(prev => {
      const idx = prev.achievements.findIndex(a => a.id === achievementId);
      if (idx < 0) return prev;
      const ach = prev.achievements[idx];
      const newProgress = clamp(progress, 0, ach.maxProgress);
      const achievements = prev.achievements.slice();
      achievements[idx] = { ...ach, progress: newProgress };

      // auto-unlock on completion (idempotent guard in unlockAchievement)
      if (newProgress >= ach.maxProgress && !ach.unlockedAt) {
        setTimeout(() => unlockAchievement(achievementId), 0);
      }
      return { ...prev, achievements };
    });
  }, [unlockAchievement]);

  const addReferral = useCallback(async (email: string, name: string) => {
    const cleanEmail = String(email || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      throw new Error('Please provide a valid email.');
    }

    const referral: Referral = {
      id: `ref_${Date.now()}`,
      code: state.referralCode,
      referredEmail: cleanEmail,
      referredName: String(name || '').trim(),
      creditsEarned: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, referrals: [...prev.referrals, referral] }));
    logger.info('[Gamification] Referral added:', cleanEmail);
    return referral;
  }, [state.referralCode]);

  const completeReferral = useCallback(async (referralId: string) => {
    const bonus = 500;
    setState(prev => {
      const referrals = prev.referrals.map(r => r.id === referralId && r.status === 'pending'
        ? { ...r, status: 'completed' as const, creditsEarned: bonus }
        : r
      );
      return { ...prev, referrals };
    });

    await addCredits(bonus, 'Referral bonus');
    addXP(250, 'Referral completed');

    // compute completed count after state mutation—use functional read
    setTimeout(() => {
      setState(prev => {
        const completed = prev.referrals.filter(r => r.status === 'completed').length;
        setTimeout(() => updateAchievementProgress('referral-master', completed), 0);
        return prev;
      });
    }, 0);

    logger.info('[Gamification] Referral completed:', referralId);
  }, [addCredits, addXP, updateAchievementProgress]);

  const recordIteration = useCallback((success: boolean, buildTime: number, creditsSpent: number) => {
    setState(prev => {
      const s = prev.iterationStats;
      const totalIterations = s.totalIterations + 1;
      const successfulBuilds = success ? s.successfulBuilds + 1 : s.successfulBuilds;
      const failedBuilds = success ? s.failedBuilds : s.failedBuilds + 1;
      const totalCreditsSpent = s.totalCreditsSpent + (Number.isFinite(creditsSpent) ? creditsSpent : 0);
      const averageBuildTime = Number(((s.averageBuildTime * s.totalIterations + (buildTime || 0)) / totalIterations).toFixed(2));

      return {
        ...prev,
        iterationStats: {
          totalIterations,
          successfulBuilds,
          failedBuilds,
          totalCreditsSpent,
          averageBuildTime,
          lastBuildDate: new Date().toISOString(),
        },
      };
    });

    if (success) {
      addXP(50, 'Successful build');
      setTimeout(() => {
        setState(prev => {
          const nextTotal = prev.iterationStats.totalIterations; // already incremented
          setTimeout(() => {
            updateAchievementProgress('first-build', Math.min(1, nextTotal));
            updateAchievementProgress('power-user', nextTotal);
            updateAchievementProgress('code-master', nextTotal);
          }, 0);
          return prev;
        });
      }, 0);
    }

    logger.info('[Gamification] Iteration recorded:', { success, buildTime, creditsSpent });
  }, [addXP, updateAchievementProgress]);

  const regenerateDailyCredits = useCallback(() => {
    const nowISO = new Date().toISOString();
    setState(prev => {
      const delta = diffInCalendarDays(nowISO, prev.lastRegenDate);
      if (delta === 0) return prev; // already regenerated today

      // Regenerate based on streak (bonus for consecutive days)
      const streakBonus = Math.min(prev.streak, 7) * 2; // +2 per day, max 7 days
      const regenAmount = DAILY_CREDITS_REGEN_RATE + streakBonus;
      const newDailyCredits = Math.min(prev.dailyCredits + regenAmount, prev.dailyCreditsMax);

      logger.info(`[Gamification] Daily credits regenerated: +${regenAmount} (streak bonus: ${streakBonus})`);

      // Award the regenerated credits
      setTimeout(() => {
        addCredits(regenAmount, `Daily regen (+${streakBonus} streak bonus)`);
      }, 0);

      return {
        ...prev,
        dailyCredits: newDailyCredits,
        lastRegenDate: nowISO,
      };
    });
  }, [addCredits]);

  const updateStreak = useCallback(() => {
    const nowISO = new Date().toISOString();
    setState(prev => {
      const delta = diffInCalendarDays(nowISO, prev.lastActiveDate);
      if (delta === 0) return prev; // already active today
      let newStreak = prev.streak;
      if (delta === 1) {
        newStreak += 1;
        setTimeout(() => {
          addXP(25, `${newStreak} day streak!`);
          updateAchievementProgress('streak-warrior', newStreak);
        }, 0);
      } else {
        // reset streak; count today as day 1
        newStreak = 1;
      }
      return { ...prev, streak: newStreak, lastActiveDate: nowISO };
    });
  }, [addXP, updateAchievementProgress]);

  // Run on mount: check streak & regen daily credits
  useEffect(() => {
    regenerateDailyCredits();
    updateStreak();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  /** ───────── Import/Export & Reset (DX helpers) ───────── **/
  const exportState = useCallback(() => JSON.stringify(state, null, 2), [state]);

  const importState = useCallback(async (json: string) => {
    try {
      const parsed = safeJSON<GamificationState>(json, state);
      // keep current user credits in sync, override parsed credits if auth present
      parsed.credits = typeof user?.credits === 'number' ? user.credits : parsed.credits;
      setState(mergeStateDefaults(parsed));
      logger.info('[Gamification] State imported.');
      return { success: true };
    } catch (e) {
      logger.error('[Gamification] Import failed:', e);
      return { success: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
    }
  }, [state, user?.credits]);

  const resetState = useCallback(async () => {
    const fresh: GamificationState = {
      credits: user?.credits ?? 100,
      level: 1,
      xp: 0,
      xpToNextLevel: 1000,
      achievements: initialAchievements.map(a => ({ ...a, progress: 0, unlockedAt: undefined })),
      referrals: [],
      referralCode: seedReferralCode(user?.id || user?.email),
      iterationStats: { totalIterations: 0, successfulBuilds: 0, failedBuilds: 0, totalCreditsSpent: 0, averageBuildTime: 0 },
      streak: 0,
      lastActiveDate: new Date().toISOString(),
      dailyCredits: DAILY_CREDITS_MAX,
      dailyCreditsMax: DAILY_CREDITS_MAX,
      lastRegenDate: new Date().toISOString(),
    };
    setState(fresh);
    logger.warn('[Gamification] State reset.');
  }, [user?.credits, user?.id, user?.email]);

  /** ───────── Exposed API ───────── **/
  return useMemo(() => ({
    ...state,
    addCredits,
    spendCredits,
    addXP,
    unlockAchievement,
    updateAchievementProgress,
    addReferral,
    completeReferral,
    recordIteration,
    updateStreak,
    regenerateDailyCredits,
    exportState,
    importState,
    resetState,
  }), [
    state,
    addCredits,
    spendCredits,
    addXP,
    unlockAchievement,
    updateAchievementProgress,
    addReferral,
    completeReferral,
    recordIteration,
    updateStreak,
    regenerateDailyCredits,
    exportState,
    importState,
    resetState,
  ]);
});

/** ───────────────────────── Merge helpers ───────────────────────── **/
function mergeAchievements(incoming?: Achievement[]): Achievement[] {
  const base = new Map(initialAchievements.map(a => [a.id, a]));
  (incoming || []).forEach(a => {
    const def = base.get(a.id);
    if (!def) base.set(a.id, a);
    else base.set(a.id, { ...def, ...a, progress: clamp(a.progress ?? 0, 0, def.maxProgress) });
  });
  return Array.from(base.values());
}

function mergeStateDefaults(s: GamificationState): GamificationState {
  return {
    credits: s.credits ?? 100,
    level: s.level ?? 1,
    xp: s.xp ?? 0,
    xpToNextLevel: s.xpToNextLevel ?? 1000,
    achievements: mergeAchievements(s.achievements),
    referrals: s.referrals ?? [],
    referralCode: s.referralCode || randomReferralCode(),
    iterationStats: {
      totalIterations: s.iterationStats?.totalIterations ?? 0,
      successfulBuilds: s.iterationStats?.successfulBuilds ?? 0,
      failedBuilds: s.iterationStats?.failedBuilds ?? 0,
      totalCreditsSpent: s.iterationStats?.totalCreditsSpent ?? 0,
      averageBuildTime: s.iterationStats?.averageBuildTime ?? 0,
      lastBuildDate: s.iterationStats?.lastBuildDate,
    },
    streak: s.streak ?? 0,
    lastActiveDate: s.lastActiveDate ?? new Date().toISOString(),
    dailyCredits: s.dailyCredits ?? DAILY_CREDITS_MAX,
    dailyCreditsMax: s.dailyCreditsMax ?? DAILY_CREDITS_MAX,
    lastRegenDate: s.lastRegenDate ?? new Date().toISOString(),
  };
}
