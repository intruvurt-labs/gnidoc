import { GenInput, GenResult } from '../types';

export async function geminiAdapter(input: GenInput): Promise<GenResult> {
  const started = Date.now();
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return {
      provider: 'gemini',
      model: 'gemini-1.5-pro',
      kind: 'text',
      status: 'error',
      error: 'GOOGLE_API_KEY or GEMINI_API_KEY not configured',
    };
  }

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

    const parts: any[] = [{ text: input.prompt }];
    
    for (const img of input.images || []) {
      const isDataUri = img.startsWith('data:');
      if (isDataUri) {
        const mimeType = img.substring(5, img.indexOf(';'));
        const data = img.split(',')[1];
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data,
          },
        });
      }
    }

    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        temperature: input.temperature || 0.2,
        maxOutputTokens: input.maxTokens || 2000,
      },
    };

    if (input.system) {
      requestBody.systemInstruction = {
        parts: [{ text: input.system }],
      };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        provider: 'gemini',
        model,
        kind: 'text',
        status: 'error',
        error: `Gemini API error ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      provider: 'gemini',
      model,
      kind: 'text',
      text: output,
      status: 'ok',
      responseTime: Date.now() - started,
      tokensUsed: Math.ceil((input.prompt.length + output.length) / 4),
    };
  } catch (error) {
    return {
      provider: 'gemini',
      model: 'gemini-1.5-pro',
      kind: 'text',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
