import { GenInput, GenResult } from '../types';

export async function runwayAdapter(input: GenInput): Promise<GenResult> {
  const started = Date.now();
  const apiKey = process.env.RUNWAY_API_KEY;
  
  if (!apiKey) {
    return {
      provider: 'runway',
      model: 'gen-3-alpha',
      kind: 'video',
      status: 'error',
      error: 'RUNWAY_API_KEY not configured',
    };
  }

  try {
    const model = process.env.RUNWAY_MODEL || 'gen-3-alpha';

    const createResponse = await fetch('https://api.runwayml.com/v1/animations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: input.prompt,
        resolution: '720p',
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      return {
        provider: 'runway',
        model,
        kind: 'video',
        status: 'error',
        error: `Runway create error ${createResponse.status}: ${errorText}`,
      };
    }

    const job = await createResponse.json();
    let status = job.status;
    let outputUrl = '';

    let attempts = 0;
    const maxAttempts = 100;

    while ((status === 'starting' || status === 'running' || status === 'queued') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const pollResponse = await fetch(`https://api.runwayml.com/v1/animations/${job.id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      const pollData = await pollResponse.json();
      status = pollData.status;

      if (status === 'succeeded') {
        outputUrl = pollData.output?.[0]?.url || '';
        break;
      }

      if (status === 'failed') {
        return {
          provider: 'runway',
          model,
          kind: 'video',
          status: 'error',
          error: `Runway job failed: ${pollData.error || 'Unknown error'}`,
        };
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      return {
        provider: 'runway',
        model,
        kind: 'video',
        status: 'timeout',
        error: 'Runway job timeout after 5 minutes',
      };
    }

    return {
      provider: 'runway',
      model,
      kind: 'video',
      url: outputUrl,
      text: `VIDEO_URL: ${outputUrl}`,
      status: 'ok',
      responseTime: Date.now() - started,
      tokensUsed: Math.ceil(input.prompt.length / 4),
    };
  } catch (error) {
    return {
      provider: 'runway',
      model: 'gen-3-alpha',
      kind: 'video',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
