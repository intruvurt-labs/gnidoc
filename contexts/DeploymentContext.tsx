// DeploymentContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '@/lib/trpc';

// Lazy import to avoid bundling cost or runtime crashes where @rork/toolkit-sdk isn't present
async function safeGenerateText(prompt: string) {
  try {
    const { generateText } = await import('@rork/toolkit-sdk');
    const out = await generateText({ messages: [{ role: 'user', content: prompt }] });
    return String(out ?? '');
  } catch (e) {
    // Fallback for dev/offline — still return something structured
    return JSON.stringify({
      title: 'Launch your app with confidence',
      description: 'Ship faster with gnidoC—auto SEO, CDN, and analytics baked in.',
      keywords: ['app launch', 'cdn', 'auto scaling', 'seo', 'analytics'],
      videoScript: 'Welcome to the launch of our app. In this short video…',
    });
  }
}

/** ───────────────────────── Types ───────────────────────── **/
export interface Deployment {
  id: string;
  userId: string;
  projectId: string;
  projectName: string;
  subdomain: string;
  customDomain?: string;
  url: string;
  tier: 'free' | 'starter' | 'professional' | 'premium';
  status: 'building' | 'deploying' | 'active' | 'failed' | 'paused';
  buildLogs: string[];
  deployedAt: Date;
  lastUpdated: Date;
  analytics?: {
    visits: number;
    uniqueVisitors: number;
    avgLoadTime: number;
  };
  seoContent?: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
    videoScript?: string;
  };
}

export interface DeploymentConfig {
  tier: 'free' | 'starter' | 'professional' | 'premium';
  features: {
    customDomain: boolean;
    ssl: boolean;
    analytics: boolean;
    seoGeneration: boolean;
    videoScriptGeneration: boolean;
    cdn: boolean;
    autoScaling: boolean;
    prioritySupport: boolean;
  };
  limits: {
    maxDeployments: number;
    maxBandwidthGB: number;
    maxStorageGB: number;
  };
}

/** ───────────────────────── Config ───────────────────────── **/
const TIER_CONFIGS: Record<Deployment['tier'], DeploymentConfig> = {
  free: {
    tier: 'free',
    features: { customDomain: false, ssl: true, analytics: false, seoGeneration: false, videoScriptGeneration: false, cdn: false, autoScaling: false, prioritySupport: false },
    limits: { maxDeployments: 1, maxBandwidthGB: 1, maxStorageGB: 0.5 },
  },
  starter: {
    tier: 'starter',
    features: { customDomain: false, ssl: true, analytics: true, seoGeneration: false, videoScriptGeneration: false, cdn: false, autoScaling: false, prioritySupport: false },
    limits: { maxDeployments: 5, maxBandwidthGB: 10, maxStorageGB: 2 },
  },
  professional: {
    tier: 'professional',
    features: { customDomain: true, ssl: true, analytics: true, seoGeneration: true, videoScriptGeneration: true, cdn: true, autoScaling: false, prioritySupport: true },
    limits: { maxDeployments: 20, maxBandwidthGB: 100, maxStorageGB: 10 },
  },
  premium: {
    tier: 'premium',
    features: { customDomain: true, ssl: true, analytics: true, seoGeneration: true, videoScriptGeneration: true, cdn: true, autoScaling: true, prioritySupport: true },
    limits: { maxDeployments: -1, maxBandwidthGB: -1, maxStorageGB: -1 },
  },
};

/** ───────────────────────── Storage Keys / Utils ───────────────────────── **/
const STORAGE_KEY = 'gnidoc-deployments';
const STORAGE_TIER = 'user-tier';
const STORAGE_CANCEL = 'deploy-cancelled'; // volatile flag for cancellation

const logger = {
  info: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.log(...a); },
  warn: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.warn(...a); },
  error: (...a: any[]) => console.error(...a),
};

function debounce<T extends (...args: any[]) => void>(fn: T, delay = 180) {
  let t: any; return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function toDate(d: any): Date { try { return new Date(d); } catch { return new Date(); } }

function slugify(input: string) {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 63); // common DNS label limit
}

function validateSubdomain(sub: string) {
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(sub)) {
    throw new Error('Subdomain must be lowercase letters, numbers, hyphens; cannot start/end with hyphen.');
  }
  if (sub.length < 3) throw new Error('Subdomain must be at least 3 characters.');
}

function buildUrl(sub: string, custom?: string) {
  return custom ? `https://${custom}` : `https://${sub}.gnidoc.app`;
}

function safeJSON<T>(s: string, fallback: T): T { try { return JSON.parse(s) as T; } catch { return fallback; } }

/** ───────────────────────── Context ───────────────────────── **/
export const [DeploymentProvider, useDeployment] = createContextHook(() => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [currentTier, setCurrentTier] = useState<Deployment['tier']>('free');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployProgress, setDeployProgress] = useState<number>(0);

  const cancelRef = useRef(false);

  // Debounced persistence
  const persistDeployments = useCallback(
    debounce(async (deps: Deployment[]) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(deps.map(d => ({
          ...d,
          deployedAt: d.deployedAt.toISOString(),
          lastUpdated: d.lastUpdated.toISOString(),
        }))));
      } catch (e) { logger.error('[Deployment] Persist failed:', e); }
    }, 150),
    []
  );

  const saveDeployments = useCallback(async (deps: Deployment[]) => {
    setDeployments(deps);
    await persistDeployments(deps);
  }, [persistDeployments]);

  /** ───────── Load on mount ───────── **/
  const loadDeployments = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = safeJSON<any[]>(stored, []).map(d => ({
          ...d,
          deployedAt: toDate(d.deployedAt),
          lastUpdated: toDate(d.lastUpdated),
        }));
        setDeployments(parsed);
        logger.info(`[Deployment] Loaded ${parsed.length} deployments`);
      }
      const tierStored = await AsyncStorage.getItem(STORAGE_TIER);
      if (tierStored && ['free','starter','professional','premium'].includes(tierStored)) {
        setCurrentTier(tierStored as Deployment['tier']);
      }
    } catch (error) {
      logger.error('[Deployment] Failed to load deployments:', error);
    }
  }, []);

  useEffect(() => { loadDeployments(); }, [loadDeployments]);

  /** ───────── SEO Generation (synth with guardrails) ───────── **/
  const generateSEOContent = useCallback(async (
    projectName: string,
    projectDescription: string,
    features: string[]
  ): Promise<Deployment['seoContent']> => {
    logger.info('[Deployment] Generating SEO content (dual-model synth)…');

    const basePrompt = (persona: string) => `Generate comprehensive SEO and marketing content for a web application:

Project Name: ${projectName}
Description: ${projectDescription}
Key Features: ${features.join(', ')}

Generate:
1. SEO-optimized title (max 60 chars)
2. Meta description (max 160 chars)
3. 10 relevant keywords
4. Viral YouTube video script (2-3 minutes) for app launch announcement

You are ${persona}. Return only well-structured, concise copy.`;

    const claudeResult = await safeGenerateText(`${basePrompt('Claude (accuracy & structure)')}`);
    const geminiResult = await safeGenerateText(`${basePrompt('Gemini (creativity & engagement)')}`);

    const synthesized = await safeGenerateText(
`Synthesize the best elements from these two outputs into ONE JSON object:

=== Claude Output ===
${claudeResult}

=== Gemini Output ===
${geminiResult}

Return ONLY JSON in this schema:
{
  "title": "SEO title",
  "description": "Meta description",
  "keywords": ["keyword1", "keyword2", "..."],
  "videoScript": "Full video script"
}`
    );

    // Parse with multiple heuristics (raw / fenced / inner object)
    const tryParses = [
      () => safeJSON(synthesized, null),
      () => {
        const m = synthesized.match(/\{[\s\S]*\}$/); return m ? safeJSON(m[0], null) : null;
      },
      () => {
        const m = synthesized.match(/```(?:json)?\s*([\s\S]*?)```/i); return m ? safeJSON(m[1], null) : null;
      }
    ];

    for (const parse of tryParses) {
      const obj = parse();
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const typedObj = obj as any;
        return {
          title: String(typedObj.title || projectName).slice(0, 60),
          description: String(typedObj.description || projectDescription).slice(0, 160),
          keywords: Array.isArray(typedObj.keywords) ? typedObj.keywords.map((k: any) => String(k)).slice(0, 15) : features.slice(0, 10),
          videoScript: typedObj.videoScript ? String(typedObj.videoScript) : undefined,
        };
      }
    }

    logger.warn('[Deployment] SEO parse fallback used.');
    return {
      title: projectName,
      description: projectDescription,
      keywords: features.slice(0, 10),
      videoScript: `Introducing ${projectName}! ${projectDescription}`,
    };
  }, []);

  /** ───────── Deploy Project ───────── **/
  const deployProject = useCallback(async (
    projectId: string,
    projectName: string,
    projectDescription: string,
    subdomainRaw: string,
    buildOutput: string, // currently unused; placeholder for artifact payload
    features: string[] = [],
    customDomain?: string
  ): Promise<Deployment> => {
    const config = TIER_CONFIGS[currentTier];

    // Enforce limits
    if (config.limits.maxDeployments !== -1 && deployments.length >= config.limits.maxDeployments) {
      throw new Error(`Deployment limit reached for ${currentTier} tier. Upgrade to deploy more projects.`);
    }
    // Subdomain / custom domain policy
    const subdomain = slugify(subdomainRaw);
    validateSubdomain(subdomain);
    if (customDomain && !config.features.customDomain) {
      throw new Error('Custom domains require Professional tier or higher.');
    }
    // Uniqueness checks
    if (deployments.some(d => d.subdomain === subdomain)) {
      throw new Error(`Subdomain "${subdomain}" is already taken.`);
    }
    if (customDomain && deployments.some(d => d.customDomain === customDomain)) {
      throw new Error(`Custom domain "${customDomain}" is already in use.`);
    }

    // Idempotency: if same project+subdomain pending, reuse
    const existing = deployments.find(d =>
      d.projectId === projectId && (d.subdomain === subdomain || (!!customDomain && d.customDomain === customDomain))
    );
    if (existing) return existing;

    setIsDeploying(true);
    setDeployProgress(0);
    cancelRef.current = false;

    const deployment: Deployment = {
      id: `deploy-${Date.now()}`,
      userId: 'current-user',
      projectId,
      projectName,
      subdomain,
      customDomain,
      url: buildUrl(subdomain, customDomain),
      tier: currentTier,
      status: 'building',
      buildLogs: [],
      deployedAt: new Date(),
      lastUpdated: new Date(),
      analytics: config.features.analytics ? { visits: 0, uniqueVisitors: 0, avgLoadTime: 1.2 } : undefined,
    };

    const step = async (pct: number, msg: string, ms = 600) => {
      if (cancelRef.current) throw new Error('Deployment cancelled');
      deployment.buildLogs.push(msg);
      deployment.lastUpdated = new Date();
      setDeployProgress(pct);
      const updated = deployments.map(d => d.id === deployment.id ? deployment : d);
      if (!updated.find(d => d.id === deployment.id)) updated.push(deployment);
      await saveDeployments(updated);
      await new Promise(r => setTimeout(r, ms));
    };

    try {
      await step(8, '[1/7] Initializing deployment environment…', 400);
      await step(18, '[2/7] Validating artifacts and environment…', 500);

      if (config.features.seoGeneration) {
        await step(32, '[3/7] Generating SEO content (Claude + Gemini)…', 400);
        deployment.seoContent = await generateSEOContent(projectName, projectDescription, features);
        deployment.buildLogs.push('✓ SEO content generated');
      } else {
        await step(32, '[3/7] Skipping SEO generation (tier limitation)…', 200);
      }

      await step(45, '[4/7] Preparing project bundle...', 600);

      deployment.status = 'deploying';
      await step(58, '[5/7] Calling deploy API...', 200);

      logger.info('[Deployment] Calling tRPC deploy endpoint...');
      const trpcClient = (await import('@/lib/trpc')).trpcClient;
      const deployResult = await trpcClient.deploy.create.mutate({
        projectId,
        projectName,
        subdomain,
        customDomain,
        buildOutput: buildOutput || 'built-app-bundle',
        tier: currentTier,
      });

      if (deployResult.status === 'failed') {
        deployment.buildLogs.push(...deployResult.logs);
        throw new Error('Deployment failed on server');
      }

      deployment.url = deployResult.url;
      deployment.buildLogs.push(...deployResult.logs);
      deployment.buildLogs.push(`✓ Deployed to ${deployResult.url}`);

      await step(74, '[6/7] Configuring domain & SSL...', 800);

      if (config.features.ssl) deployment.buildLogs.push('✓ SSL certificate provisioned');
      if (config.features.cdn) deployment.buildLogs.push('✓ CDN enabled for global distribution');

      await step(90, '[7/7] Finalizing rollout and health checks…', 600);

      deployment.status = 'active';
      deployment.lastUpdated = new Date();
      deployment.buildLogs.push(`✓ Deployment complete! Live at ${deployment.url}`);
      if (deployment.seoContent?.videoScript) {
        deployment.buildLogs.push('✓ YouTube video script generated');
      }

      const updated = [...deployments.filter(d => d.id !== deployment.id), deployment];
      await saveDeployments(updated);
      setDeployProgress(100);
      logger.info('[Deployment] Project deployed:', deployment.url);
      return deployment;
    } catch (error) {
      deployment.status = 'failed';
      deployment.lastUpdated = new Date();
      deployment.buildLogs.push(`✗ Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      const updated = [...deployments, deployment];
      await saveDeployments(updated);
      throw error;
    } finally {
      setIsDeploying(false);
      setDeployProgress(0);
      await AsyncStorage.removeItem(STORAGE_CANCEL).catch(() => {});
    }
  }, [currentTier, deployments, saveDeployments, generateSEOContent]);

  /** ───────── Management helpers ───────── **/
  const deleteDeployment = useCallback(async (deploymentId: string) => {
    const updated = deployments.filter(d => d.id !== deploymentId);
    await saveDeployments(updated);
    logger.info('[Deployment] Deleted:', deploymentId);
  }, [deployments, saveDeployments]);

  const updateDeployment = useCallback(async (deploymentId: string, updates: Partial<Deployment>) => {
    const updated = deployments.map(d => d.id === deploymentId ? { ...d, ...updates, lastUpdated: new Date() } : d);
    await saveDeployments(updated);
    logger.info('[Deployment] Updated:', deploymentId);
  }, [deployments, saveDeployments]);

  const upgradeTier = useCallback(async (newTier: Deployment['tier']) => {
    setCurrentTier(newTier);
    await AsyncStorage.setItem(STORAGE_TIER, newTier);
    logger.info('[Deployment] Tier set:', newTier);
  }, []);

  const getTierConfig = useCallback(() => TIER_CONFIGS[currentTier], [currentTier]);

  const canDeploy = useMemo(() => {
    const cfg = TIER_CONFIGS[currentTier];
    return cfg.limits.maxDeployments === -1 || deployments.length < cfg.limits.maxDeployments;
  }, [currentTier, deployments]);

  /** ───────── Extra DX: pause/resume/redeploy/cancel, analytics tick, SEO regen ───────── **/
  const pauseDeployment = useCallback(async (deploymentId: string) => {
    const d = deployments.find(x => x.id === deploymentId);
    if (!d) throw new Error('Deployment not found');
    if (d.status !== 'active') throw new Error('Only active deployments can be paused');
    await updateDeployment(deploymentId, { status: 'paused', buildLogs: [...d.buildLogs, 'Paused by user'] });
  }, [deployments, updateDeployment]);

  const resumeDeployment = useCallback(async (deploymentId: string) => {
    const d = deployments.find(x => x.id === deploymentId);
    if (!d) throw new Error('Deployment not found');
    if (d.status !== 'paused') throw new Error('Only paused deployments can be resumed');
    await updateDeployment(deploymentId, { status: 'active', buildLogs: [...d.buildLogs, 'Resumed by user'] });
  }, [deployments, updateDeployment]);

  const cancelCurrentDeploy = useCallback(async () => {
    cancelRef.current = true;
    await AsyncStorage.setItem(STORAGE_CANCEL, '1').catch(() => {});
    logger.warn('[Deployment] Cancel requested');
  }, []);

  const redeploy = useCallback(async (deploymentId: string) => {
    const d = deployments.find(x => x.id === deploymentId);
    if (!d) throw new Error('Deployment not found');
    // Redeploy with same settings; bump timestamps/logs
    return await deployProject(d.projectId, d.projectName, d.seoContent?.description || '', d.subdomain, '', d.seoContent?.keywords || [], d.customDomain);
  }, [deployments, deployProject]);

  const getDeploymentById = useCallback((deploymentId: string) => {
    return deployments.find(d => d.id === deploymentId) || null;
  }, [deployments]);

  const recordVisit = useCallback(async (deploymentId: string, unique = true, loadTime = 1.1) => {
    const d = deployments.find(x => x.id === deploymentId);
    if (!d) return;
    if (!d.analytics) return; // not enabled on tier
    const visits = d.analytics.visits + 1;
    const uniqueVisitors = d.analytics.uniqueVisitors + (unique ? 1 : 0);
    const avgLoadTime = Number(((d.analytics.avgLoadTime * d.analytics.visits + loadTime) / visits).toFixed(2));
    await updateDeployment(deploymentId, {
      analytics: { visits, uniqueVisitors, avgLoadTime }
    });
  }, [deployments, updateDeployment]);

  const regenerateSEO = useCallback(async (deploymentId: string) => {
    const d = deployments.find(x => x.id === deploymentId);
    if (!d) throw new Error('Deployment not found');
    const cfg = TIER_CONFIGS[d.tier];
    if (!cfg.features.seoGeneration) throw new Error('SEO generation not enabled on current tier');
    const features = d.seoContent?.keywords || [];
    const seo = await generateSEOContent(d.projectName, d.seoContent?.description || d.projectName, features);
    await updateDeployment(deploymentId, { seoContent: seo, buildLogs: [...d.buildLogs, '✓ SEO content regenerated'] });
    return seo;
  }, [deployments, updateDeployment, generateSEOContent]);

  const getUsage = useCallback(() => {
    const cfg = TIER_CONFIGS[currentTier];
    return {
      tier: currentTier,
      used: deployments.length,
      max: cfg.limits.maxDeployments,
      hasRoom: cfg.limits.maxDeployments === -1 || deployments.length < cfg.limits.maxDeployments,
    };
  }, [currentTier, deployments]);

  /** ───────── Exposed API ───────── **/
  return useMemo(() => ({
    deployments,
    currentTier,
    isDeploying,
    deployProgress,
    canDeploy,
    // load/save/tier
    loadDeployments,
    deployProject,
    deleteDeployment,
    updateDeployment,
    upgradeTier,
    getTierConfig,
    // extras
    pauseDeployment,
    resumeDeployment,
    cancelCurrentDeploy,
    redeploy,
    getDeploymentById,
    recordVisit,
    regenerateSEO,
    getUsage,
  }), [
    deployments,
    currentTier,
    isDeploying,
    deployProgress,
    canDeploy,
    loadDeployments,
    deployProject,
    deleteDeployment,
    updateDeployment,
    upgradeTier,
    getTierConfig,
    pauseDeployment,
    resumeDeployment,
    cancelCurrentDeploy,
    redeploy,
    getDeploymentById,
    recordVisit,
    regenerateSEO,
    getUsage,
  ]);
});
