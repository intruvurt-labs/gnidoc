import { z } from 'zod';

export const GenInput = z.object({
  prompt: z.string().min(1),
  system: z.string().optional(),
  images: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(2).optional().default(0.2),
  maxTokens: z.number().optional(),
});

export type GenInput = z.infer<typeof GenInput>;

export const GenResult = z.object({
  provider: z.string(),
  model: z.string(),
  kind: z.enum(['text', 'image', 'video', 'audio']),
  text: z.string().optional(),
  url: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  status: z.enum(['ok', 'error', 'timeout']),
  error: z.string().optional(),
  responseTime: z.number().optional(),
  tokensUsed: z.number().optional(),
  score: z.number().optional(),
});

export type GenResult = z.infer<typeof GenResult>;

export const ScoredResult = GenResult.extend({
  score: z.number(),
  confidence: z.number().optional(),
  reasoning: z.string().optional(),
});

export type ScoredResult = z.infer<typeof ScoredResult>;

export const ConsensusResult = z.object({
  consensus: z.string(),
  confidence: z.number(),
  agreement: z.number(),
  results: z.array(ScoredResult),
  winner: ScoredResult,
  reasoning: z.string(),
});

export type ConsensusResult = z.infer<typeof ConsensusResult>;
