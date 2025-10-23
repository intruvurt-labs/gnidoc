import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['trigger','action','condition','ai-agent','code','api','database','transform','weather']),
  label: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.any()).optional().default({}),
  config: z.object({
    icon: z.string().optional(),
    color: z.string().optional(),
    inputs: z.array(z.string()).optional(),
    outputs: z.array(z.string()).optional(),
  }).default({}),
});

const WorkflowConnectionSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().default(''),
  nodes: z.array(WorkflowNodeSchema),
  connections: z.array(WorkflowConnectionSchema),
  status: z.enum(['draft','active','paused','error']),
  lastRun: z.coerce.date().optional(),
  runCount: z.number().int().nonnegative().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const WorkflowExecutionSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: z.enum(['running','completed','failed']),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  logs: z.array(z.object({
    id: z.string(),
    nodeId: z.string(),
    timestamp: z.coerce.date(),
    level: z.enum(['info','warning','error','success']),
    message: z.string(),
    data: z.any().optional(),
  })),
  results: z.record(z.string(), z.any()),
});

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowConnection = z.infer<typeof WorkflowConnectionSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;

export interface ExecuteOptions {
  signal?: AbortSignal;
  maxConcurrency?: number;
}

interface WorkflowLog {
  id: string;
  nodeId: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  data?: any;
}

const SCHEMA_VERSION = 1;
const STORAGE_KEY = `gnidoc-workflows:v${SCHEMA_VERSION}`;
const EXECUTIONS_KEY = `gnidoc-workflow-executions:v${SCHEMA_VERSION}`;
const MAX_EXECS = 100;
const MAX_CODE_LENGTH = 8_192;
const SAVE_DEBOUNCE_MS = 400;

function makeDebounce<T extends (...args: any[]) => any>(fn: T, ms = 300) {
  let t: any = null;
  let lastArgs: Parameters<T> | null = null;
  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    clearTimeout(t);
    t = setTimeout(() => {
      const a = lastArgs as Parameters<T>;
      lastArgs = null;
      fn(...a);
    }, ms);
  };
  debounced.cancel = () => { clearTimeout(t); t = null; lastArgs = null; };
  debounced.flush = () => { if (t && lastArgs) { clearTimeout(t); const a = lastArgs as Parameters<T>; lastArgs = null; fn(...a); } };
  return debounced as T & { cancel: () => void; flush: () => void };
}

function reviveDates(key: string, value: any) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return value;
}

function safeParseJSON<T>(raw: string | null, schema: z.ZodType<T>, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw, reviveDates);
    const res = schema.safeParse(parsed);
    return res.success ? res.data : fallback;
  } catch {
    return fallback;
  }
}

interface WorkflowContextType {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  executions: WorkflowExecution[];
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  createWorkflow: (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  executeWorkflow: (id: string, opts?: ExecuteOptions) => Promise<void>;
  loadWorkflows: () => Promise<void>;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);

  const workflowsRef = useRef<Workflow[]>([]);
  const executionsRef = useRef<WorkflowExecution[]>([]);
  useEffect(() => { workflowsRef.current = workflows; }, [workflows]);
  useEffect(() => { executionsRef.current = executions; }, [executions]);

  const loadWorkflows = useCallback(async () => {
    try {
      const [wfRaw, exRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(EXECUTIONS_KEY),
      ]);

      if (wfRaw && wfRaw.length < 2_000_000) {
        const arr = safeParseJSON<any[]>(
          wfRaw,
          z.array(WorkflowSchema),
          []
        );
        const parsedWorkflows = arr.map(w => WorkflowSchema.parse(w));
        setWorkflows(parsedWorkflows);
        setCurrentWorkflow((prev) => {
          if (!prev) return parsedWorkflows[0] ?? null;
          const found = parsedWorkflows.find((w: Workflow) => w.id === prev.id);
          return found ?? parsedWorkflows[0] ?? null;
        });
        console.log(`[WorkflowContext] Loaded ${parsedWorkflows.length} workflows`);
      }

      if (exRaw && exRaw.length < 2_000_000) {
        const arr = safeParseJSON<any[]>(
          exRaw,
          z.array(WorkflowExecutionSchema),
          []
        );
        setExecutions(arr);
      }
    } catch (error) {
      console.error('[WorkflowContext] Failed to load data:', error);
    }
  }, []);

  const persistWorkflows = useMemo(() => makeDebounce(async () => {
    try {
      const validated = z.array(WorkflowSchema).parse(workflowsRef.current);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
      console.log(`[WorkflowContext] Persisted ${validated.length} workflows`);
    } catch (error) {
      console.error('[WorkflowContext] Persist workflows failed:', error);
    }
  }, SAVE_DEBOUNCE_MS), []);

  const persistExecutions = useMemo(() => makeDebounce(async () => {
    try {
      const pruned = executionsRef.current
        .sort((a,b) => +b.startTime - +a.startTime)
        .slice(0, MAX_EXECS);
      const validated = z.array(WorkflowExecutionSchema).parse(pruned);
      await AsyncStorage.setItem(EXECUTIONS_KEY, JSON.stringify(validated));
      console.log(`[WorkflowContext] Persisted ${pruned.length} executions`);
    } catch (error) {
      console.error('[WorkflowContext] Persist executions failed:', error);
    }
  }, SAVE_DEBOUNCE_MS), []);

  useEffect(() => { persistWorkflows(); }, [workflows, persistWorkflows]);
  useEffect(() => { persistExecutions(); }, [executions, persistExecutions]);

  useEffect(() => () => {
    persistWorkflows.flush?.();
    persistExecutions.flush?.();
    persistWorkflows.cancel?.();
    persistExecutions.cancel?.();
  }, [persistWorkflows, persistExecutions]);

  const createWorkflow = useCallback(async (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newWorkflow: Workflow = {
      ...workflow,
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const validated = WorkflowSchema.parse(newWorkflow);
    setWorkflows(prev => [...prev, validated]);
    setCurrentWorkflow(validated);
    console.log(`[WorkflowContext] Created workflow: ${validated.name}`);
  }, []);

  const updateWorkflow = useCallback(async (id: string, updates: Partial<Workflow>) => {
    setWorkflows(prev => {
      const updated = prev.map(w => {
        if (w.id !== id) return w;
        const next = { ...w, ...updates, updatedAt: new Date() };
        const ids = new Set(next.nodes.map(n => n.id));
        if (ids.size !== next.nodes.length) {
          console.error('[WorkflowContext] Duplicate node IDs detected');
          return w;
        }
        for (const c of next.connections) {
          if (!ids.has(c.source) || !ids.has(c.target)) {
            console.error(`[WorkflowContext] Invalid connection ${c.id}`);
            return w;
          }
        }
        return WorkflowSchema.parse(next);
      });
      return updated;
    });
    if (currentWorkflow?.id === id) {
      setCurrentWorkflow(prev => {
        if (!prev || prev.id !== id) return prev;
        const found = workflowsRef.current.find(w => w.id === id);
        return found ?? prev;
      });
    }
    console.log(`[WorkflowContext] Updated workflow: ${id}`);
  }, [currentWorkflow]);

  const deleteWorkflow = useCallback(async (id: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== id));
    if (currentWorkflow?.id === id) {
      setCurrentWorkflow(workflowsRef.current[0] ?? null);
    }
    console.log(`[WorkflowContext] Deleted workflow: ${id}`);
  }, [currentWorkflow]);

  const executeWorkflow = useCallback(async (id: string, opts: ExecuteOptions = {}) => {
    const workflow = workflows.find(w => w.id === id);
    if (!workflow) {
      console.error('[WorkflowContext] Workflow not found:', id);
      return;
    }

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId: id,
      status: 'running',
      startTime: new Date(),
      logs: [],
      results: {},
    };

    const validated = WorkflowExecutionSchema.parse(execution);
    setExecutions(prev => [validated, ...prev]);

    try {
      console.log(`[WorkflowContext] Executing workflow: ${workflow.name}`);
      
      const sortedNodes = topologicalSort(workflow.nodes, workflow.connections);
      const context: Record<string, any> = {};
      const logs: WorkflowLog[] = [];

      for (const node of sortedNodes) {
        if (opts.signal?.aborted) {
          throw new Error('Execution cancelled by user');
        }

        const logEntry: WorkflowLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          nodeId: node.id,
          timestamp: new Date(),
          level: 'info',
          message: `Executing node: ${node.label}`,
        };
        logs.push(logEntry);

        try {
          const result = await executeNodeReal(node, context, { signal: opts.signal });
          context[node.id] = result;
          logs.push({
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            nodeId: node.id,
            timestamp: new Date(),
            level: 'success',
            message: `Node completed: ${node.label}`,
            data: result,
          });
        } catch (nodeError) {
          logs.push({
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            nodeId: node.id,
            timestamp: new Date(),
            level: 'error',
            message: nodeError instanceof Error ? nodeError.message : 'Node execution failed',
          });
          throw nodeError;
        }
      }

      const completedExecution: WorkflowExecution = {
        ...validated,
        status: 'completed',
        endTime: new Date(),
        logs,
        results: context,
      };

      const completedValidated = WorkflowExecutionSchema.parse(completedExecution);
      setExecutions(prev => [completedValidated, ...prev.filter(e => e.id !== validated.id)]);

      await updateWorkflow(id, {
        lastRun: new Date(),
        runCount: workflow.runCount + 1,
      });
    } catch (error) {
      console.error('[WorkflowContext] Execution failed:', error);
      const failedExecution: WorkflowExecution = {
        ...validated,
        status: 'failed',
        endTime: new Date(),
        logs: [
          ...validated.logs,
          {
            id: `log_${Date.now()}`,
            nodeId: workflow.nodes[0]?.id ?? 'unknown',
            timestamp: new Date(),
            level: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          }
        ],
      };
      const failedValidated = WorkflowExecutionSchema.parse(failedExecution);
      setExecutions(prev => [failedValidated, ...prev.filter(e => e.id !== validated.id)]);
    }
  }, [workflows, updateWorkflow]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const value = useMemo(
    () => ({
      workflows,
      currentWorkflow,
      executions,
      setCurrentWorkflow,
      createWorkflow,
      updateWorkflow,
      deleteWorkflow,
      executeWorkflow,
      loadWorkflows,
    }),
    [workflows, currentWorkflow, executions, createWorkflow, updateWorkflow, deleteWorkflow, executeWorkflow, loadWorkflows]
  );

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

function guardSource(src: string, label: string) {
  if (src.length > MAX_CODE_LENGTH) throw new Error(`${label} too large`);
}

function topologicalSort(nodes: WorkflowNode[], connections: WorkflowConnection[]): WorkflowNode[] {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const nodeIds = new Set(nodes.map(n => n.id));

  for (const c of connections) {
    if (!nodeIds.has(c.source) || !nodeIds.has(c.target)) {
      throw new Error(`Invalid connection "${c.id}": ${c.source} -> ${c.target} references missing node(s).`);
    }
  }

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

  if (sorted.length !== nodes.length) {
    const remaining = [...nodeIds].filter(id => !sorted.includes(id));
    throw new Error(`Workflow contains a cycle or unreachable nodes. Offending node(s): ${remaining.join(', ')}`);
  }
  return sorted.map((id) => nodes.find((n) => n.id === id)!).filter(Boolean);
}

async function executeNodeReal(
  node: WorkflowNode,
  context: Record<string, any>,
  opts: { signal?: AbortSignal } = {}
): Promise<any> {
  switch (node.type) {
    case 'trigger':
      return { triggered: true, timestamp: new Date() };

    case 'action':
      return { action: node.data?.action || 'default', executed: true };

    case 'code': {
      const code = String(node.data?.code || '');
      const allow = Boolean(node.data?.allowExecution === true);
      if (!allow) throw new Error('Code node blocked (allowExecution=false).');
      guardSource(code, 'Code');
      if (opts.signal?.aborted) throw new Error('Execution cancelled');

      const fn = new Function('ctx', 'signal', code);
      const res = await Promise.resolve(fn(context, opts.signal));
      return res;
    }

    case 'condition': {
      const expr = String(node.data?.condition ?? 'true');
      guardSource(expr, 'Condition');
      const fn = new Function('ctx', `return !!(${expr});`);
      const passed = !!fn(context);
      return { condition: expr, passed };
    }

    case 'transform': {
      const expr = String(node.data?.transform ?? 'ctx');
      guardSource(expr, 'Transform');
      const fn = new Function('ctx', `return (${expr});`);
      return fn(context);
    }

    case 'api': {
      const url = String(node.data?.url || '');
      if (!url) throw new Error('API node requires a URL');
      const method = String(node.data?.method || 'GET').toUpperCase();
      const headers: Record<string, string> = (node.data?.headers as Record<string, string>) || {};
      const bodyData = node.data?.body;
      const timeout = Number(node.data?.timeout) || 30000;

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetch(url, {
          method,
          headers,
          body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(bodyData),
          signal: controller.signal,
        });
        const data = await res.json();
        return { status: res.status, data };
      } finally {
        clearTimeout(t);
        if (opts.signal?.aborted) throw new Error('Execution cancelled');
      }
    }

    case 'database':
      return { query: node.data?.query || 'SELECT 1', result: [] };

    case 'ai-agent':
      return { agent: node.data?.agent || 'default', response: 'AI response' };

    case 'weather':
      return { weather: 'sunny', temp: 72 };

    default:
      throw new Error(`Unknown node type: ${(node as any).type}`);
  }
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within WorkflowProvider');
  }
  return context;
}

export const getWorkflowById = (wfs: Workflow[], id: string) => wfs.find(w => w.id === id) ?? null;
export const getExecutionsFor = (execs: WorkflowExecution[], id: string) =>
  execs.filter(e => e.workflowId === id).sort((a,b)=> +b.startTime - +a.startTime);
