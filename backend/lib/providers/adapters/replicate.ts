import { GenInput, GenResult } from '../types';

const REPLICATE_API = 'https://api.replicate.com/v1';

export async function replicateAdapter(input: GenInput): Promise<GenResult> {
  const started = Date.now();
  const apiKey = process.env.REPLICATE_API_TOKEN;
  
  if (!apiKey) {
    return {
      provider: 'replicate',
      model: 'unknown',
      kind: 'text',
      status: 'error',
      error: 'REPLICATE_API_TOKEN not configured',
    };
  }

  try {
    const version = process.env.REPLICATE_VERSION || 'meta/llama-2-70b-chat';

    const createResponse = await fetch(`${REPLICATE_API}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version,
        input: { prompt: input.prompt },
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      return {
        provider: 'replicate',
        model: version,
        kind: 'text',
        status: 'error',
        error: `Replicate create error ${createResponse.status}: ${errorText}`,
      };
    }

    const prediction = await createResponse.json();
    let status = prediction.status;
    let output = '';

    let attempts = 0;
    const maxAttempts = 60;

    while ((status === 'starting' || status === 'processing') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const pollResponse = await fetch(`${REPLICATE_API}/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Token ${apiKey}` },
      });

      const pollData = await pollResponse.json();
      status = pollData.status;

      if (status === 'succeeded') {
        output = typeof pollData.output === 'string' 
          ? pollData.output 
          : JSON.stringify(pollData.output);
        break;
      }

      if (status === 'failed' || status === 'canceled') {
        return {
          provider: 'replicate',
          model: version,
          kind: 'text',
          status: 'error',
          error: `Replicate job ${status}: ${pollData.error || 'Unknown error'}`,
        };
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      return {
        provider: 'replicate',
        model: version,
        kind: 'text',
        status: 'timeout',
        error: 'Replicate job timeout after 90 seconds',
      };
    }

    return {
      provider: 'replicate',
      model: version,
      kind: 'text',
      text: output,
      status: 'ok',
      responseTime: Date.now() - started,
      tokensUsed: Math.ceil((input.prompt.length + output.length) / 4),
    };
  } catch (error) {
    return {
      provider: 'replicate',
      model: 'unknown',
      kind: 'text',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
