import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { generateText } from "@rork/toolkit-sdk";
import { getAvailableModels } from "../../../../../lib/ai-providers";
import { enforceNoDemo } from "../../../../../lib/noDemoEnforcement";
import { parseGeneratedCode, extractDependencies } from "../../../../../lib/code-parser";
import { runOrchestrator } from "../../../../lib/providers/orchestrator";
import { GenInput } from "../../../../lib/providers/types";

const orchestrationRequestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  models: z.array(z.string()).min(1).max(10),
  selectionStrategy: z.enum(['quality', 'speed', 'cost', 'balanced']),
  context: z.record(z.string(), z.any()).optional(),
  systemPrompt: z.string().optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  enforcePolicyCheck: z.boolean().optional(),
});



export const orchestrateGenerationProcedure = protectedProcedure
  .input(orchestrationRequestSchema)
  .mutation(async ({ input, ctx }) => {
    const startTime = Date.now();
    const token = ctx.token;

    console.log(`[Orchestration] Token ${token?.substring(0, 10) || 'none'}... starting orchestration with ${input.models.length} models`);

    if (!process.env.EXPO_PUBLIC_TOOLKIT_URL) {
      console.error('[Orchestration] EXPO_PUBLIC_TOOLKIT_URL not configured');
      throw new Error('AI service is not configured. Please check your environment variables.');
    }

    const availableModels = getAvailableModels();
    
    console.log(`[Orchestration] Available models: ${availableModels.length}`);

    const selectedModels = availableModels.filter(m => input.models.includes(m.id));
    
    if (selectedModels.length === 0) {
      throw new Error('No valid models selected');
    }

    if (input.models.length >= 2 && input.selectionStrategy === 'quality') {
      console.log('[Orchestration] Using multi-model consensus mode');
      
      try {
        const { results, consensus } = await runOrchestrator(input.models, GenInput.parse({ prompt: input.prompt, system: input.systemPrompt }), 'code');

        console.log('[Orchestration] Consensus analysis complete');
        console.log(`[Orchestration] Winner: ${consensus.winner.provider}/${consensus.winner.model}, Agreement: ${(consensus.agreement*100).toFixed(1)}%`);
        
        const responses = results.map(r => ({
          modelId: `${r.provider}:${r.model}`,
          content: r.text || '',
          qualityScore: Math.round(r.score * 100),
          responseTime: r.responseTime || 0,
          tokensUsed: r.tokensUsed || 0,
          cost: ((r.tokensUsed || 0) / 1000) * 0.02,
          timestamp: new Date(),
          error: r.status === 'ok' ? undefined : (r.error || 'error'),
        }));

        const files = parseGeneratedCode(consensus.consensus, 'expo');
        const dependencies = extractDependencies(files);
        
        let policyResult = null;
        if (input.enforcePolicyCheck && input.tier && input.tier >= 3) {
          console.log(`[Orchestration] Running policy check for tier ${input.tier}...`);
          policyResult = enforceNoDemo(consensus.consensus, input.tier);
        }

        const totalTime = Date.now() - startTime;
        const totalCost = responses.reduce((sum, r) => sum + r.cost, 0);

        return {
          id: `orch-${Date.now()}`,
          prompt: input.prompt,
          models: input.models,
          responses,
          selectedResponse: responses.find(r => r.modelId === `${consensus.winner.provider}:${consensus.winner.model}`) || responses[0],
          totalCost,
          totalTime,
          createdAt: new Date(),
          policyCheck: policyResult,
          consensus: {
            winner: `${consensus.winner.provider}:${consensus.winner.model}`,
            consensusScore: Math.round(consensus.confidence * 100),
            agreements: [],
            conflicts: [],
            reasoning: consensus.reasoning,
          },
          files,
          dependencies,
        };
      } catch (error) {
        console.error('[Orchestration] Multi-model orchestration failed:', error);
      }
    }

    console.log('[Orchestration] Using sequential generation mode');
    
    const responses: {
      modelId: string;
      content: string;
      qualityScore: number;
      responseTime: number;
      tokensUsed: number;
      cost: number;
      timestamp: Date;
      error?: string;
    }[] = [];

    for (const model of selectedModels) {
      const modelStartTime = Date.now();
      
      try {
        console.log(`[Orchestration] Generating with ${model.name}...`);

        const systemPrompt = input.systemPrompt || `You are an expert ${model.capabilities.join(', ')} AI assistant. Generate high-quality, production-ready code based on the user's request.

CRITICAL REQUIREMENTS:
- Use TypeScript with proper typing
- Follow React Native and Expo best practices
- Include proper error handling
- Use StyleSheet for styling
- Ensure web compatibility
- Add comprehensive comments
- Follow the cyan (#00FFFF), lime (#CCFF00), and yellow-lime (#BFFF00) color scheme with black outlines

${input.context ? `CONTEXT:\n${JSON.stringify(input.context, null, 2)}` : ''}

Generate ONLY valid code without markdown formatting.`;

        console.log(`[Orchestration] Generating with model: ${model.name}...`);
        
        let content: string;
        try {
          const response = await generateText({
            messages: [
              { role: 'user', content: `${systemPrompt}\n\nUser Request: ${input.prompt}` }
            ]
          });
          content = String(response || '');
        } catch (genError) {
          console.error(`[Orchestration] ${model.name} generation error:`, genError);
          throw new Error(`${model.name} failed: ${genError instanceof Error ? genError.message : 'Network or API error'}`);
        }
        
        if (!content || typeof content !== 'string' || content.length < 10) {
          throw new Error(`Invalid response from ${model.name}: empty or too short`);
        }

        const responseTime = Date.now() - modelStartTime;
        const tokensUsed = Math.ceil(content.length / 4);
        const cost = (tokensUsed / 1000) * model.costPerRequest;
        const qualityScore = evaluateQuality(content, input.prompt);

        responses.push({
          modelId: model.id,
          content,
          qualityScore,
          responseTime,
          tokensUsed,
          cost,
          timestamp: new Date(),
        });

        console.log(`[Orchestration] ${model.name} completed: Quality ${qualityScore}%, ${responseTime}ms, $${cost.toFixed(4)}`);
      } catch (error) {
        console.error(`[Orchestration] ${model.name} failed:`, error);
        
        responses.push({
          modelId: model.id,
          content: `// Error: ${error instanceof Error ? error.message : 'Generation failed'}`,
          qualityScore: 0,
          responseTime: Date.now() - modelStartTime,
          tokensUsed: 0,
          cost: 0,
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const selectedResponseData = selectBestResponse(responses, input.selectionStrategy);
    const selectedResponse = responses.find(r => r.modelId === selectedResponseData.modelId) || responses[0];
    const totalTime = Date.now() - startTime;
    const totalCost = responses.reduce((sum, r) => sum + r.cost, 0);

    let policyResult = null;
    if (input.enforcePolicyCheck && input.tier && input.tier >= 3) {
      console.log(`[Orchestration] Running policy check for tier ${input.tier}...`);
      policyResult = enforceNoDemo(selectedResponse.content, input.tier);
      
      if (!policyResult.allowed) {
        console.log(`[Orchestration] Policy violation detected: ${policyResult.message}`);
      } else {
        console.log(`[Orchestration] Policy check passed`);
      }
    }

    const result = {
      id: `orch-${Date.now()}`,
      prompt: input.prompt,
      models: input.models,
      responses,
      selectedResponse,
      totalCost,
      totalTime,
      createdAt: new Date(),
      policyCheck: policyResult,
    };

    console.log(`[Orchestration] Complete: Selected ${selectedResponse.modelId} with quality ${selectedResponse.qualityScore}%`);

    return result;
  });

function evaluateQuality(content: string, prompt: string): number {
  let score = 70;

  if (content.includes('import') && content.includes('export')) score += 5;
  if (content.includes('interface') || content.includes('type')) score += 5;
  if (content.includes('StyleSheet.create')) score += 5;
  if (content.includes('try') && content.includes('catch')) score += 5;
  if (content.includes('useState') || content.includes('useEffect')) score += 5;
  if (!content.includes('any')) score += 3;
  if (!content.includes('console.log')) score += 2;
  
  const hasComments = (content.match(/\/\//g) || []).length > 2;
  if (hasComments) score += 3;
  
  const lines = content.split('\n').length;
  if (lines > 20 && lines < 500) score += 2;

  if (content.includes('#00FFFF') || content.includes('cyan')) score += 2;
  if (content.includes('testID') || content.includes('testId')) score += 2;

  return Math.min(100, score);
}

function selectBestResponse(
  responses: {
    modelId: string;
    content: string;
    qualityScore: number;
    responseTime: number;
    cost: number;
  }[],
  strategy: 'quality' | 'speed' | 'cost' | 'balanced'
): typeof responses[0] {
  const validResponses = responses.filter(r => r.qualityScore > 0);
  
  if (validResponses.length === 0) {
    return responses[0];
  }

  switch (strategy) {
    case 'quality':
      return validResponses.reduce((best, current) =>
        current.qualityScore > best.qualityScore ? current : best
      );
    
    case 'speed':
      return validResponses.reduce((best, current) =>
        current.responseTime < best.responseTime ? current : best
      );
    
    case 'cost':
      return validResponses.reduce((best, current) =>
        current.cost < best.cost ? current : best
      );
    
    case 'balanced':
    default:
      return validResponses.reduce((best, current) => {
        const bestScore = (best.qualityScore * 0.6) + 
                         ((10000 / best.responseTime) * 0.3) + 
                         ((1 / (best.cost + 0.001)) * 0.1);
        const currentScore = (current.qualityScore * 0.6) + 
                            ((10000 / current.responseTime) * 0.3) + 
                            ((1 / (current.cost + 0.001)) * 0.1);
        return currentScore > bestScore ? current : best;
      });
  }
}
