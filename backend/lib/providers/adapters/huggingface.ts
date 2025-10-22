import { GenInput, GenResult } from '../types';

export async function huggingfaceAdapter(input: GenInput): Promise<GenResult> {
  const started = Date.now();
  const apiKey = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    return {
      provider: 'huggingface',
      model: 'unknown',
      kind: 'text',
      status: 'error',
      error: 'HF_API_KEY or HUGGINGFACE_API_KEY not configured',
    };
  }

  try {
    const modelId = process.env.HF_MODEL || 'meta-llama/Meta-Llama-3-8B-Instruct';
    const url = `https://api-inference.huggingface.co/models/${modelId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: input.prompt,
        parameters: {
          max_new_tokens: input.maxTokens || 800,
          temperature: input.temperature || 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        provider: 'huggingface',
        model: modelId,
        kind: 'text',
        status: 'error',
        error: `Hugging Face API error ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    let output = '';
    
    if (Array.isArray(data)) {
      output = data[0]?.generated_text || '';
    } else if (data.generated_text) {
      output = data.generated_text;
    } else {
      output = JSON.stringify(data);
    }

    return {
      provider: 'huggingface',
      model: modelId,
      kind: 'text',
      text: output,
      status: 'ok',
      responseTime: Date.now() - started,
      tokensUsed: Math.ceil((input.prompt.length + output.length) / 4),
    };
  } catch (error) {
    return {
      provider: 'huggingface',
      model: 'unknown',
      kind: 'text',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
