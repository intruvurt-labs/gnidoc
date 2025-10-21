import type { ModelResult } from '../types';

export async function runRunway(
  model: string,
  prompt: string,
  _system?: string,
  _temperature = 0.7,
  _maxTokens = 2048
): Promise<ModelResult> {
  if (!process.env.RUNWAY_API_KEY) throw new Error('Runway API key not configured');

  const started = Date.now();

  try {
    const createResponse = await fetch('https://api.runwayml.com/v1/animations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        resolution: '720p',
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Runway API error: ${createResponse.status}`);
    }

    const job: any = await createResponse.json();
    let status = job.status;
    let outputUrl = '';

    while (status === 'starting' || status === 'running' || status === 'queued') {
      await new Promise(r => setTimeout(r, 3000));

      const pollResponse = await fetch(`https://api.runwayml.com/v1/animations/${job.id}`, {
        headers: { 'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}` },
      });

      const json: any = await pollResponse.json();
      status = json.status;

      if (status === 'succeeded') {
        outputUrl = json.output?.[0]?.url ?? '';
        break;
      }

      if (status === 'failed') {
        throw new Error('Runway job failed');
      }
    }

    const output = outputUrl ? `VIDEO_URL: ${outputUrl}` : '';
    const tokensUsed = Math.ceil(prompt.length / 4);

    return {
      model,
      output,
      score: outputUrl ? 0.85 : 0.2,
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
      error: error?.message || 'Runway request failed',
    };
  }
}
