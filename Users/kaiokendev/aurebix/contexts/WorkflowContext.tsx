import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['trigger','action','condition','ai-agent','code','api','database','transform','weather']),
  label: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.any()).default({}),
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
  results: z.record(z.any()),
});

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowConnection = z.infer<typeof WorkflowConnectionSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;

const SCHEMA_VERSION = 1;
const STORAGE_KEY = `gnidoc-workflows:v${SCHEMA_VERSION}`;
const EXECUTIONS_KEY = `gnidoc-workflow-executions:v${SCHEMA_VERSION}`;
const MAX_EXECS = 100;

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
  executeWorkflow: (id: string) => Promise<void>;
  loadWorkflows: () => Promise<void>;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);

  const loadWorkflows = useCallback(async () => {
    try {
      const [wfRaw, exRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(EXECUTIONS_KEY),
      ]);

      if (wfRaw) {
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

      if (exRaw) {
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

  const saveWorkflows = useCallback(async (updated: Workflow[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setWorkflows(updated);
      console.log(`[WorkflowContext] Saved ${updated.length} workflows`);
    } catch (error) {
      console.error('[WorkflowContext] Failed to save workflows:', error);
    }
  }, []);

  const saveExecutions = useCallback(async (updated: WorkflowExecution[]) => {
    try {
      const pruned = updated
        .sort((a,b) => +b.startTime - +a.startTime)
        .slice(0, MAX_EXECS);
      await AsyncStorage.setItem(EXECUTIONS_KEY, JSON.stringify(pruned));
      setExecutions(pruned);
    } catch (error) {
      console.error('[WorkflowContext] Failed to save executions:', error);
    }
  }, []);

  const createWorkflow = useCallback(async (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newWorkflow: Workflow = {
      ...workflow,
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const validated = WorkflowSchema.parse(newWorkflow);
    await saveWorkflows([...workflows, validated]);
    setCurrentWorkflow(validated);
  }, [workflows, saveWorkflows]);

  const updateWorkflow = useCallback(async (id: string, updates: Partial<Workflow>) => {
    const updated = workflows.map(w => 
      w.id === id 
        ? WorkflowSchema.parse({ ...w, ...updates, updatedAt: new Date() })
        : w
    );
    await saveWorkflows(updated);
    if (currentWorkflow?.id === id) {
      const updatedCurrent = updated.find(w => w.id === id);
      setCurrentWorkflow(updatedCurrent ?? null);
    }
  }, [workflows, currentWorkflow, saveWorkflows]);

  const deleteWorkflow = useCallback(async (id: string) => {
    const updated = workflows.filter(w => w.id !== id);
    await saveWorkflows(updated);
    if (currentWorkflow?.id === id) {
      setCurrentWorkflow(updated[0] ?? null);
    }
  }, [workflows, currentWorkflow, saveWorkflows]);

  const executeWorkflow = useCallback(async (id: string) => {
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
    await saveExecutions([validated, ...executions]);

    try {
      console.log(`[WorkflowContext] Executing workflow: ${workflow.name}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      const completedExecution: WorkflowExecution = {
        ...validated,
        status: 'completed',
        endTime: new Date(),
        logs: [
          {
            id: `log_${Date.now()}`,
            nodeId: workflow.nodes[0]?.id ?? 'unknown',
            timestamp: new Date(),
            level: 'success',
            message: 'Workflow completed successfully',
          }
        ],
        results: { success: true },
      };

      const completedValidated = WorkflowExecutionSchema.parse(completedExecution);
      await saveExecutions([completedValidated, ...executions.filter(e => e.id !== validated.id)]);

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
      await saveExecutions([failedValidated, ...executions.filter(e => e.id !== validated.id)]);
    }
  }, [workflows, executions, saveExecutions, updateWorkflow]);

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

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within WorkflowProvider');
  }
  return context;
}
