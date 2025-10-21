import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ModelResult } from '../types';

let genAI: GoogleGenerativeAI | null = null;

function getClient() {
  if (!genAI && process.env.GOOGLE_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return genAI;
}

export async function runGemini(
  model: string,
  prompt: string,
  system?: string,
  temperature = 0.7,
  maxTokens = 8192
): Promise<ModelResult> {
  const client = getClient();
  if (!client) throw new Error('Google API key not configured');

  const started = Date.now();

  try {
    const generativeModel = client.getGenerativeModel({
      model,
      systemInstruction: system,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    const result = await generativeModel.generateContent(prompt);
    const output = result.response.text() ?? '';
    const tokensUsed = Math.ceil((prompt.length + output.length) / 4);

    return {
      model,
      output,
      score: output.length > 20 ? 0.75 : 0.3,
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
      error: error?.message || 'Gemini request failed',
    };
  }
}
