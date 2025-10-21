import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { callProvider } from "../../../../lib/providers/router";

const ScanInferSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters"),
  context: z.string().optional(),
});

export const scanInferProcedure = protectedProcedure
  .input(ScanInferSchema)
  .mutation(async ({ input, ctx }) => {
    const { prompt, context } = input;
    
    const systemPrompt = `You are an expert app architect. Analyze the user's request and infer:
1. App type (e.g., SaaS, marketplace, social, e-commerce)
2. Required features (auth, payments, database, API integrations)
3. Tech stack recommendations (framework, database, services)
4. Estimated complexity (simple, medium, complex)
5. Required API keys and integrations

Return a JSON object with this structure:
{
  "appType": "string",
  "features": ["feature1", "feature2"],
  "techStack": {
    "frontend": "string",
    "backend": "string",
    "database": "string",
    "services": ["service1"]
  },
  "complexity": "simple|medium|complex",
  "requiredKeys": ["API_KEY_NAME"],
  "estimatedFiles": number,
  "recommendation": "string"
}`;

    const fullPrompt = context 
      ? `Context: ${context}\n\nUser request: ${prompt}\n\nAnalyze this request and provide the inference.`
      : `User request: ${prompt}\n\nAnalyze this request and provide the inference.`;

    const result = await callProvider(
      "gpt-4o",
      fullPrompt,
      systemPrompt,
      0.3,
      2048
    );

    let inference;
    try {
      const cleaned = result.output
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      inference = JSON.parse(cleaned);
    } catch (error) {
      console.error("[ScanInfer] Parse error:", error);
      throw new Error("Failed to parse AI inference");
    }

    return {
      inference,
      rawOutput: result.output,
      tokensUsed: result.tokensUsed,
      responseTime: result.responseTime,
    };
  });
