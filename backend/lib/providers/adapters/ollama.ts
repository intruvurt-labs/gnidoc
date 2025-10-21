import type { ModelResult } from '../types';

export async function runOllama(
  model: string,
  prompt: string,
  _system?: string,
  temperature = 0.7,
  _maxTokens = 4096
): Promise<ModelResult> {
  const started = Date.now();

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const json = await response.json();
    const output = json.response ?? '';
    const tokensUsed = Math.ceil((prompt.length + output.length) / 4);

    return {
      model,
      output,
      score: output.length > 20 ? 0.6 : 0.3,
      responseTime: Date.now() - started,
      tokensUsed,
    };
  } catch (error: any) {
    return {
      model,
      output: '',
      score: 0,
      responseTime: Date.now() - started,
      tokensUsed: 0,
      error: error?.message || 'Ollama request failed (is server running?)',
    };
  }
}
