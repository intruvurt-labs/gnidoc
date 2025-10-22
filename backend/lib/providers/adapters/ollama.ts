import { GenInput, GenResult } from '../types';

export async function ollamaAdapter(input: GenInput): Promise<GenResult> {
  const started = Date.now();
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const model = process.env.OLLAMA_MODEL || 'llama3';

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: input.prompt,
        stream: false,
        options: {
          temperature: input.temperature || 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        provider: 'ollama',
        model,
        kind: 'text',
        status: 'error',
        error: `Ollama API error ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    const output = data.response || '';

    return {
      provider: 'ollama',
      model,
      kind: 'text',
      text: output,
      status: 'ok',
      responseTime: Date.now() - started,
      tokensUsed: Math.ceil((input.prompt.length + output.length) / 4),
    };
  } catch (error) {
    return {
      provider: 'ollama',
      model: 'llama3',
      kind: 'text',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
