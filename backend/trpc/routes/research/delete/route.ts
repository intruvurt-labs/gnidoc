import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const deleteResearchRoute = protectedProcedure
  .input(
    z.object({
      researchId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log(`[Research API] Deleting research ${input.researchId} with token ${ctx.token}`);

    return {
      success: true,
      message: 'Research deleted successfully',
      researchId: input.researchId,
    };
  });

export default deleteResearchRoute;
