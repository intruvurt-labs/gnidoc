import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { runSingleProvider } from '../../../../lib/providers/orchestrator';
import { GenInput } from '../../../../lib/providers/types';

export default protectedProcedure
  .input(
    z.object({
      provider: z.string(),
      prompt: z.string().min(1),
      system: z.string().optional(),
      images: z.array(z.string()).optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().optional(),
      taskType: z.enum(['code', 'text']).optional().default('text'),
    })
  )
  .mutation(async ({ input }) => {
    const genInput = GenInput.parse({
      prompt: input.prompt,
      system: input.system,
      images: input.images,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    });

    const result = await runSingleProvider(
      input.provider,
      genInput,
      input.taskType
    );

    return {
      success: true,
      result,
    };
  });
