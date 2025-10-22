import { GenInput, GenResult } from '../types';

export async function openaiAdapter(input: GenInput): Promise<GenResult> {
  const started = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return {
      provider: 'openai',
      model: 'gpt-4o',
      kind: 'text',
      status: 'error',
      error: 'OPENAI_API_KEY not configured',
    };
  }

  try {
    let model = process.env.OPENAI_MODEL || 'gpt-4o';
    if (model === 'gpt5') model = 'gpt-4o';

    const messages: any[] = [];
    
    if (input.system) {
      messages.push({ role: 'system', content: input.system });
    }
    
    messages.push({ role: 'user', content: input.prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        provider: 'openai',
        model,
        kind: 'text',
        status: 'error',
        error: `OpenAI API error ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || '';

    return {
      provider: 'openai',
      model,
      kind: 'text',
      text: output,
      status: 'ok',
      responseTime: Date.now() - started,
      tokensUsed: data.usage?.total_tokens || Math.ceil(output.length / 4),
    };
  } catch (error) {
    return {
      provider: 'openai',
      model: 'gpt-4o',
      kind: 'text',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
