import { useCallback } from 'react';
import { z } from 'zod';
import { generateObject } from '@rork/toolkit-sdk';

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
        if (serverName === 'ai-code-mcp' && command === 'generateCode') {
          const schema = z.object({
            code: z.string().describe('Generated code snippet'),
            language: z.string().optional(),
            reasoning: z.string().optional(),
          });

          const description = String((input as any)?.description ?? '');
          const language = String((input as any)?.language ?? 'typescript');
          const context = String((input as any)?.context ?? '');

          const system = `You are a senior engineer generating minimal, type-safe ${language} code for a React Native app using Expo Router and React Native Web compatibility. Return only the code without backticks.`;

          const result = await generateObject({
            messages: [
              { role: 'assistant', content: [{ type: 'text', text: system }] },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Task: ${description}\nLanguage: ${language}\nContext: ${context}`,
                  },
                ],
              },
            ],
            schema,
          });

          return { ok: true, data: result as unknown as T };
        }

        return { ok: false, error: `Unknown command ${command} for ${serverName}` };
      } catch (err: any) {
        console.error('[useMCPCommand] Failed to execute command:', err);
        return { ok: false, error: err?.message ?? 'Unknown error' };
      }
    },
    [serverName]
  );

  return { sendCommand };
}
