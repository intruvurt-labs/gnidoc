import { useState, useCallback } from 'react';
import { restClient } from '../api/client';
import type { RevisionResponse } from '../api/client';

export function useRevisions(entityType: string, entityId: string) {
  const [revisions, setRevisions] = useState<RevisionResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await restClient.getRevisions(entityType, entityId);
      setRevisions(data);
    } catch (error) {
      console.error('[useRevisions] Load error:', error);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  const rollback = useCallback(async (toVersion: number) => {
    setLoading(true);
    try {
      await restClient.rollbackRevision(entityType, entityId, toVersion);
      await load();
    } catch (error) {
      console.error('[useRevisions] Rollback error:', error);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, load]);

  return {
    revisions,
    loading,
    load,
    rollback,
  };
}
