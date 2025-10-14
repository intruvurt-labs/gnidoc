import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { handleManualFlag } from '@/lib/noDemoEnforcement';

export const manualFlagProcedure = protectedProcedure
  .input(
    z.object({
      code: z.string(),
      tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
      userNotes: z.string().optional(),
      artifactId: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { code, tier, userNotes, artifactId } = input;

    const result = handleManualFlag(code, tier, userNotes);

    console.log('[Policy] Manual flag:', {
      token: ctx.token,
      tier,
      artifactId,
      offendingLines: result.scanResult.offendingLines,
      creditsAwarded: result.creditsAwarded,
      notes: userNotes,
    });

    return result;
  });
