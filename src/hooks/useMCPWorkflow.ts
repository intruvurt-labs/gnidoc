import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMCP } from '@/contexts/MCPContext';

export type MCPNodeStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface MCPNode {
  id: string;
  type: string;
  status: MCPNodeStatus;
}

export function useMCPWorkflow(workflowId: string) {
  const { servers, connect } = useMCP();
  const [nodes, setNodes] = useState<MCPNode[]>([]);
  const initializedRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      const baseNodes: MCPNode[] = servers.map((s) => ({ id: s.id, type: s.name, status: 'idle' }));
      if (!initializedRef.current) {
        setNodes(baseNodes);
        initializedRef.current = true;
      } else {
        setNodes((prev) => {
          const map = new Map<string, MCPNode>();
          baseNodes.forEach((n) => map.set(n.id, n));
          prev.forEach((n) => {
            if (!map.has(n.id)) map.set(n.id, n);
          });
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.log('[useMCPWorkflow] Failed to sync servers to nodes', e);
    }
  }, [servers]);

  const addNode = useCallback(async (serverType: string) => {
    const tempId = `temp-${Date.now()}`;
    setNodes((prev) => [...prev, { id: tempId, type: serverType, status: 'connecting' }]);

    try {
      const target = servers.find((s) => s.id === serverType || s.name === serverType);

      if (!target) {
        setNodes((prev) => prev.map((n) => (n.id === tempId ? { ...n, status: 'error' } : n)));
        return { ok: false as const, error: 'Server not found' };
      }

      connect(target.id);

      const resolved: MCPNode = { id: target.id, type: target.name, status: 'connected' };
      setNodes((prev) => prev.map((n) => (n.id === tempId ? resolved : n)));
      return { ok: true as const, node: resolved };
    } catch (error) {
      console.error('[useMCPWorkflow] addNode error', error);
      setNodes((prev) => prev.map((n) => (n.id === tempId ? { ...n, status: 'error' } : n)));
      return { ok: false as const, error: 'Failed to add node' };
    }
  }, [servers, connect]);

  const value = useMemo(() => ({ nodes, addNode }), [nodes, addNode]);
  return value;
}
