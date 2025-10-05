import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'ai-agent' | 'code' | 'api' | 'database' | 'transform' | 'weather';
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

const STORAGE_KEY = 'gnidoc-workflows';

export const [WorkflowProvider, useWorkflow] = createContextHook(() => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const loadWorkflows = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedWorkflows = JSON.parse(stored).map((w: any) => ({
          ...w,
          createdAt: new Date(w.createdAt),
          updatedAt: new Date(w.updatedAt),
          lastRun: w.lastRun ? new Date(w.lastRun) : undefined,
        }));
        setWorkflows(parsedWorkflows);
        console.log(`[WorkflowContext] Loaded ${parsedWorkflows.length} workflows`);
      } else {
        const sampleWorkflow: Workflow = {
          id: 'sample-workflow-1',
          name: 'Welcome Workflow',
          description: 'Sample workflow to get you started',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              label: 'Manual Trigger',
              position: { x: 100, y: 100 },
              data: { triggerType: 'manual' },
              config: { color: '#00FFFF', inputs: [], outputs: ['output'] },
            },
            {
              id: 'ai-1',
              type: 'ai-agent',
              label: 'AI Code Generator',
              position: { x: 400, y: 100 },
              data: { model: 'gpt-4', prompt: 'Generate code' },
              config: { color: '#FF0040', inputs: ['input'], outputs: ['output'] },
            },
          ],
          connections: [
            { id: 'conn-1', source: 'trigger-1', target: 'ai-1' },
          ],
          status: 'draft',
          runCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setWorkflows([sampleWorkflow]);
        setCurrentWorkflow(sampleWorkflow);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([sampleWorkflow]));
        console.log('[WorkflowContext] Created sample workflow');
      }
    } catch (error) {
      console.error('[WorkflowContext] Failed to load workflows:', error);
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

  const createWorkflow = useCallback(async (name: string, description: string = '') => {
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
  }, [workflows, saveWorkflows]);

  const updateWorkflow = useCallback(async (workflowId: string, updates: Partial<Workflow>) => {
    const updatedWorkflows = workflows.map(w =>
      w.id === workflowId
        ? { ...w, ...updates, updatedAt: new Date() }
        : w
    );
    await saveWorkflows(updatedWorkflows);
    
    if (currentWorkflow?.id === workflowId) {
      setCurrentWorkflow(updatedWorkflows.find(w => w.id === workflowId) || null);
    }
    console.log(`[WorkflowContext] Updated workflow: ${workflowId}`);
  }, [workflows, currentWorkflow, saveWorkflows]);

  const deleteWorkflow = useCallback(async (workflowId: string) => {
    const updatedWorkflows = workflows.filter(w => w.id !== workflowId);
    await saveWorkflows(updatedWorkflows);
    
    if (currentWorkflow?.id === workflowId) {
      setCurrentWorkflow(updatedWorkflows[0] || null);
    }
    console.log(`[WorkflowContext] Deleted workflow: ${workflowId}`);
  }, [workflows, currentWorkflow, saveWorkflows]);

  const addNode = useCallback(async (workflowId: string, node: WorkflowNode) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) {
      console.error(`[WorkflowContext] Workflow not found: ${workflowId}`);
      return;
    }

    const updatedNodes = [...workflow.nodes, node];
    await updateWorkflow(workflowId, { nodes: updatedNodes });
    console.log(`[WorkflowContext] Added node ${node.id} to workflow ${workflowId}`);
  }, [workflows, updateWorkflow]);

  const updateNode = useCallback(async (workflowId: string, nodeId: string, updates: Partial<WorkflowNode>) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    const updatedNodes = workflow.nodes.map(n =>
      n.id === nodeId ? { ...n, ...updates } : n
    );
    await updateWorkflow(workflowId, { nodes: updatedNodes });
    console.log(`[WorkflowContext] Updated node ${nodeId} in workflow ${workflowId}`);
  }, [workflows, updateWorkflow]);

  const deleteNode = useCallback(async (workflowId: string, nodeId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    const updatedNodes = workflow.nodes.filter(n => n.id !== nodeId);
    const updatedConnections = workflow.connections.filter(
      c => c.source !== nodeId && c.target !== nodeId
    );
    
    await updateWorkflow(workflowId, { 
      nodes: updatedNodes, 
      connections: updatedConnections 
    });
    console.log(`[WorkflowContext] Deleted node ${nodeId} from workflow ${workflowId}`);
  }, [workflows, updateWorkflow]);

  const addConnection = useCallback(async (workflowId: string, connection: WorkflowConnection) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    const updatedConnections = [...workflow.connections, connection];
    await updateWorkflow(workflowId, { connections: updatedConnections });
    console.log(`[WorkflowContext] Added connection from ${connection.source} to ${connection.target}`);
  }, [workflows, updateWorkflow]);

  const deleteConnection = useCallback(async (workflowId: string, connectionId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    const updatedConnections = workflow.connections.filter(c => c.id !== connectionId);
    await updateWorkflow(workflowId, { connections: updatedConnections });
    console.log(`[WorkflowContext] Deleted connection ${connectionId}`);
  }, [workflows, updateWorkflow]);

  const executeWorkflow = useCallback(async (workflowId: string, inputData: Record<string, any> = {}) => {
    const workflow = workflows.find(w => w.id === workflowId);
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

    setExecutions(prev => [...prev, execution]);

    try {
      const logs: WorkflowLog[] = [];
      const results: Record<string, any> = { ...inputData };

      const sortedNodes = topologicalSort(workflow.nodes, workflow.connections);

      for (const node of sortedNodes) {
        logs.push({
          id: `log-${Date.now()}-${node.id}`,
          nodeId: node.id,
          timestamp: new Date(),
          level: 'info',
          message: `Executing node: ${node.label}`,
        });

        try {
          const nodeResult = await executeNode(node, results);
          results[node.id] = nodeResult;

          logs.push({
            id: `log-${Date.now()}-${node.id}-success`,
            nodeId: node.id,
            timestamp: new Date(),
            level: 'success',
            message: `Node completed successfully`,
            data: nodeResult,
          });
        } catch (error) {
          logs.push({
            id: `log-${Date.now()}-${node.id}-error`,
            nodeId: node.id,
            timestamp: new Date(),
            level: 'error',
            message: `Node execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
          throw error;
        }
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.logs = logs;
      execution.results = results;

      await updateWorkflow(workflowId, {
        status: 'active',
        lastRun: new Date(),
        runCount: workflow.runCount + 1,
      });

      console.log(`[WorkflowContext] Workflow execution completed: ${workflow.name}`);
      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      
      await updateWorkflow(workflowId, { status: 'error' });
      
      console.error(`[WorkflowContext] Workflow execution failed:`, error);
      return execution;
    } finally {
      setIsExecuting(false);
      setExecutions(prev => prev.map(e => e.id === execution.id ? execution : e));
    }
  }, [workflows, updateWorkflow]);

  return useMemo(() => ({
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
  }), [
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
  ]);
});

function topologicalSort(nodes: WorkflowNode[], connections: WorkflowConnection[]): WorkflowNode[] {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach(node => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  connections.forEach(conn => {
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

    graph.get(nodeId)?.forEach(neighbor => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    });
  }

  return sorted.map(id => nodes.find(n => n.id === id)!).filter(Boolean);
}

async function executeNode(node: WorkflowNode, context: Record<string, any>): Promise<any> {
  console.log(`[WorkflowContext] Executing node: ${node.label} (${node.type})`);

  await new Promise(resolve => setTimeout(resolve, 500));

  switch (node.type) {
    case 'trigger':
      return { triggered: true, timestamp: new Date().toISOString(), data: context };

    case 'ai-agent':
      try {
        const { generateText } = await import('@rork/toolkit-sdk');
        const prompt = node.data.prompt || 'Generate code';
        const result = await generateText({ messages: [{ role: 'user', content: prompt }] });
        return { generated: result, model: node.data.model };
      } catch (error) {
        console.error('[WorkflowContext] AI agent execution failed:', error);
        return { error: error instanceof Error ? error.message : 'AI execution failed' };
      }

    case 'code':
      try {
        const code = node.data.code || 'return { success: true };';
        const func = new Function('context', code);
        return func(context);
      } catch (error) {
        console.error('[WorkflowContext] Code execution failed:', error);
        return { error: error instanceof Error ? error.message : 'Code execution failed' };
      }

    case 'condition':
      const condition = node.data.condition || 'true';
      try {
        const func = new Function('context', `return ${condition}`);
        const result = func(context);
        return { condition, result, passed: !!result };
      } catch (error) {
        return { condition, result: false, passed: false, error: error instanceof Error ? error.message : 'Condition evaluation failed' };
      }

    case 'transform':
      const transform = node.data.transform || 'data';
      try {
        const func = new Function('context', `return ${transform}`);
        return func(context);
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Transform failed' };
      }

    case 'api':
      return {
        url: node.data.url,
        method: node.data.method || 'GET',
        status: 200,
        response: { success: true, message: 'API call simulated' },
      };

    case 'database':
      return {
        operation: node.data.operation || 'query',
        table: node.data.table,
        result: { success: true, rows: [] },
      };

    case 'action':
      return {
        action: node.data.action,
        executed: true,
        timestamp: new Date().toISOString(),
      };

    case 'weather':
      try {
        const { fetchWeatherByCoordinates, fetchWeatherByCity } = await import('@/lib/weather');
        const apiKey = node.data.apiKey || context.weatherApiKey;
        
        if (!apiKey) {
          return { error: 'Weather API key not configured' };
        }

        if (node.data.lat && node.data.lon) {
          const weather = await fetchWeatherByCoordinates(
            node.data.lat,
            node.data.lon,
            apiKey,
            node.data.units || 'metric'
          );
          return { weather, source: 'coordinates' };
        } else if (node.data.city) {
          const weather = await fetchWeatherByCity(
            node.data.city,
            apiKey,
            node.data.units || 'metric'
          );
          return { weather, source: 'city' };
        } else {
          return { error: 'No location specified (lat/lon or city required)' };
        }
      } catch (error) {
        console.error('[WorkflowContext] Weather node execution failed:', error);
        return { error: error instanceof Error ? error.message : 'Weather fetch failed' };
      }

    default:
      return { type: node.type, executed: true };
  }
}
