import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const exportResearchRoute = protectedProcedure
  .input(
    z.object({
      researchId: z.string(),
      format: z.enum(['markdown', 'json', 'pdf']).optional().default('markdown'),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log(`[Research API] Exporting research ${input.researchId} as ${input.format} with token ${ctx.token}`);

    return {
      success: true,
      format: input.format,
      content: '# Research Export\n\nResearch content here...',
      filename: `research-${input.researchId}.${input.format === 'markdown' ? 'md' : input.format}`,
    };
  });

export default exportResearchRoute;
