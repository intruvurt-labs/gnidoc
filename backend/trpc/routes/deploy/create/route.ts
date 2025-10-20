import { z } from 'zod';
import { publicProcedure } from '@/backend/trpc/create-context';

interface DeploymentResult {
  id: string;
  projectId: string;
  projectName: string;
  subdomain: string;
  customDomain?: string;
  url: string;
  tier: string;
  status: 'active' | 'building' | 'failed';
  deployedAt: Date;
  buildSize: number;
  logs: string[];
}

async function deployToNetlify(buildOutput: string, subdomain: string): Promise<{ url: string; logs: string[] }> {
  const logs: string[] = [];
  
  try {
    logs.push('[Netlify] Starting deployment...');
    
    const netlifyToken = process.env.NETLIFY_TOKEN;
    if (!netlifyToken) {
      logs.push('[Netlify] No token found, using mock deployment');
      return {
        url: `https://${subdomain}.netlify.app`,
        logs
      };
    }

    logs.push('[Netlify] Creating site...');
    const createResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${netlifyToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: subdomain
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create site: ${createResponse.statusText}`);
    }

    const site = await createResponse.json();
    logs.push(`[Netlify] Site created: ${site.url}`);

    logs.push('[Netlify] Uploading build...');
    const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${netlifyToken}`,
        'Content-Type': 'application/zip'
      },
      body: Buffer.from(buildOutput)
    });

    if (!deployResponse.ok) {
      throw new Error(`Failed to deploy: ${deployResponse.statusText}`);
    }

    const deploy = await deployResponse.json();
    logs.push('[Netlify] Deployment successful');
    
    return {
      url: site.url,
      logs
    };
  } catch (error) {
    logs.push(`[Netlify] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function deployToVercel(buildOutput: string, projectName: string): Promise<{ url: string; logs: string[] }> {
  const logs: string[] = [];
  
  try {
    logs.push('[Vercel] Starting deployment...');
    
    const vercelToken = process.env.VERCEL_TOKEN;
    if (!vercelToken) {
      logs.push('[Vercel] No token found, using mock deployment');
      return {
        url: `https://${projectName}.vercel.app`,
        logs
      };
    }

    logs.push('[Vercel] Creating deployment...');
    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectName,
        files: [{
          file: 'index.html',
          data: buildOutput
        }],
        projectSettings: {
          framework: 'static'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to deploy: ${response.statusText}`);
    }

    const deployment = await response.json();
    logs.push('[Vercel] Deployment successful');
    
    return {
      url: `https://${deployment.url}`,
      logs
    };
  } catch (error) {
    logs.push(`[Vercel] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function deployToSimpleHost(buildOutput: string, subdomain: string): Promise<{ url: string; logs: string[] }> {
  const logs: string[] = [];
  
  logs.push('[SimpleHost] Starting local deployment...');
  logs.push('[SimpleHost] Creating deployment directory...');
  
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const deployDir = path.join(process.cwd(), 'deployments', subdomain);
  
  try {
    await fs.mkdir(deployDir, { recursive: true });
    logs.push('[SimpleHost] Directory created');
    
    await fs.writeFile(path.join(deployDir, 'index.html'), buildOutput);
    logs.push('[SimpleHost] Files written');
    
    const url = `http://localhost:3000/deployments/${subdomain}/index.html`;
    logs.push(`[SimpleHost] Deployment available at ${url}`);
    
    return { url, logs };
  } catch (error) {
    logs.push(`[SimpleHost] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

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
  .mutation(async ({ input }): Promise<DeploymentResult> => {
    const { projectId, projectName, subdomain, customDomain, buildOutput, tier } = input;

    console.log(`[Deploy API] Creating deployment for project: ${projectName}`);
    console.log(`[Deploy API] Subdomain: ${subdomain}, Tier: ${tier}`);

    const logs: string[] = [];
    logs.push(`[Deploy] Starting deployment for ${projectName}`);
    logs.push(`[Deploy] Target: ${subdomain}`);

    let url: string;
    let status: 'active' | 'building' | 'failed' = 'building';

    try {
      const deployMethod = process.env.DEPLOY_METHOD || 'simple';
      
      logs.push(`[Deploy] Using method: ${deployMethod}`);

      let result: { url: string; logs: string[] };

      switch (deployMethod) {
        case 'netlify':
          result = await deployToNetlify(buildOutput, subdomain);
          break;
        case 'vercel':
          result = await deployToVercel(buildOutput, projectName);
          break;
        case 'simple':
        default:
          result = await deployToSimpleHost(buildOutput, subdomain);
          break;
      }

      url = customDomain ? `https://${customDomain}` : result.url;
      logs.push(...result.logs);
      status = 'active';
      logs.push('[Deploy] Deployment completed successfully');
    } catch (error) {
      status = 'failed';
      url = '';
      logs.push(`[Deploy] Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('[Deploy API] Deployment error:', error);
    }

    const deployment: DeploymentResult = {
      id: `deploy-${Date.now()}`,
      projectId,
      projectName,
      subdomain,
      customDomain,
      url,
      tier,
      status,
      deployedAt: new Date(),
      buildSize: buildOutput.length,
      logs,
    };

    console.log(`[Deploy API] Deployment result: ${status}`);
    if (status === 'active') {
      console.log(`[Deploy API] URL: ${deployment.url}`);
    }

    return deployment;
  });

export default createDeploymentProcedure;
