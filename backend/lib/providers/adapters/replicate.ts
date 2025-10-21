import type { ModelResult } from '../types';

const REPLICATE_API = 'https://api.replicate.com/v1';

export async function runReplicate(
  version: string,
  prompt: string,
  _system?: string,
  _temperature = 0.7,
  _maxTokens = 4096
): Promise<ModelResult> {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error('Replicate API token not configured');

  const started = Date.now();

  try {
    const createResponse = await fetch(`${REPLICATE_API}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version,
        input: { prompt },
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Replicate API error: ${createResponse.status}`);
    }

    const prediction = await createResponse.json();
    let status = prediction.status;
    let output = '';

    while (status === 'starting' || status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const pollResponse = await fetch(`${REPLICATE_API}/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` },
      });

      const json = await pollResponse.json();
      status = json.status;

      if (status === 'succeeded') {
        output = typeof json.output === 'string' ? json.output : JSON.stringify(json.output);
        break;
      }

      if (status === 'failed' || status === 'canceled') {
        throw new Error(`Replicate job ${status}`);
      }
    }

    return {
      model: version,
      output,
      score: output ? 0.7 : 0.2,
      responseTime: Date.now() - started,
      tokensUsed: Math.ceil((prompt.length + output.length) / 4),
    };
  } catch (error: any) {
    return {
      model: version,
      output: '',
      score: 0,
      responseTime: Date.now() - started,
      tokensUsed: 0,
      error: error?.message || 'Replicate request failed',
    };
  }
}
