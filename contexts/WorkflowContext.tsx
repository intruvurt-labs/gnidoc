import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** ───────────────────────── Types ───────────────────────── */

export interface WorkflowNode {
  id: string;
  type:
    | 'trigger'
    | 'action'
    | 'condition'
    | 'ai-agent'
    | 'code'
    | 'api'
    | 'database'
    | 'transform'
    | 'weather';
  label: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  config: {
    icon?: string;
    color?: string;
    inputs?: string[];
    outputs?: string[];
  };
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  status: 'draft' | 'active' | 'paused' | 'error';
  lastRun?: Date;
  runCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  logs: WorkflowLog[];
  results: Record<string, any>;
}

export interface WorkflowLog {
  id: string;
  nodeId: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  data?: any;
}

/** ───────────────────────── Storage Keys ───────────────────────── */

const STORAGE_KEY = 'gnidoc-workflows';
const EXECUTIONS_KEY = 'gnidoc-workflow-executions';

/** ───────────────────────── Context ───────────────────────── */

export const [WorkflowProvider, useWorkflow] = createContextHook(() => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const loadWorkflows = useCallback(async () => {
    try {
      const [wfRaw, exRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(EXECUTIONS_KEY),
      ]);

      if (wfRaw) {
        const parsedWorkflows = JSON.parse(wfRaw).map((w: any) => ({
          ...w,
          createdAt: new Date(w.createdAt),
          updatedAt: new Date(w.updatedAt),
          lastRun: w.lastRun ? new Date(w.lastRun) : undefined,
        }));
        setWorkflows(parsedWorkflows);
        setCurrentWorkflow((prev) => {
          if (!prev) return parsedWorkflows[0] ?? null;
          const found = parsedWorkflows.find((w: Workflow) => w.id === prev.id);
          return found ?? parsedWorkflows[0] ?? null;
        });
        console.log(`[WorkflowContext] Loaded ${parsedWorkflows.length} workflows`);
      }

      if (exRaw) {
        const parsedExecs = JSON.parse(exRaw).map((e: any) => ({
          ...e,
          startTime: new Date(e.startTime),
          endTime: e.endTime ? new Date(e.endTime) : undefined,
          logs: (e.logs || []).map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) })),
        }));
        setExecutions(parsedExecs);
      }
    } catch (error) {
      console.error('[WorkflowContext] Failed to load data:', error);
    }
  }, []);

  const saveWorkflows = useCallback(async (updatedWorkflows: Workflow[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedWorkflows));
      setWorkflows(updatedWorkflows);
      console.log(`[WorkflowContext] Saved ${updatedWorkflows.length} workflows`);
    } catch (error) {
      console.error('[WorkflowContext] Failed to save workflows:', error);
    }
  }, []);

  const saveExecutions = useCallback(async (updated: WorkflowExecution[]) => {
    try {
      await AsyncStorage.setItem(EXECUTIONS_KEY, JSON.stringify(updated));
      setExecutions(updated);
    } catch (error) {
      console.error('[WorkflowContext] Failed to save executions:', error);
    }
  }, []);

  const createWorkflow = useCallback(
    async (name: string, description: string = '') => {
      const newWorkflow: Workflow = {
        id: `workflow-${Date.now()}`,
        name,
        description,
        nodes: [],
        connections: [],
        status: 'draft',
        runCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedWorkflows = [...workflows, newWorkflow];
      await saveWorkflows(updatedWorkflows);
      setCurrentWorkflow(newWorkflow);
      console.log(`[WorkflowContext] Created workflow: ${name}`);
      return newWorkflow;
    },
    [workflows, saveWorkflows]
  );

  const updateWorkflow = useCallback(
    async (workflowId: string, updates: Partial<Workflow>) => {
      const updatedWorkflows = workflows.map((w) =>
        w.id === workflowId ? { ...w, ...updates, updatedAt: new Date() } : w
      );
      await saveWorkflows(updatedWorkflows);

      if (currentWorkflow?.id === workflowId) {
        setCurrentWorkflow(updatedWorkflows.find((w) => w.id === workflowId) || null);
      }
      console.log(`[WorkflowContext] Updated workflow: ${workflowId}`);
    },
    [workflows, currentWorkflow, saveWorkflows]
  );

  const deleteWorkflow = useCallback(
    async (workflowId: string) => {
      const updatedWorkflows = workflows.filter((w) => w.id !== workflowId);
      await saveWorkflows(updatedWorkflows);

      if (currentWorkflow?.id === workflowId) {
        setCurrentWorkflow(updatedWorkflows[0] || null);
      }
      console.log(`[WorkflowContext] Deleted workflow: ${workflowId}`);
    },
    [workflows, currentWorkflow, saveWorkflows]
  );

  const addNode = useCallback(
    async (workflowId: string, node: WorkflowNode) => {
      const workflow = workflows.find((w) => w.id === workflowId);
      if (!workflow) return;

      const updatedNodes = [...workflow.nodes, node];
      await updateWorkflow(workflowId, { nodes: updatedNodes });
      console.log(`[WorkflowContext] Added node ${node.id} to workflow ${workflowId}`);
    },
    [workflows, updateWorkflow]
  );

  const updateNode = useCallback(
    async (workflowId: string, nodeId: string, updates: Partial<WorkflowNode>) => {
      const workflow = workflows.find((w) => w.id === workflowId);
      if (!workflow) return;

      const updatedNodes = workflow.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n));
      await updateWorkflow(workflowId, { nodes: updatedNodes });
      console.log(`[WorkflowContext] Updated node ${nodeId} in workflow ${workflowId}`);
    },
    [workflows, updateWorkflow]
  );

  const deleteNode = useCallback(
    async (workflowId: string, nodeId: string) => {
      const workflow = workflows.find((w) => w.id === workflowId);
      if (!workflow) return;

      const updatedNodes = workflow.nodes.filter((n) => n.id !== nodeId);
      const updatedConnections = workflow.connections.filter(
        (c) => c.source !== nodeId && c.target !== nodeId
      );

      await updateWorkflow(workflowId, {
        nodes: updatedNodes,
        connections: updatedConnections,
      });
      console.log(`[WorkflowContext] Deleted node ${nodeId} from workflow ${workflowId}`);
    },
    [workflows, updateWorkflow]
  );

  const addConnection = useCallback(
    async (workflowId: string, connection: WorkflowConnection) => {
      const workflow = workflows.find((w) => w.id === workflowId);
      if (!workflow) return;

      const updatedConnections = [...workflow.connections, connection];
      await updateWorkflow(workflowId, { connections: updatedConnections });
      console.log(
        `[WorkflowContext] Added connection ${connection.id} from ${connection.source} to ${connection.target}`
      );
    },
    [workflows, updateWorkflow]
  );

  const deleteConnection = useCallback(
    async (workflowId: string, connectionId: string) => {
      const workflow = workflows.find((w) => w.id === workflowId);
      if (!workflow) return;

      const updatedConnections = workflow.connections.filter((c) => c.id !== connectionId);
      await updateWorkflow(workflowId, { connections: updatedConnections });
      console.log(`[WorkflowContext] Deleted connection ${connectionId}`);
    },
    [workflows, updateWorkflow]
  );

  const executeWorkflow = useCallback(
    async (workflowId: string, inputData: Record<string, any> = {}) => {
      const workflow = workflows.find((w) => w.id === workflowId);
      if (!workflow) {
        console.error(`[WorkflowContext] Workflow not found: ${workflowId}`);
        return null;
      }

      setIsExecuting(true);
      console.log(`[WorkflowContext] Starting execution of workflow: ${workflow.name}`);

      const execution: WorkflowExecution = {
        id: `exec-${Date.now()}`,
        workflowId,
        status: 'running',
        startTime: new Date(),
        logs: [],
        results: {},
      };

      const nextExecutions = [...executions, execution];
      await saveExecutions(nextExecutions);

      try {
        const logs: WorkflowLog[] = [];
        const results: Record<string, any> = { ...inputData };

        const sortedNodes = topologicalSort(workflow.nodes, workflow.connections);

        for (const node of sortedNodes) {
          logs.push(logLine(node.id, 'info', `Executing node: ${node.label}`));

          try {
            const nodeResult = await executeNodeReal(node, results);
            results[node.id] = nodeResult;

            logs.push(logLine(node.id, 'success', `Node completed successfully`, nodeResult));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logs.push(logLine(node.id, 'error', `Node execution failed: ${message}`));
            throw error;
          }
        }

        const completed: WorkflowExecution = {
          ...execution,
          status: 'completed',
          endTime: new Date(),
          logs,
          results,
        };

        const updatedExecs = executions.map((e) => (e.id === execution.id ? completed : e));
        await saveExecutions(updatedExecs);

        await updateWorkflow(workflowId, {
          status: 'active',
          lastRun: new Date(),
          runCount: workflow.runCount + 1,
        });

        console.log(`[WorkflowContext] Workflow execution completed: ${workflow.name}`);
        return completed;
      } catch (error) {
        const failed: WorkflowExecution = {
          ...execution,
          status: 'failed',
          endTime: new Date(),
        };

        const updatedExecs = executions.map((e) => (e.id === execution.id ? failed : e));
        await saveExecutions(updatedExecs);

        await updateWorkflow(workflowId, { status: 'error' });

        console.error(`[WorkflowContext] Workflow execution failed:`, error);
        return failed;
      } finally {
        setIsExecuting(false);
      }
    },
    [workflows, executions, updateWorkflow, saveExecutions]
  );

  return useMemo(
    () => ({
      workflows,
      currentWorkflow,
      executions,
      isExecuting,
      loadWorkflows,
      createWorkflow,
      updateWorkflow,
      deleteWorkflow,
      setCurrentWorkflow,
      addNode,
      updateNode,
      deleteNode,
      addConnection,
      deleteConnection,
      executeWorkflow,
    }),
    [
      workflows,
      currentWorkflow,
      executions,
      isExecuting,
      loadWorkflows,
      createWorkflow,
      updateWorkflow,
      deleteWorkflow,
      addNode,
      updateNode,
      deleteNode,
      addConnection,
      deleteConnection,
      executeWorkflow,
    ]
  );
});

/** ───────────────────────── Helpers ───────────────────────── */

function logLine(
  nodeId: string,
  level: WorkflowLog['level'],
  message: string,
  data?: any
): WorkflowLog {
  return {
    id: `log-${Date.now()}-${nodeId}-${level}`,
    nodeId,
    timestamp: new Date(),
    level,
    message,
    data,
  };
}

function topologicalSort(nodes: WorkflowNode[], connections: WorkflowConnection[]): WorkflowNode[] {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((node) => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  connections.forEach((conn) => {
    graph.get(conn.source)?.push(conn.target);
    inDegree.set(conn.target, (inDegree.get(conn.target) || 0) + 1);
  });

  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });

  const sorted: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);

    graph.get(nodeId)?.forEach((neighbor) => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    });
  }

  return sorted.map((id) => nodes.find((n) => n.id === id)!).filter(Boolean);
}

/** ───────────────────────── Node Executors (real) ───────────────────────── */

async function executeNodeReal(node: WorkflowNode, context: Record<string, any>): Promise<any> {
  switch (node.type) {
    case 'trigger': {
      // Manual or event/webhook trigger. Pass through input/context.
      return {
        triggered: true,
        timestamp: new Date().toISOString(),
        data: { ...context, ...(node.data?.payload ?? {}) },
      };
    }

    case 'ai-agent': {
      const { generateText } = await import('@rork/toolkit-sdk');
      const prompt: string = node.data.prompt ?? '';
      if (!prompt) throw new Error('AI agent requires a prompt');

      // Optional: model selection via node.data.model
      const result = await generateText({
        messages: [{ role: 'user', content: prompt }],
        ...(node.data.model ? { model: node.data.model } : {}),
      });

      return { generated: result, model: node.data.model ?? 'auto' };
    }

    case 'code': {
      // Real execution: allow only when explicitly enabled to avoid RCE foot-guns.
      // Provide a minimal, deterministic sandbox of helpers via scoped arguments.
      const code = String(node.data.code || '');
      const allow = Boolean(node.data.allowExecution === true);
      if (!allow) throw new Error('Code node blocked (allowExecution=false).');

      // WARNING: This uses Function — do NOT feed untrusted code.
      // Intended for trusted admins/owners only.
      const fn = new Function('ctx', code);
      return fn(context);
    }

    case 'condition': {
      const expr = String(node.data.condition ?? 'true');
      const fn = new Function('ctx', `return (${expr});`);
      const passed = !!fn(context);
      return { condition: expr, passed };
    }

    case 'transform': {
      // JS expression that returns a value; evaluated with ctx.
      const expr = String(node.data.transform ?? 'ctx');
      const fn = new Function('ctx', `return (${expr});`);
      return fn(context);
    }

    case 'api': {
      const url: string = node.data.url;
      if (!url) throw new Error('API node requires a URL');

      const method: string = (node.data.method || 'GET').toUpperCase();
      const headers: Record<string, string> = node.data.headers || {};
      const bodyData = node.data.body;

      const controller = new AbortController();
      const timeoutMs: number = Number(node.data.timeoutMs ?? 30000);
      const t = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, {
          method,
          headers,
          body: method === 'GET' || method === 'HEAD' ? undefined : serializeBody(headers, bodyData),
          signal: controller.signal,
        });

        const contentType = res.headers.get('content-type') || '';
        const isJSON = contentType.includes('application/json');
        const payload = isJSON ? await res.json() : await res.text();

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        return {
          ok: true,
          status: res.status,
          headers: Object.fromEntries(res.headers as any),
          data: payload,
        };
      } finally {
        clearTimeout(t);
      }
    }

    case 'database': {
      // Execute via your real tRPC backend. Node data can supply connection or use server-managed pool.
      const { trpcClient } = await import('@/lib/trpc');

      const query: string = node.data.query;
      if (!query) throw new Error('Database node requires a SQL query');

      // Optional: parameterized values & optional explicit connection
      const params: any[] = Array.isArray(node.data.params) ? node.data.params : [];
      const connection = node.data.connection || undefined; // if your backend supports client-supplied conn

      const result = await trpcClient.database.execute.mutate({
        connection,
        query,
        params,
      });

      return result; // should be your real { rows, fields, rowCount, command }
    }

    case 'weather': {
      // Uses your real weather lib; expects apiKey via node.data.apiKey or context.weatherApiKey
      const { fetchWeatherByCoordinates, fetchWeatherByCity } = await import('@/lib/weather');
      const apiKey = node.data.apiKey || context.weatherApiKey;
      if (!apiKey) throw new Error('Weather API key not configured');

      if (node.data.lat != null && node.data.lon != null) {
        const weather = await fetchWeatherByCoordinates(
          Number(node.data.lat),
          Number(node.data.lon),
          apiKey,
          node.data.units || 'metric'
        );
        return { weather, source: 'coordinates' };
      }
      if (node.data.city) {
        const weather = await fetchWeatherByCity(node.data.city, apiKey, node.data.units || 'metric');
        return { weather, source: 'city' };
      }
      throw new Error('Weather node requires lat/lon or city');
    }

    case 'action': {
      // Side-effect record; return a structured acknowledgement
      return {
        action: node.data.action ?? 'noop',
        executed: true,
        at: new Date().toISOString(),
        payload: node.data.payload ?? null,
      };
    }

    default:
      throw new Error(`Unsupported node type: ${node.type}`);
  }
}

/** ───────────────────────── Internal utils ───────────────────────── */

function serializeBody(headers: Record<string, string>, body: any) {
  const h = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  if (h['content-type']?.includes('application/json')) {
    return typeof body === 'string' ? body : JSON.stringify(body ?? {});
  }
  if (h['content-type']?.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(body || {});
    return params.toString();
  }
  // Default: let fetch handle (e.g., FormData/Blob/ArrayBuffer or raw string)
  return body ?? null;
}
