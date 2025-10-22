import { GenInput, GenResult } from '../types';

export async function claudeAdapter(input: GenInput): Promise<GenResult> {
  const started = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20240620',
      kind: 'text',
      status: 'error',
      error: 'ANTHROPIC_API_KEY not configured',
    };
  }

  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        system: input.system || undefined,
        max_tokens: input.maxTokens || 2000,
        temperature: input.temperature || 0.2,
        messages: [{ role: 'user', content: input.prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        provider: 'anthropic',
        model,
        kind: 'text',
        status: 'error',
        error: `Anthropic API error ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    const output = data.content?.[0]?.type === 'text' 
      ? data.content[0].text 
      : String(data.content?.[0] || '');

    return {
      provider: 'anthropic',
      model,
      kind: 'text',
      text: output,
      status: 'ok',
      responseTime: Date.now() - started,
      tokensUsed: data.usage?.input_tokens && data.usage?.output_tokens
        ? data.usage.input_tokens + data.usage.output_tokens
        : Math.ceil(output.length / 4),
    };
  } catch (error) {
    return {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20240620',
      kind: 'text',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
