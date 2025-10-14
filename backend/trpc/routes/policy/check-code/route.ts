import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { enforceNoDemo } from '@/lib/noDemoEnforcement';

export const checkCodeProcedure = protectedProcedure
  .input(
    z.object({
      code: z.string(),
      tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
      overrideMode: z.enum(['disabled', 'warn', 'block']).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { code, tier, overrideMode } = input;

    const result = enforceNoDemo(code, tier, overrideMode ? { mode: overrideMode } : undefined);

    console.log('[Policy] Code check:', {
      tier,
      offendingLines: result.scanResult.offendingLines,
      allowed: result.allowed,
      creditsAwarded: result.creditsAwarded,
    });

    return result;
  });
