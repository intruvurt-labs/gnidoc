import { GenInput, GenResult } from '../types';

export async function xaiAdapter(input: GenInput): Promise<GenResult> {
  const started = Date.now();
  const apiKey = process.env.XAI_API_KEY;
  
  if (!apiKey) {
    return {
      provider: 'xai',
      model: 'grok-2',
      kind: 'text',
      status: 'error',
      error: 'XAI_API_KEY not configured',
    };
  }

  try {
    const model = process.env.XAI_MODEL || 'grok-2';

    const messages: any[] = [];
    if (input.system) {
      messages.push({ role: 'system', content: input.system });
    }
    messages.push({ role: 'user', content: input.prompt });

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: input.temperature || 0.2,
        max_tokens: input.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        provider: 'xai',
        model,
        kind: 'text',
        status: 'error',
        error: `xAI API error ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || '';

    return {
      provider: 'xai',
      model,
      kind: 'text',
      text: output,
      status: 'ok',
      responseTime: Date.now() - started,
      tokensUsed: data.usage?.total_tokens || Math.ceil(output.length / 4),
    };
  } catch (error) {
    return {
      provider: 'xai',
      model: 'grok-2',
      kind: 'text',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
