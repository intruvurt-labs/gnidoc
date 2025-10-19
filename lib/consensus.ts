import { generateText } from '@rork/toolkit-sdk';
import { ModelResult } from './multi-model';

export interface ConsensusResult {
  winner: ModelResult;
  rankings: ModelResult[];
  agreements: string[];
  conflicts: Conflict[];
  consensusScore: number;
  mergedOutput: string;
  reasoning: string;
}

export interface Conflict {
  id: string;
  aspect: string;
  models: Array<{
    model: string;
    approach: string;
    score: number;
  }>;
  resolution: string;
}

export async function analyzeConsensus(
  results: ModelResult[],
  originalPrompt: string
): Promise<ConsensusResult> {
  console.log('[Consensus] Starting consensus analysis...');

  const validResults = results.filter(r => r.score > 0 && r.output.length > 0);
  
  if (validResults.length === 0) {
    throw new Error('No valid model outputs to analyze');
  }

  if (validResults.length === 1) {
    console.log('[Consensus] Only one valid result, skipping analysis');
    return {
      winner: validResults[0],
      rankings: validResults,
      agreements: ['Single model output'],
      conflicts: [],
      consensusScore: 100,
      mergedOutput: validResults[0].output,
      reasoning: 'Only one model provided valid output',
    };
  }

  const sortedResults = [...validResults].sort((a, b) => b.score - a.score);
  const winner = sortedResults[0];

  console.log(`[Consensus] Winner: ${winner.model} with score ${winner.score.toFixed(3)}`);

  const agreements = findAgreements(validResults);
  const conflicts = findConflicts(validResults);
  const consensusScore = calculateConsensusScore(validResults);

  console.log(`[Consensus] Found ${agreements.length} agreements, ${conflicts.length} conflicts`);
  console.log(`[Consensus] Consensus score: ${consensusScore.toFixed(1)}%`);

  let mergedOutput = winner.output;
  let reasoning = `Selected ${winner.model} as the winner with highest quality score (${(winner.score * 100).toFixed(1)}%).`;

  if (validResults.length >= 2 && process.env.EXPO_PUBLIC_TOOLKIT_URL) {
    try {
      console.log('[Consensus] Attempting AI-powered merge...');
      
      const analysisPrompt = `You are an expert code reviewer analyzing multiple AI-generated outputs for the same task.

Original Task: ${originalPrompt}

Compare these ${validResults.length} AI model outputs and provide:
1. Key agreements (what all/most models agree on)
2. Conflicts (where models significantly disagree)
3. Best merged approach combining strengths from each
4. Reasoning for your recommendation

${validResults.map((r, i) => `
Model ${i + 1} (${r.model}, score: ${(r.score * 100).toFixed(1)}%):
\`\`\`
${r.output.substring(0, 1500)}${r.output.length > 1500 ? '...' : ''}
\`\`\`
`).join('\n')}

Return a JSON object with this structure:
{
  "agreements": ["agreement1", "agreement2"],
  "conflicts": [
    {
      "aspect": "state management",
      "models": [
        {"model": "gpt-4", "approach": "useState", "score": 0.9},
        {"model": "claude", "approach": "useReducer", "score": 0.85}
      ],
      "resolution": "useState is simpler for this use case"
    }
  ],
  "mergedOutput": "best combined code here",
  "reasoning": "detailed explanation"
}`;

      const aiAnalysis = await generateText({
        messages: [{ role: 'user', content: analysisPrompt }]
      });

      const parsed = parseConsensusJSON(aiAnalysis);
      
      if (parsed) {
        console.log('[Consensus] AI-powered analysis successful');
        
        return {
          winner,
          rankings: sortedResults,
          agreements: parsed.agreements || agreements,
          conflicts: parsed.conflicts?.map((c: any, i: number) => ({
            id: `conflict-${i}`,
            aspect: String(c.aspect || 'unknown'),
            models: (c.models || []).map((m: any) => ({
              model: String(m.model || 'unknown'),
              approach: String(m.approach || ''),
              score: Number(m.score) || 0,
            })),
            resolution: String(c.resolution || ''),
          })) || conflicts,
          consensusScore,
          mergedOutput: parsed.mergedOutput || winner.output,
          reasoning: parsed.reasoning || reasoning,
        };
      }
    } catch (error) {
      console.warn('[Consensus] AI analysis failed, using fallback:', error);
    }
  }

  return {
    winner,
    rankings: sortedResults,
    agreements,
    conflicts,
    consensusScore,
    mergedOutput,
    reasoning,
  };
}

function findAgreements(results: ModelResult[]): string[] {
  const agreements: string[] = [];

  const allIncludeImports = results.every(r => r.output.includes('import '));
  if (allIncludeImports) {
    agreements.push('All models use ES6 imports');
  }

  const allIncludeExports = results.every(r => r.output.includes('export '));
  if (allIncludeExports) {
    agreements.push('All models export components/functions');
  }

  const allIncludeJSX = results.every(r => /<\w+[\s>]/.test(r.output));
  if (allIncludeJSX) {
    agreements.push('All models generate JSX/TSX components');
  }

  const allIncludeTypes = results.every(r => 
    r.output.includes('interface ') || r.output.includes('type ')
  );
  if (allIncludeTypes) {
    agreements.push('All models use TypeScript types');
  }

  const allIncludeStyleSheet = results.every(r => r.output.includes('StyleSheet'));
  if (allIncludeStyleSheet) {
    agreements.push('All models use React Native StyleSheet');
  }

  const allIncludeErrorHandling = results.every(r => 
    /try\s*{[\s\S]*}[\s\n]*catch\s*\(/.test(r.output)
  );
  if (allIncludeErrorHandling) {
    agreements.push('All models implement error handling');
  }

  if (agreements.length === 0) {
    agreements.push('All models provided syntactically valid code');
  }

  return agreements;
}

function findConflicts(results: ModelResult[]): Conflict[] {
  const conflicts: Conflict[] = [];

  const useStateCount = results.filter(r => r.output.includes('useState')).length;
  const useReducerCount = results.filter(r => r.output.includes('useReducer')).length;
  
  if (useStateCount > 0 && useReducerCount > 0) {
    conflicts.push({
      id: 'state-management',
      aspect: 'State Management',
      models: [
        ...results.filter(r => r.output.includes('useState')).map(r => ({
          model: r.model,
          approach: 'useState',
          score: r.score,
        })),
        ...results.filter(r => r.output.includes('useReducer')).map(r => ({
          model: r.model,
          approach: 'useReducer',
          score: r.score,
        })),
      ],
      resolution: useStateCount >= useReducerCount ? 
        'useState preferred for simpler state' : 
        'useReducer preferred for complex state',
    });
  }

  const classComponents = results.filter(r => r.output.includes('class ') && r.output.includes('extends'));
  const funcComponents = results.filter(r => r.output.includes('function ') || r.output.includes('const '));
  
  if (classComponents.length > 0 && funcComponents.length > 0) {
    conflicts.push({
      id: 'component-style',
      aspect: 'Component Style',
      models: [
        ...classComponents.map(r => ({ model: r.model, approach: 'Class Component', score: r.score })),
        ...funcComponents.map(r => ({ model: r.model, approach: 'Functional Component', score: r.score })),
      ],
      resolution: 'Functional components with hooks are modern standard',
    });
  }

  return conflicts;
}

function calculateConsensusScore(results: ModelResult[]): number {
  const scores = results.map(r => r.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  const agreementScore = Math.max(0, 1 - (stdDev * 2));
  
  const qualityScore = avgScore;
  
  const consensusScore = (agreementScore * 0.4 + qualityScore * 0.6) * 100;
  
  return Math.round(Math.max(0, Math.min(100, consensusScore)));
}

function parseConsensusJSON(text: string): any {
  try {
    let cleaned = text.trim();
    
    if (cleaned.startsWith('```')) {
      const match = cleaned.match(/```(?:json)?\s*\n([\s\S]*?)```/);
      if (match && match[1]) {
        cleaned = match[1].trim();
      } else {
        cleaned = cleaned.replace(/^```[\w-]*\s*\n?/, '').replace(/\n?```$/, '').trim();
      }
    }
    
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(cleaned);
  } catch (error) {
    console.warn('[Consensus] Failed to parse JSON:', error);
    return null;
  }
}
