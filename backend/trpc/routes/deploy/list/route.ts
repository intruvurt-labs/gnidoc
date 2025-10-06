import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';

export const listDeploymentsProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    })
  )
  .query(async ({ input }) => {
    const { userId, limit } = input;

    console.log(`[Deploy API] Listing deployments for user: ${userId || 'all'}`);

    const mockDeployments = [
      {
        id: 'deploy-1',
        projectId: 'proj-1',
        projectName: 'E-commerce Store',
        subdomain: 'mystore',
        url: 'https://mystore.gnidoc.app',
        tier: 'professional' as const,
        status: 'active' as const,
        deployedAt: new Date(Date.now() - 86400000 * 2),
      },
      {
        id: 'deploy-2',
        projectId: 'proj-2',
        projectName: 'Portfolio Website',
        subdomain: 'portfolio',
        url: 'https://portfolio.gnidoc.app',
        tier: 'starter' as const,
        status: 'active' as const,
        deployedAt: new Date(Date.now() - 86400000 * 5),
      },
    ];

    return {
      deployments: mockDeployments.slice(0, limit),
      total: mockDeployments.length,
    };
  });

export default listDeploymentsProcedure;
