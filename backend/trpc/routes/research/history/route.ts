import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const researchHistoryRoute = protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log(`[Research API] Fetching research history with token ${ctx.token}`);

    return {
      results: [],
      total: 0,
      limit: input.limit,
      offset: input.offset,
    };
  });

export default researchHistoryRoute;
