import type { ModelResult } from '../types';

export async function runOllama(
  model: string,
  prompt: string,
  system?: string,
  temperature = 0.7,
  _maxTokens = 2048
): Promise<ModelResult> {
  const started = Date.now();
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: system ? `${system}\n\n${prompt}` : prompt,
        stream: false,
        options: { temperature },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const json: any = await response.json();
    const output = json.response ?? '';
    const tokensUsed = Math.ceil((prompt.length + output.length) / 4);

    return {
      model,
      output,
      score: output.length > 20 ? 0.5 : 0.2,
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
      error: error?.message || 'Ollama request failed (ensure service is running)',
    };
  }
}
