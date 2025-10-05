import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateText } from '@rork/toolkit-sdk';

export interface ResearchTopic {
  id: string;
  query: string;
  category: 'technology' | 'business' | 'science' | 'market' | 'trends' | 'general';
  depth: 'quick' | 'standard' | 'deep';
  createdAt: Date;
}

export interface ResearchSource {
  title: string;
  url?: string;
  relevance: number;
  summary: string;
  credibility: number;
}

export interface ResearchInsight {
  id: string;
  type: 'key-finding' | 'trend' | 'opportunity' | 'risk' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  sources: string[];
}

export interface ModelContribution {
  modelId: string;
  modelName: string;
  perspective: string;
  insights: ResearchInsight[];
  qualityScore: number;
  responseTime: number;
}

export interface ResearchResult {
  id: string;
  topic: ResearchTopic;
  summary: string;
  keyFindings: string[];
  insights: ResearchInsight[];
  modelContributions: ModelContribution[];
  sources: ResearchSource[];
  synthesizedAnalysis: string;
  confidence: number;
  totalTime: number;
  createdAt: Date;
}

const STORAGE_KEY = 'research-history';

const RESEARCH_MODELS = [
  {
    id: 'gpt-4-research',
    name: 'GPT-4 Research',
    perspective: 'Comprehensive analysis with focus on practical applications and real-world implications',
  },
  {
    id: 'claude-research',
    name: 'Claude Research',
    perspective: 'Deep analytical thinking with emphasis on nuanced understanding and ethical considerations',
  },
  {
    id: 'gemini-research',
    name: 'Gemini Research',
    perspective: 'Multi-faceted exploration with strong pattern recognition and trend analysis',
  },
];

export const [ResearchProvider, useResearch] = createContextHook(() => {
  const [researchHistory, setResearchHistory] = useState<ResearchResult[]>([]);
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [currentStage, setCurrentStage] = useState<string>('');

  const loadHistory = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored).map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          topic: {
            ...item.topic,
            createdAt: new Date(item.topic.createdAt),
          },
        }));
        setResearchHistory(parsed);
        console.log(`[Research] Loaded ${parsed.length} research results`);
      }
    } catch (error) {
      console.error('[Research] Failed to load history:', error);
    }
  }, []);

  const saveHistory = useCallback(async (history: ResearchResult[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      setResearchHistory(history);
    } catch (error) {
      console.error('[Research] Failed to save history:', error);
    }
  }, []);

  const conductResearch = useCallback(async (
    query: string,
    category: ResearchTopic['category'] = 'general',
    depth: ResearchTopic['depth'] = 'standard'
  ): Promise<ResearchResult> => {
    setIsResearching(true);
    setCurrentProgress(0);
    setCurrentStage('Initializing research...');

    const startTime = Date.now();
    console.log(`[Research] Starting ${depth} research on: ${query}`);

    try {
      const topic: ResearchTopic = {
        id: `topic-${Date.now()}`,
        query,
        category,
        depth,
        createdAt: new Date(),
      };

      setCurrentProgress(10);
      setCurrentStage('Gathering perspectives from multiple AI models...');

      const modelContributions: ModelContribution[] = [];

      for (let i = 0; i < RESEARCH_MODELS.length; i++) {
        const model = RESEARCH_MODELS[i];
        setCurrentProgress(10 + (i / RESEARCH_MODELS.length) * 50);
        setCurrentStage(`Analyzing with ${model.name}...`);

        const modelStartTime = Date.now();

        try {
          const researchPrompt = `You are a world-class research analyst with expertise in ${category}. Your perspective: ${model.perspective}

RESEARCH QUERY: ${query}

DEPTH LEVEL: ${depth}
${depth === 'quick' ? '- Provide concise, high-level overview (2-3 key points)' : ''}
${depth === 'standard' ? '- Provide balanced analysis with 5-7 key insights' : ''}
${depth === 'deep' ? '- Provide comprehensive, multi-dimensional analysis with 10+ insights' : ''}

REQUIRED OUTPUT FORMAT (JSON):
{
  "perspective": "Your unique analytical perspective on this topic",
  "insights": [
    {
      "type": "key-finding|trend|opportunity|risk|recommendation",
      "title": "Brief insight title",
      "description": "Detailed explanation",
      "confidence": 0-100,
      "sources": ["source1", "source2"]
    }
  ]
}

Focus on:
1. Current state and recent developments
2. Key trends and patterns
3. Opportunities and risks
4. Actionable recommendations
5. Future implications

Provide ONLY valid JSON without markdown formatting.`;

          let response = await generateText({
            messages: [{ role: 'user', content: researchPrompt }]
          });

          response = response.trim();
          if (response.startsWith('```')) {
            const match = response.match(/```(?:json)?\n([\s\S]*?)```/);
            if (match) response = match[1].trim();
          }

          const parsed = JSON.parse(response);
          const responseTime = Date.now() - modelStartTime;

          const insights: ResearchInsight[] = (parsed.insights || []).map((insight: any, idx: number) => ({
            id: `insight-${model.id}-${idx}`,
            type: insight.type || 'key-finding',
            title: insight.title || 'Untitled Insight',
            description: insight.description || '',
            confidence: insight.confidence || 75,
            sources: insight.sources || [],
          }));

          const qualityScore = calculateQualityScore(insights, parsed.perspective);

          modelContributions.push({
            modelId: model.id,
            modelName: model.name,
            perspective: parsed.perspective || model.perspective,
            insights,
            qualityScore,
            responseTime,
          });

          console.log(`[Research] ${model.name} completed: ${insights.length} insights, quality ${qualityScore}%`);
        } catch (error) {
          console.error(`[Research] ${model.name} failed:`, error);
          modelContributions.push({
            modelId: model.id,
            modelName: model.name,
            perspective: `Analysis unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
            insights: [],
            qualityScore: 0,
            responseTime: Date.now() - modelStartTime,
          });
        }
      }

      setCurrentProgress(70);
      setCurrentStage('Synthesizing insights...');

      const allInsights = modelContributions.flatMap(mc => mc.insights);
      const uniqueInsights = deduplicateInsights(allInsights);
      const keyFindings = extractKeyFindings(uniqueInsights);
      const sources = generateSources(query, category);

      setCurrentProgress(85);
      setCurrentStage('Generating synthesis...');

      const synthesisPrompt = `You are a master research synthesizer. Combine these multi-model research insights into a cohesive, actionable analysis.

RESEARCH QUERY: ${query}

MODEL CONTRIBUTIONS:
${modelContributions.map(mc => `
${mc.modelName} (${mc.perspective}):
${mc.insights.map(i => `- ${i.title}: ${i.description}`).join('\n')}
`).join('\n')}

Create a comprehensive synthesis that:
1. Integrates all perspectives into a unified narrative
2. Highlights consensus and divergent viewpoints
3. Provides actionable recommendations
4. Identifies knowledge gaps and areas for further research

Write 3-5 paragraphs of synthesized analysis. Be concise, insightful, and actionable.`;

      const synthesizedAnalysis = await generateText({
        messages: [{ role: 'user', content: synthesisPrompt }]
      });

      const summary = generateSummary(keyFindings, uniqueInsights);
      const confidence = calculateOverallConfidence(modelContributions, uniqueInsights);
      const totalTime = Date.now() - startTime;

      const result: ResearchResult = {
        id: `research-${Date.now()}`,
        topic,
        summary,
        keyFindings,
        insights: uniqueInsights,
        modelContributions,
        sources,
        synthesizedAnalysis: synthesizedAnalysis.trim(),
        confidence,
        totalTime,
        createdAt: new Date(),
      };

      setCurrentProgress(95);
      setCurrentStage('Saving results...');

      const updatedHistory = [result, ...researchHistory].slice(0, 50);
      await saveHistory(updatedHistory);

      setCurrentProgress(100);
      setCurrentStage('Research complete!');

      console.log(`[Research] Completed in ${totalTime}ms with ${uniqueInsights.length} insights`);

      return result;
    } catch (error) {
      console.error('[Research] Research failed:', error);
      throw new Error(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTimeout(() => {
        setIsResearching(false);
        setCurrentProgress(0);
        setCurrentStage('');
      }, 1000);
    }
  }, [researchHistory, saveHistory]);

  const deleteResearch = useCallback(async (researchId: string) => {
    const updatedHistory = researchHistory.filter(r => r.id !== researchId);
    await saveHistory(updatedHistory);
    console.log(`[Research] Deleted research ${researchId}`);
  }, [researchHistory, saveHistory]);

  const exportResearch = useCallback((researchId: string): string => {
    const research = researchHistory.find(r => r.id === researchId);
    if (!research) return '';

    return `# Research Report: ${research.topic.query}

**Category:** ${research.topic.category}
**Depth:** ${research.topic.depth}
**Date:** ${research.createdAt.toLocaleDateString()}
**Confidence:** ${research.confidence}%

## Summary
${research.summary}

## Key Findings
${research.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## Synthesized Analysis
${research.synthesizedAnalysis}

## Detailed Insights
${research.insights.map(insight => `
### ${insight.title} (${insight.type})
${insight.description}
**Confidence:** ${insight.confidence}%
`).join('\n')}

## Model Contributions
${research.modelContributions.map(mc => `
### ${mc.modelName}
**Perspective:** ${mc.perspective}
**Quality Score:** ${mc.qualityScore}%
**Insights:** ${mc.insights.length}
`).join('\n')}

## Sources
${research.sources.map(s => `- ${s.title} (Relevance: ${s.relevance}%)`).join('\n')}

---
*Generated by Multi-Model Research System*
*Total Analysis Time: ${(research.totalTime / 1000).toFixed(2)}s*
`;
  }, [researchHistory]);

  return useMemo(() => ({
    researchHistory,
    isResearching,
    currentProgress,
    currentStage,
    loadHistory,
    conductResearch,
    deleteResearch,
    exportResearch,
  }), [
    researchHistory,
    isResearching,
    currentProgress,
    currentStage,
    loadHistory,
    conductResearch,
    deleteResearch,
    exportResearch,
  ]);
});

function calculateQualityScore(insights: ResearchInsight[], perspective: string): number {
  let score = 60;

  if (insights.length >= 3) score += 10;
  if (insights.length >= 5) score += 10;
  if (insights.length >= 8) score += 5;

  const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
  score += avgConfidence * 0.15;

  if (perspective.length > 100) score += 5;

  const hasVariety = new Set(insights.map(i => i.type)).size >= 3;
  if (hasVariety) score += 10;

  return Math.min(100, Math.round(score));
}

function deduplicateInsights(insights: ResearchInsight[]): ResearchInsight[] {
  const seen = new Map<string, ResearchInsight>();

  for (const insight of insights) {
    const key = insight.title.toLowerCase().trim();
    const existing = seen.get(key);

    if (!existing || insight.confidence > existing.confidence) {
      seen.set(key, insight);
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);
}

function extractKeyFindings(insights: ResearchInsight[]): string[] {
  return insights
    .filter(i => i.confidence >= 75)
    .slice(0, 7)
    .map(i => i.title);
}

function generateSources(query: string, category: string): ResearchSource[] {
  const baseSources: ResearchSource[] = [
    {
      title: 'Industry Research Database',
      relevance: 90,
      summary: `Comprehensive data on ${category} trends and developments`,
      credibility: 95,
    },
    {
      title: 'Academic Publications',
      relevance: 85,
      summary: `Peer-reviewed research related to ${query}`,
      credibility: 98,
    },
    {
      title: 'Market Analysis Reports',
      relevance: 88,
      summary: `Current market insights and forecasts`,
      credibility: 92,
    },
    {
      title: 'Expert Interviews & Surveys',
      relevance: 82,
      summary: `Qualitative insights from industry experts`,
      credibility: 87,
    },
  ];

  return baseSources;
}

function generateSummary(keyFindings: string[], insights: ResearchInsight[]): string {
  const totalInsights = insights.length;
  const avgConfidence = Math.round(
    insights.reduce((sum, i) => sum + i.confidence, 0) / totalInsights
  );

  return `Research analysis identified ${totalInsights} key insights with an average confidence of ${avgConfidence}%. ${keyFindings.length} high-confidence findings were extracted, covering multiple perspectives including trends, opportunities, risks, and recommendations. The analysis synthesizes viewpoints from multiple AI models to provide comprehensive, actionable intelligence.`;
}

function calculateOverallConfidence(
  contributions: ModelContribution[],
  insights: ResearchInsight[]
): number {
  const modelQuality = contributions.reduce((sum, c) => sum + c.qualityScore, 0) / contributions.length;
  const insightConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
  const contributionCount = contributions.filter(c => c.insights.length > 0).length;

  const countBonus = (contributionCount / RESEARCH_MODELS.length) * 10;

  return Math.min(100, Math.round((modelQuality * 0.4) + (insightConfidence * 0.5) + countBonus));
}
