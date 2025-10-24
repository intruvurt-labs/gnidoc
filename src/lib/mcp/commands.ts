import { z } from 'zod';
import { generateObject } from '@rork/toolkit-sdk';

export type CommandInput = Record<string, unknown>;
export type CommandResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

export function listSupportedCommands(): Record<string, string[]> {
  return {
    'ai-code-mcp': ['generateCode'],
    'expo-file-system': ['listFiles', 'readFile'],
    'expo-device': ['getGyroscopeSample', 'requestCameraPermission'],
  };
}

export async function executeMCPCommand<T = unknown>(serverName: string, command: string, input: CommandInput): Promise<CommandResult<T>> {
  try {
    if (serverName === 'ai-code-mcp' && command === 'generateCode') {
      const schema = z.object({
        code: z.string(),
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
          { role: 'user', content: [{ type: 'text', text: `Task: ${description}\nLanguage: ${language}\nContext: ${context}` }] },
        ],
        schema,
      });

      return { ok: true, data: result as unknown as T };
    }

    if (serverName === 'expo-file-system') {
      const mod = await import('../../../servers/expo-file-system-mcp');
      const Srv: any = (mod as any).ExpoFileSystemMCPServer ?? (mod as any).default;
      const srv = new Srv();

      if (command === 'listFiles') {
        const path = String((input as any)?.path ?? '/');
        const out = await srv.handleListFiles({ path });
        return { ok: true, data: out as T };
      }

      if (command === 'readFile') {
        const path = String((input as any)?.path ?? '/');
        const out = await srv.handleReadFile({ path });
        return { ok: true, data: out as T };
      }

      return { ok: false, error: `Unknown command ${command} for expo-file-system` };
    }

    if (serverName === 'expo-device') {
      const mod = await import('../../../servers/expo-device-mcp');
      const Srv: any = (mod as any).ExpoDeviceMCPServer ?? (mod as any).default;
      const srv = new Srv();

      if (command === 'getGyroscopeSample') {
        const out = await srv.handleGyroscopeData();
        return { ok: true, data: out as T };
      }

      if (command === 'requestCameraPermission') {
        const out = await srv.handleTakePhoto();
        return { ok: true, data: out as T };
      }

      return { ok: false, error: `Unknown command ${command} for expo-device` };
    }

    return { ok: false, error: `Unknown command ${command} for ${serverName}` };
  } catch (err: any) {
    console.error('[executeMCPCommand] error', err);
    return { ok: false, error: err?.message ?? 'Unknown error' };
  }
}
