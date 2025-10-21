import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { orchestrateMultiModel } from "../../../../lib/providers/router";

const SpecSchema = z.object({
  prompt: z.string().min(10),
  inference: z.object({
    appType: z.string(),
    features: z.array(z.string()),
    techStack: z.object({
      frontend: z.string(),
      backend: z.string(),
      database: z.string(),
    }),
    complexity: z.enum(["simple", "medium", "complex"]),
  }),
  plan: z.object({
    structure: z.array(z.object({
      path: z.string(),
      purpose: z.string(),
      type: z.enum(["file", "folder"]),
    })),
    dependencies: z.object({
      runtime: z.array(z.string()),
      dev: z.array(z.string()),
    }),
  }),
  nonce: z.string(),
  context: z.string().optional(),
});

export const specProcedure = protectedProcedure
  .input(SpecSchema)
  .mutation(async ({ input, ctx }) => {
    const { prompt, inference, plan, nonce, context } = input;

    if (!nonce.startsWith("dry_")) {
      throw new Error("Invalid nonce. Complete dry-run first.");
    }

    const systemPrompt = `You are a code architect creating detailed specifications.
For each file in the structure, specify:
1. Exact file content outline
2. Functions/components to implement
3. Props/types/interfaces
4. API endpoints (if backend)
5. Database schema (if applicable)

Return JSON:
{
  "specifications": [
    {
      "path": "src/app/page.tsx",
      "outline": "Main landing page with hero, features, CTA",
      "components": ["Hero", "FeatureGrid", "CTAButton"],
      "functions": ["handleSignup", "fetchData"],
      "types": ["type User = { id: string; name: string }"],
      "notes": "Connect to /api/auth for signup"
    }
  ],
  "apiEndpoints": [
    { "path": "/api/auth/login", "method": "POST", "input": "{email, password}", "output": "{token}" }
  ],
  "dbSchema": {
    "tables": [
      { "name": "users", "columns": ["id (uuid)", "email (text)", "created_at (timestamp)"] }
    ]
  }
}`;

    const fullPrompt = `User request: ${prompt}

Inference: ${JSON.stringify(inference, null, 2)}

Dry-run plan: ${JSON.stringify(plan, null, 2)}

${context ? `\nContext: ${context}` : ""}

Create detailed specifications for implementation.`;

    const models = ["gpt-4o", "claude-3-5-sonnet-20240620", "gemini-1.5-pro"];
    const results = await orchestrateMultiModel(
      {
        prompt: fullPrompt,
        context: "",
        models,
        systemPrompt,
        temperature: 0.2,
        maxTokens: 4096,
      },
      2
    );

    const specs = results
      .filter(r => !r.error && r.score > 0.5)
      .map(r => {
        try {
          const cleaned = r.output
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          return JSON.parse(cleaned);
        } catch (error) {
          console.error(`[Spec] Parse error from ${r.model}:`, error);
          return null;
        }
      })
      .filter(Boolean);

    if (specs.length === 0) {
      throw new Error("All models failed to generate valid specifications");
    }

    const merged = specs.reduce((acc, spec) => {
      if (!acc.specifications) acc.specifications = [];
      if (!acc.apiEndpoints) acc.apiEndpoints = [];
      if (!acc.dbSchema) acc.dbSchema = { tables: [] };

      if (spec.specifications) acc.specifications.push(...spec.specifications);
      if (spec.apiEndpoints) acc.apiEndpoints.push(...spec.apiEndpoints);
      if (spec.dbSchema?.tables) acc.dbSchema.tables.push(...spec.dbSchema.tables);

      return acc;
    }, {} as any);

    const uniqueSpecs = merged.specifications.reduce((acc: any[], s: any) => {
      if (!acc.find(x => x.path === s.path)) acc.push(s);
      return acc;
    }, []);
    merged.specifications = uniqueSpecs;

    const buildNonce = `build_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    return {
      specifications: merged,
      buildNonce,
      models: results.map(r => ({ model: r.model, score: r.score, tokensUsed: r.tokensUsed })),
      totalTokens: results.reduce((sum, r) => sum + r.tokensUsed, 0),
    };
  });
