import type { ModelResult } from '../types';

export async function runXAI(
  model: string,
  prompt: string,
  system?: string,
  temperature = 0.7,
  maxTokens = 4096
): Promise<ModelResult> {
  if (!process.env.XAI_API_KEY) throw new Error('xAI API key not configured');

  const started = Date.now();

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`xAI API error: ${response.status}`);
    }

    const json = await response.json();
    const output = json.choices?.[0]?.message?.content ?? '';
    const tokensUsed = json.usage?.total_tokens ?? Math.ceil(output.length / 4);

    return {
      model,
      output,
      score: output.length > 20 ? 0.7 : 0.3,
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
      error: error?.message || 'xAI request failed',
    };
  }
}
