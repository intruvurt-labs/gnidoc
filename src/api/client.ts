import { createTRPCClient, httpBatchLink } from '@trpc/client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import SuperJSON from 'superjson';
import type { AppRouter } from '../../backend/trpc/app-router';

const API_BASE = Constants.expoConfig?.extra?.apiBase || process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:8787';

async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('auth_token');
  } catch {
    return null;
  }
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_BASE}/api/trpc`,
      async headers() {
        const token = await getAuthToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
      transformer: SuperJSON,
    }),
  ],
});

export interface SyncMutationRequest {
  op: string;
  targetType: string;
  targetId: string;
  payload: any;
  baseVersion: number;
  idempotencyKey: string;
}

export interface SyncMutationResponse {
  success: boolean;
  newVersion?: number;
  conflict?: {
    base: any;
    remote: any;
    policy: string;
  };
  error?: string;
}

export interface SyncChangesRequest {
  since: string;
  projectId?: string;
}

export interface SyncChangesResponse {
  cursor: string;
  changes: {
    type: string;
    id: string;
    data: any;
    version: number;
  }[];
}

export interface ValidationRequest {
  blockType: string;
  value: any;
}

export interface ValidationResponse {
  ok: boolean;
  errors: { path: string; message: string }[];
}

export interface RevisionResponse {
  entity_type: string;
  entity_id: string;
  version: number;
  patch: any;
  actor: string;
  created_at: string;
}

export interface OrchestrationResponse {
  run_id: string;
  project_id: string;
  blueprint_id: string;
  consensus: number;
  votes: {
    model: string;
    output: any;
    confidence: number;
  }[];
  critiques: {
    model: string;
    text: string;
  }[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  finished_at?: string;
}

export interface AnalyticsSummaryResponse {
  runSuccessRate: number;
  consensusP50: number;
  consensusP95: number;
  avgLatencyMs: number;
  conflictsPerK: number;
  quarantineCount: number;
}

export interface EntitlementsResponse {
  plan: string;
  limits: {
    concurrentRuns: number;
    maxProjects: number;
    maxNodesPerBlueprint: number;
  };
  usage: {
    concurrentRuns: number;
    projects: number;
  };
}

export interface ExportRequest {
  type: 'blueprint' | 'run';
  id: string;
  format: 'json' | 'yaml' | 'zip';
}

export interface ExportResponse {
  jobId: string;
}

export interface ExportStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  error?: string;
}

export class RestClient {
  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (init?.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      });
    }
    
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return response.json();
  }

  async syncMutate(req: SyncMutationRequest): Promise<SyncMutationResponse> {
    return this.fetch('/sync/mutate', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async syncChanges(req: SyncChangesRequest): Promise<SyncChangesResponse> {
    const params = new URLSearchParams({ since: req.since });
    if (req.projectId) params.append('projectId', req.projectId);
    return this.fetch(`/sync/changes?${params}`);
  }

  async validateBlock(req: ValidationRequest): Promise<ValidationResponse> {
    return this.fetch('/validate/block', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async getRevisions(entityType: string, entityId: string): Promise<RevisionResponse[]> {
    return this.fetch(`/revisions/${entityType}/${entityId}`);
  }

  async rollbackRevision(entityType: string, entityId: string, toVersion: number): Promise<void> {
    await this.fetch('/revisions/rollback', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId, toVersion }),
    });
  }

  async getOrchestration(runId: string): Promise<OrchestrationResponse> {
    return this.fetch(`/orchestrations/${runId}`);
  }

  async rerunOrchestration(runId: string, shard?: string): Promise<void> {
    const params = shard ? `?shard=${shard}` : '';
    await this.fetch(`/orchestrations/${runId}/rerun${params}`, { method: 'POST' });
  }

  async getAnalyticsSummary(from: string, to: string, tenantId?: string): Promise<AnalyticsSummaryResponse> {
    const params = new URLSearchParams({ from, to });
    if (tenantId) params.append('tenantId', tenantId);
    return this.fetch(`/analytics/summary?${params}`);
  }

  async getEntitlements(): Promise<EntitlementsResponse> {
    return this.fetch('/entitlements/me');
  }

  async createExport(req: ExportRequest): Promise<ExportResponse> {
    return this.fetch('/exports', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async getExportStatus(jobId: string): Promise<ExportStatusResponse> {
    return this.fetch(`/exports/${jobId}`);
  }
}

export const restClient = new RestClient();
