import { GenInput, GenResult } from '../types';

export async function deepseekAdapter(input: GenInput): Promise<GenResult> {
  const started = Date.now();
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    return {
      provider: 'deepseek',
      model: 'deepseek-chat',
      kind: 'text',
      status: 'error',
      error: 'DEEPSEEK_API_KEY not configured',
    };
  }

  try {
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    const messages: any[] = [];
    if (input.system) {
      messages.push({ role: 'system', content: input.system });
    }
    messages.push({ role: 'user', content: input.prompt });

    const response = await fetch('https://api.deepseek.com/chat/completions', {
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
        provider: 'deepseek',
        model,
        kind: 'text',
        status: 'error',
        error: `DeepSeek API error ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || '';

    return {
      provider: 'deepseek',
      model,
      kind: 'text',
      text: output,
      status: 'ok',
      responseTime: Date.now() - started,
      tokensUsed: data.usage?.total_tokens || Math.ceil(output.length / 4),
    };
  } catch (error) {
    return {
      provider: 'deepseek',
      model: 'deepseek-chat',
      kind: 'text',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
