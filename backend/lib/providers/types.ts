import { z } from 'zod';

export interface ModelResult {
  model: string;
  output: string;
  score: number;
  responseTime: number;
  tokensUsed: number;
  error?: string;
}

export interface GenerationRequest {
  prompt: string;
  context?: string;
  models: string[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  images?: string[];
}

export interface GenerationResult {
  model: string;
  provider: string;
  output: string;
  score: number;
  responseTime: number;
  tokensUsed: number;
  cost: number;
  error?: string;
}

export interface ArtifactFile {
  path: string;
  content: string;
  language?: string;
}

export interface GeneratedApp {
  name: string;
  description: string;
  framework: string;
  files: ArtifactFile[];
  dependencies: Record<string, string>;
  envVars: string[];
  setupInstructions: string;
  meta: {
    generatedAt: string;
    models: string[];
    totalTokens: number;
    totalCost: number;
  };
}

export const CodeBlockSchema = z.object({
  language: z.string(),
  filename: z.string(),
  content: z.string(),
});

export const GeneratedCodeSchema = z.object({
  files: z.array(CodeBlockSchema),
  dependencies: z.record(z.string(), z.string()).optional(),
  instructions: z.string().optional(),
});

export type CodeBlock = z.infer<typeof CodeBlockSchema>;
export type GeneratedCode = z.infer<typeof GeneratedCodeSchema>;
