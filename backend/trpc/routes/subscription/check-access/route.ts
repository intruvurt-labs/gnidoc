import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { query } from '@/backend/db/pool';

const FEATURE_MAP: Record<string, Array<'free' | 'basic' | 'pro' | 'enterprise'>> = {
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

export default protectedProcedure
  .input(z.object({ feature: z.string() }))
  .query(async ({ input, ctx }) => {
    console.log('[subscription.checkAccess] userId', ctx.userId, 'feature', input.feature);
    const { rows } = await query<{ subscription: 'free' | 'basic' | 'pro' | 'enterprise' }>(
      'SELECT subscription FROM users WHERE id = $1 LIMIT 1',
      [ctx.userId]
    );
    const tier = rows[0]?.subscription ?? 'free';
    const allowedTiers = FEATURE_MAP[input.feature] ?? [];
    const allowed = allowedTiers.includes(tier);
    return { allowed, tier };
  });
