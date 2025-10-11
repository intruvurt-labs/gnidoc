import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

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
  lastActiveDate: string;
}

const STORAGE_KEY = 'gamification-state';

const initialAchievements: Achievement[] = [
  {
    id: 'first-build',
    title: 'First Build',
    description: 'Generate your first app',
    icon: '🎯',
    points: 100,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'power-user',
    title: 'Power User',
    description: 'Generate 10 apps',
    icon: '⚡',
    points: 500,
    progress: 0,
    maxProgress: 10,
  },
  {
    id: 'referral-master',
    title: 'Referral Master',
    description: 'Refer 5 friends',
    icon: '🤝',
    points: 1000,
    progress: 0,
    maxProgress: 5,
  },
  {
    id: 'streak-warrior',
    title: 'Streak Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    points: 750,
    progress: 0,
    maxProgress: 7,
  },
  {
    id: 'code-master',
    title: 'Code Master',
    description: 'Generate 100 apps',
    icon: '👑',
    points: 5000,
    progress: 0,
    maxProgress: 100,
  },
];

export const [GamificationProvider, useGamification] = createContextHook(() => {
  const { user, updateCredits } = useAuth();
  
  const [state, setState] = useState<GamificationState>({
    credits: user?.credits || 100,
    level: 1,
    xp: 0,
    xpToNextLevel: 1000,
    achievements: initialAchievements,
    referrals: [],
    referralCode: generateReferralCode(),
    iterationStats: {
      totalIterations: 0,
      successfulBuilds: 0,
      failedBuilds: 0,
      totalCreditsSpent: 0,
      averageBuildTime: 0,
    },
    streak: 0,
    lastActiveDate: new Date().toISOString(),
  });

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    saveState();
  }, [state]);

  useEffect(() => {
    if (user?.credits !== undefined && user.credits !== state.credits) {
      setState(prev => ({ ...prev, credits: user.credits }));
    }
  }, [user?.credits]);

  const loadState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState(prev => ({
          ...prev,
          ...parsed,
          credits: user?.credits || parsed.credits,
        }));
        console.log('[Gamification] State loaded');
      }
    } catch (error) {
      console.error('[Gamification] Failed to load state:', error);
    }
  };

  const saveState = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('[Gamification] Failed to save state:', error);
    }
  };

  const addCredits = useCallback(async (amount: number, reason: string) => {
    const newCredits = state.credits + amount;
    setState(prev => ({ ...prev, credits: newCredits }));
    
    if (updateCredits) {
      await updateCredits(amount);
    }
    
    console.log(`[Gamification] Added ${amount} credits: ${reason}`);
    return newCredits;
  }, [state.credits, updateCredits]);

  const spendCredits = useCallback(async (amount: number, reason: string) => {
    if (state.credits < amount) {
      throw new Error('Insufficient credits');
    }
    
    const newCredits = state.credits - amount;
    setState(prev => ({ ...prev, credits: newCredits }));
    
    if (updateCredits) {
      await updateCredits(-amount);
    }
    
    console.log(`[Gamification] Spent ${amount} credits: ${reason}`);
    return newCredits;
  }, [state.credits, updateCredits]);

  const addXP = useCallback((amount: number, reason: string) => {
    let newXP = state.xp + amount;
    let newLevel = state.level;
    let xpToNext = state.xpToNextLevel;

    while (newXP >= xpToNext) {
      newXP -= xpToNext;
      newLevel += 1;
      xpToNext = calculateXPForLevel(newLevel + 1);
      
      const levelUpBonus = newLevel * 50;
      addCredits(levelUpBonus, `Level ${newLevel} bonus`);
      
      console.log(`[Gamification] Level up! Now level ${newLevel}`);
    }

    setState(prev => ({
      ...prev,
      xp: newXP,
      level: newLevel,
      xpToNextLevel: xpToNext,
    }));

    console.log(`[Gamification] Added ${amount} XP: ${reason}`);
  }, [state.xp, state.level, state.xpToNextLevel, addCredits]);

  const unlockAchievement = useCallback((achievementId: string) => {
    setState(prev => {
      const achievements = prev.achievements.map(ach => {
        if (ach.id === achievementId && !ach.unlockedAt) {
          addXP(ach.points, `Achievement: ${ach.title}`);
          addCredits(ach.points / 2, `Achievement: ${ach.title}`);
          
          return {
            ...ach,
            unlockedAt: new Date().toISOString(),
            progress: ach.maxProgress,
          };
        }
        return ach;
      });

      return { ...prev, achievements };
    });
  }, [addXP, addCredits]);

  const updateAchievementProgress = useCallback((achievementId: string, progress: number) => {
    setState(prev => {
      const achievements = prev.achievements.map(ach => {
        if (ach.id === achievementId) {
          const newProgress = Math.min(progress, ach.maxProgress);
          
          if (newProgress >= ach.maxProgress && !ach.unlockedAt) {
            unlockAchievement(achievementId);
          }
          
          return { ...ach, progress: newProgress };
        }
        return ach;
      });

      return { ...prev, achievements };
    });
  }, [unlockAchievement]);

  const addReferral = useCallback(async (email: string, name: string) => {
    const referral: Referral = {
      id: `ref_${Date.now()}`,
      code: state.referralCode,
      referredEmail: email,
      referredName: name,
      creditsEarned: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      referrals: [...prev.referrals, referral],
    }));

    console.log('[Gamification] Referral added:', email);
    return referral;
  }, [state.referralCode]);

  const completeReferral = useCallback(async (referralId: string) => {
    const referralBonus = 500;
    
    setState(prev => {
      const referrals = prev.referrals.map(ref => {
        if (ref.id === referralId && ref.status === 'pending') {
          return {
            ...ref,
            status: 'completed' as const,
            creditsEarned: referralBonus,
          };
        }
        return ref;
      });

      return { ...prev, referrals };
    });

    await addCredits(referralBonus, 'Referral bonus');
    addXP(250, 'Referral completed');
    
    const completedReferrals = state.referrals.filter(r => r.status === 'completed').length + 1;
    updateAchievementProgress('referral-master', completedReferrals);

    console.log('[Gamification] Referral completed:', referralId);
  }, [state.referrals, addCredits, addXP, updateAchievementProgress]);

  const recordIteration = useCallback((success: boolean, buildTime: number, creditsSpent: number) => {
    setState(prev => {
      const stats = prev.iterationStats;
      const totalIterations = stats.totalIterations + 1;
      const successfulBuilds = success ? stats.successfulBuilds + 1 : stats.successfulBuilds;
      const failedBuilds = success ? stats.failedBuilds : stats.failedBuilds + 1;
      const totalCreditsSpent = stats.totalCreditsSpent + creditsSpent;
      const averageBuildTime = 
        (stats.averageBuildTime * stats.totalIterations + buildTime) / totalIterations;

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
      updateAchievementProgress('first-build', 1);
      updateAchievementProgress('power-user', state.iterationStats.totalIterations + 1);
      updateAchievementProgress('code-master', state.iterationStats.totalIterations + 1);
    }

    console.log('[Gamification] Iteration recorded:', { success, buildTime, creditsSpent });
  }, [state.iterationStats, addXP, updateAchievementProgress]);

  const updateStreak = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = new Date(state.lastActiveDate).toISOString().split('T')[0];
    
    const daysDiff = Math.floor(
      (new Date(today).getTime() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
    );

    let newStreak = state.streak;
    
    if (daysDiff === 0) {
      return;
    } else if (daysDiff === 1) {
      newStreak += 1;
      addXP(25, `${newStreak} day streak!`);
      updateAchievementProgress('streak-warrior', newStreak);
    } else {
      newStreak = 1;
    }

    setState(prev => ({
      ...prev,
      streak: newStreak,
      lastActiveDate: new Date().toISOString(),
    }));

    console.log('[Gamification] Streak updated:', newStreak);
  }, [state.streak, state.lastActiveDate, addXP, updateAchievementProgress]);

  useEffect(() => {
    updateStreak();
  }, []);

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
  ]);
});

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function calculateXPForLevel(level: number): number {
  return Math.floor(1000 * Math.pow(1.5, level - 1));
}
