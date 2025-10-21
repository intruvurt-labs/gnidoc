import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { callProvider } from "../../../../lib/providers/router";

const DryRunSchema = z.object({
  prompt: z.string().min(10),
  inference: z.object({
    appType: z.string(),
    features: z.array(z.string()),
    techStack: z.object({
      frontend: z.string(),
      backend: z.string(),
      database: z.string(),
      services: z.array(z.string()).optional(),
    }),
    complexity: z.enum(["simple", "medium", "complex"]),
    requiredKeys: z.array(z.string()),
  }),
  context: z.string().optional(),
});

export const dryRunProcedure = protectedProcedure
  .input(DryRunSchema)
  .mutation(async ({ input, ctx }) => {
    const { prompt, inference, context } = input;

    const systemPrompt = `You are a senior engineer creating a project structure plan.
Given the app inference, create a detailed dry-run plan listing:
1. Directory structure (folders and key files)
2. File purposes and what each will contain
3. Dependencies to install (npm packages)
4. Environment variables needed
5. Potential issues or blockers

Return JSON:
{
  "structure": [
    { "path": "src/app/page.tsx", "purpose": "Home page", "type": "file" },
    { "path": "src/components", "type": "folder" }
  ],
  "dependencies": {
    "runtime": ["next@14", "react@18"],
    "dev": ["typescript", "@types/node"]
  },
  "envVars": [
    { "name": "DATABASE_URL", "required": true, "example": "postgresql://..." },
    { "name": "STRIPE_SECRET_KEY", "required": false }
  ],
  "issues": ["Stripe integration requires webhook setup", "Database migrations needed"],
  "estimatedLines": 1200
}`;

    const fullPrompt = `User request: ${prompt}

Inference:
${JSON.stringify(inference, null, 2)}

${context ? `\nAdditional context: ${context}` : ""}

Create a detailed dry-run plan for this project.`;

    const result = await callProvider(
      "gpt-4o",
      fullPrompt,
      systemPrompt,
      0.2,
      3000
    );

    let plan;
    try {
      const cleaned = result.output
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      plan = JSON.parse(cleaned);
    } catch (error) {
      console.error("[DryRun] Parse error:", error);
      throw new Error("Failed to parse dry-run plan");
    }

    const nonce = `dry_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    return {
      plan,
      nonce,
      rawOutput: result.output,
      tokensUsed: result.tokensUsed,
      responseTime: result.responseTime,
    };
  });
