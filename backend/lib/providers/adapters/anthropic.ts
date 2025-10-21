import Anthropic from '@anthropic-ai/sdk';
import type { ModelResult } from '../types';

let client: Anthropic | null = null;

function getClient() {
  if (!client && process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function runAnthropic(
  model: string,
  prompt: string,
  system?: string,
  temperature = 0.7,
  maxTokens = 4096
): Promise<ModelResult> {
  const c = getClient();
  if (!c) throw new Error('Anthropic API key not configured');

  const started = Date.now();

  try {
    const response = await c.messages.create({
      model,
      system: system || undefined,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    const output = response.content?.[0]?.type === 'text' ? response.content[0].text : '';
    const tokensUsed = response.usage?.input_tokens && response.usage?.output_tokens
      ? response.usage.input_tokens + response.usage.output_tokens
      : Math.ceil(output.length / 4);

    return {
      model,
      output,
      score: output.length > 20 ? 0.85 : 0.3,
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
      error: error?.message || 'Anthropic request failed',
    };
  }
}
