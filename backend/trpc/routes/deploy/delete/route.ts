import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';

export const deleteDeploymentProcedure = publicProcedure
  .input(
    z.object({
      deploymentId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { deploymentId } = input;

    console.log(`[Deploy API] Deleting deployment: ${deploymentId}`);

    return {
      success: true,
      message: `Deployment ${deploymentId} deleted successfully`,
    };
  });

export default deleteDeploymentProcedure;
