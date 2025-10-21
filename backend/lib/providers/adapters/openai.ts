import OpenAI from 'openai';
import type { ModelResult } from '../types';

let client: OpenAI | null = null;

function getClient() {
  if (!client && process.env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function runOpenAI(
  model: string,
  prompt: string,
  system?: string,
  temperature = 0.7,
  maxTokens = 4096
): Promise<ModelResult> {
  const c = getClient();
  if (!c) throw new Error('OpenAI API key not configured');

  const started = Date.now();
  if (model === 'gpt5') model = 'gpt-4o';

  try {
    const response = await c.chat.completions.create({
      model,
      messages: [
        ...(system ? [{ role: 'system' as const, content: system }] : []),
        { role: 'user' as const, content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const output = response.choices[0]?.message?.content ?? '';
    const tokensUsed = response.usage?.total_tokens ?? Math.ceil(output.length / 4);

    return {
      model,
      output,
      score: output.length > 20 ? 0.8 : 0.3,
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
      error: error?.message || 'OpenAI request failed',
    };
  }
}
