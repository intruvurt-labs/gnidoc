import { useCallback } from 'react';
import { executeMCPCommand } from '@/lib/mcp/commands';

interface SendCommandInput {
  [key: string]: unknown;
}

interface SendCommandResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function useMCPCommand(serverName: string) {
  const sendCommand = useCallback(
    async <T = unknown>(command: string, input: SendCommandInput): Promise<SendCommandResult<T>> => {
      try {
        const res = await executeMCPCommand<T>(serverName, command, input);
        if (res.ok) return { ok: true, data: res.data };
        return { ok: false, error: res.error };
      } catch (err: any) {
        console.error('[useMCPCommand] Failed to execute command:', err);
        return { ok: false, error: err?.message ?? 'Unknown error' };
      }
    },
    [serverName]
  );

  return { sendCommand };
}
