import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useMCPCommand } from './useMCP';

interface VoiceCodingResult {
  code: string;
  language?: string;
  reasoning?: string;
}

async function insertCodeAtCursor(code: string): Promise<void> {
  try {
    // Simple bridge via CustomEvent so any editor can listen and act
    // Consumers should add: document.addEventListener('editor-insert', (e) => ...)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const event = new CustomEvent('editor-insert', { detail: { code } });
      window.dispatchEvent(event);
      console.log('[useVoiceCoding] Dispatched editor-insert event');
      return;
    }

    // Native: fallback to a global callable if provided by editor screen
    const g = global as unknown as { __editorInsert__?: (snippet: string) => void };
    if (typeof g.__editorInsert__ === 'function') {
      g.__editorInsert__(code);
      console.log('[useVoiceCoding] Inserted code via global bridge');
      return;
    }

    console.warn('[useVoiceCoding] No editor bridge found. Code not inserted.');
  } catch (e) {
    console.error('[useVoiceCoding] Failed to insert code:', e);
    throw new Error('Failed to insert code');
  }
}

export function useVoiceCoding() {
  const { sendCommand } = useMCPCommand('ai-code-mcp');

  const handleVoiceCommand = useCallback(async (transcript: string): Promise<VoiceCodingResult> => {
    const response = await sendCommand<VoiceCodingResult>('generateCode', {
      description: transcript,
      language: 'typescript',
      context: 'current file',
    });

    if (!response.ok || !response.data) {
      const message = response.error ?? 'AI failed to generate code';
      console.error('[useVoiceCoding] MCP error:', message);
      throw new Error(message);
    }

    await insertCodeAtCursor(response.data.code);
    return response.data;
  }, [sendCommand]);

  return { handleVoiceCommand };
}
