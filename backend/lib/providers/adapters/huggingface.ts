import type { ModelResult } from '../types';

export async function runHuggingFace(
  modelId: string,
  prompt: string,
  _system?: string,
  temperature = 0.7,
  maxTokens = 2048
): Promise<ModelResult> {
  if (!process.env.HF_API_KEY) throw new Error('Hugging Face API key not configured');

  const started = Date.now();

  try {
    const url = `https://api-inference.huggingface.co/models/${modelId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: maxTokens,
          temperature,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`);
    }

    const json = await response.json();
    const output = Array.isArray(json)
      ? (json[0]?.generated_text ?? '')
      : (json.generated_text ?? JSON.stringify(json));
    const tokensUsed = Math.ceil((prompt.length + output.length) / 4);

    return {
      model: modelId,
      output,
      score: output.length > 20 ? 0.65 : 0.3,
      responseTime: Date.now() - started,
      tokensUsed,
    };
  } catch (error: any) {
    return {
      model: modelId,
      output: '',
      score: 0,
      responseTime: Date.now() - started,
      tokensUsed: 0,
      error: error?.message || 'Hugging Face request failed',
    };
  }
}
