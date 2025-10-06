import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';

export const createDeploymentProcedure = publicProcedure
  .input(
    z.object({
      projectId: z.string(),
      projectName: z.string(),
      subdomain: z.string().regex(/^[a-z0-9-]+$/, 'Subdomain must contain only lowercase letters, numbers, and hyphens'),
      customDomain: z.string().optional(),
      buildOutput: z.string(),
      tier: z.enum(['free', 'starter', 'professional', 'premium']),
    })
  )
  .mutation(async ({ input }) => {
    const { projectId, projectName, subdomain, customDomain, buildOutput, tier } = input;

    console.log(`[Deploy API] Creating deployment for project: ${projectName}`);
    console.log(`[Deploy API] Subdomain: ${subdomain}, Tier: ${tier}`);

    const deployment = {
      id: `deploy-${Date.now()}`,
      projectId,
      projectName,
      subdomain,
      customDomain,
      url: customDomain || `https://${subdomain}.gnidoc.app`,
      tier,
      status: 'active' as const,
      deployedAt: new Date(),
      buildSize: buildOutput.length,
    };

    console.log(`[Deploy API] Deployment created: ${deployment.url}`);

    return deployment;
  });

export default createDeploymentProcedure;
