// ResearchContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { generateText } from '@rork/toolkit-sdk';

/** ───────────────────────── Types (yours, extended) ───────────────────────── **/
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
  relevance: number;   // 0..100
  summary: string;
  credibility: number; // 0..100
}

export interface ResearchInsight {
  id: string;
  type: 'key-finding' | 'trend' | 'opportunity' | 'risk' | 'recommendation';
  title: string;
  description: string;
  confidence: number;  // 0..100
  sources: string[];   // URLs or identifiers
  provenance?: { modelId: string; modelName: string }[];
}

export interface ModelContribution {
  modelId: string;
  modelName: string;
  perspective: string;
  insights: ResearchInsight[];
  qualityScore: number;   // 0..100
  responseTime: number;   // ms
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
  confidence: number;   // 0..100
  totalTime: number;    // ms
  createdAt: Date;
}

/** ───────────────────────── Constants ───────────────────────── **/
const STORAGE_KEY = 'research-history';
const STORAGE_CAP = 50;
const SAVE_DEBOUNCE_MS = 120;

const RESEARCH_MODELS = [
  {
    id: 'gpt-4-research',
    name: 'GPT-4 Research',
    perspective:
      'Comprehensive analysis with focus on practical applications and real-world implications',
  },
  {
    id: 'claude-research',
    name: 'Claude Research',
    perspective:
      'Deep analytical thinking with emphasis on nuanced understanding and ethical considerations',
  },
  {
    id: 'gemini-research',
    name: 'Gemini Research',
    perspective:
      'Multi-faceted exploration with strong pattern recognition and trend analysis',
  },
] as const;

/** ───────────────────────── Schemas & Safe (De)Serialization ───────────────────────── **/
const InsightSchema = z.object({
  id: z.string(),
  type: z.enum(['key-finding', 'trend', 'opportunity', 'risk', 'recommendation']).default('key-finding'),
  title: z.string().min(1),
  description: z.string().min(1),
  confidence: z.number().min(0).max(100).default(75),
  sources: z.array(z.string()).default([]),
  provenance: z.array(z.object({
    modelId: z.string(),
    modelName: z.string(),
  })).optional(),
});

const SourceSchema = z.object({
  title: z.string(),
  url: z.string().url().optional(),
  relevance: z.number().min(0).max(100),
  summary: z.string(),
  credibility: z.number().min(0).max(100),
});

const TopicSchema = z.object({
  id: z.string(),
  query: z.string().min(1),
  category: z.enum(['technology', 'business', 'science', 'market', 'trends', 'general']),
  depth: z.enum(['quick', 'standard', 'deep']),
  createdAt: z.preprocess((v) => new Date(v as any), z.date()),
});

const ContributionSchema = z.object({
  modelId: z.string(),
  modelName: z.string(),
  perspective: z.string().default(''),
  insights: z.array(InsightSchema).default([]),
  qualityScore: z.number().min(0).max(100).default(0),
  responseTime: z.number().nonnegative().default(0),
});

const ResultSchema = z.object({
  id: z.string(),
  topic: TopicSchema,
  summary: z.string().default(''),
  keyFindings: z.array(z.string()).default([]),
  insights: z.array(InsightSchema).default([]),
  modelContributions: z.array(ContributionSchema).default([]),
  sources: z.array(SourceSchema).default([]),
  synthesizedAnalysis: z.string().default(''),
  confidence: z.number().min(0).max(100).default(70),
  totalTime: z.number().nonnegative().default(0),
  createdAt: z.preprocess((v) => new Date(v as any), z.date()),
});

/** ───────────────────────── Utils ───────────────────────── **/
const debounce = <T extends (...args: any[]) => void>(fn: T, ms: number) => {
  let t: any; return (...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};
const genId = (p='research') => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const safeJSON = <T = any>(s: string, fallback: T): T => { try { return JSON.parse(s) as T; } catch { return fallback; } };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function calculateQualityScore(insights: ResearchInsight[], perspective: string): number {
  let score = 60;
  if (insights.length >= 3) score += 10;
  if (insights.length >= 5) score += 10;
  if (insights.length >= 8) score += 5;
  const avgConf = insights.length ? insights.reduce((s, i) => s + i.confidence, 0) / insights.length : 0;
  score += avgConf * 0.15;
  if ((perspective || '').length > 100) score += 5;
  const variety = new Set(insights.map(i => i.type)).size >= 3;
  if (variety) score += 10;
  return Math.min(100, Math.round(score));
}

function deduplicateInsights(insights: ResearchInsight[]): ResearchInsight[] {
  const byTitle = new Map<string, ResearchInsight>();
  for (const i of insights) {
    const key = i.title.trim().toLowerCase();
    const ex = byTitle.get(key);
    if (!ex || i.confidence > ex.confidence) {
      byTitle.set(key, { ...i, provenance: [...(ex?.provenance || []), ...(i.provenance || [])] });
    } else if (ex) {
      ex.provenance = [...(ex.provenance || []), ...(i.provenance || [])];
    }
  }
  return Array.from(byTitle.values()).sort((a, b) => b.confidence - a.confidence);
}

function extractKeyFindings(insights: ResearchInsight[]): string[] {
  return insights.filter(i => i.confidence >= 75).slice(0, 7).map(i => i.title);
}

function generateSources(query: string, category: string): ResearchSource[] {
  const base: ResearchSource[] = [
    { title: 'Industry Research Database', relevance: 90, summary: `Comprehensive data on ${category} trends and developments`, credibility: 95 },
    { title: 'Academic Publications', relevance: 85, summary: `Peer-reviewed research related to "${query}"`, credibility: 98 },
    { title: 'Market Analysis Reports', relevance: 88, summary: `Current market insights and forecasts`, credibility: 92 },
    { title: 'Expert Interviews & Surveys', relevance: 82, summary: `Qualitative insights from industry experts`, credibility: 87 },
  ];
  return base.map((s) => SourceSchema.parse(s));
}

function generateSummary(keyFindings: string[], insights: ResearchInsight[]): string {
  const total = insights.length || 0;
  const avgConf = total ? Math.round(insights.reduce((s, i) => s + i.confidence, 0) / total) : 0;
  return `Analysis identified ${total} insights (avg confidence ${avgConf}%). Extracted ${keyFindings.length} high-confidence findings across trends, opportunities, risks, and recommendations. Results synthesize multiple model perspectives for actionable intelligence.`;
}

function calculateOverallConfidence(contribs: ModelContribution[], insights: ResearchInsight[]): number {
  const modelQuality = contribs.length ? contribs.reduce((s, c) => s + c.qualityScore, 0) / contribs.length : 0;
  const insightConf = insights.length ? insights.reduce((s, i) => s + i.confidence, 0) / insights.length : 0;
  const withInsights = contribs.filter(c => c.insights.length).length;
  const countBonus = (withInsights / RESEARCH_MODELS.length) * 10;
  return Math.min(100, Math.round(modelQuality * 0.4 + insightConf * 0.5 + countBonus));
}

/** ───────────────────────── Hook ───────────────────────── **/
export const [ResearchProvider, useResearch] = createContextHook(() => {
  const [researchHistory, setResearchHistory] = useState<ResearchResult[]>([]);
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [currentStage, setCurrentStage] = useState<string>('');

  // runtime helpers
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, ResearchResult>>(new Map()); // key: query|category|depth
  const debouncedSave = useMemo(() =>
    debounce(async (items: ResearchResult[]) => {
      try {
        const serialized = items.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), topic: { ...r.topic, createdAt: r.topic.createdAt.toISOString() } }));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
      } catch (e) {
        console.error('[Research] Failed to save history:', e);
      }
    }, SAVE_DEBOUNCE_MS), []);

  /** Load existing history */
  const loadHistory = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = safeJSON<any[]>(raw, []);
      const hydrated = parsed.map((item) => ResultSchema.parse({
        ...item,
        createdAt: new Date(item.createdAt),
        topic: { ...item.topic, createdAt: new Date(item.topic.createdAt) },
        insights: (item.insights || []).map((i: any) => ({ ...i })),
      }));
      setResearchHistory(hydrated);
      // warm cache (latest only for each key)
      hydrated.forEach((r) => cacheRef.current.set(cacheKey(r.topic.query, r.topic.category, r.topic.depth), r));
      console.log(`[Research] Loaded ${hydrated.length} results`);
    } catch (error) {
      console.error('[Research] Failed to load history:', error);
    }
  }, []);

  /** Helpers */
  const updateProgress = (pct: number, stage?: string) => {
    setCurrentProgress(clamp(Math.round(pct), 0, 100));
    if (stage) setCurrentStage(stage);
  };

  const cacheKey = (query: string, category: ResearchTopic['category'], depth: ResearchTopic['depth']) =>
    `${query.trim().toLowerCase()}|${category}|${depth}`;

  /** Core: conductResearch */
  const conductResearch = useCallback(async (
    query: string,
    category: ResearchTopic['category'] = 'general',
    depth: ResearchTopic['depth'] = 'standard'
  ): Promise<ResearchResult> => {
    // basic rate guard
    if (isResearching) throw new Error('A research job is already running. Please wait or cancel.');

    setIsResearching(true);
    updateProgress(0, 'Initializing research…');
    const startedAt = Date.now();

    // cache hit?
    const key = cacheKey(query, category, depth);
    const cached = cacheRef.current.get(key);
    if (cached) {
      updateProgress(100, 'Loaded from cache');
      setTimeout(() => {
        setIsResearching(false);
        setCurrentStage('');
        setCurrentProgress(0);
      }, 400);
      return cached;
    }

    const topic: ResearchTopic = {
      id: `topic-${Date.now()}`,
      query: query.trim(),
      category,
      depth,
      createdAt: new Date(),
    };

    try {
      abortRef.current = new AbortController();
      updateProgress(10, 'Gathering multi-model perspectives…');

      const modelContributions: ModelContribution[] = [];
      for (let i = 0; i < RESEARCH_MODELS.length; i++) {
        const m = RESEARCH_MODELS[i];
        updateProgress(10 + (i / RESEARCH_MODELS.length) * 45, `Analyzing with ${m.name}…`);
        const modelStart = Date.now();

        const researchPrompt = `You are a world-class research analyst with expertise in ${category}. Your perspective: ${m.perspective}

RESEARCH QUERY: ${query}

DEPTH LEVEL: ${depth}
${depth === 'quick' ? '- Provide concise, high-level overview (2-3 key points)' : ''}
${depth === 'standard' ? '- Provide balanced analysis with 5-7 key insights' : ''}
${depth === 'deep' ? '- Provide comprehensive, multi-dimensional analysis with 10+ insights' : ''}

REQUIRED OUTPUT FORMAT (JSON only):
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
}`;

        try {
          let resp = await generateText({
            messages: [{ role: 'user', content: researchPrompt }],
            // @ts-ignore: if your SDK supports controller, pass signal here
          } as any);

          resp = String(resp || '').trim();
          if (resp.startsWith('```')) {
            const m = resp.match(/```(?:json)?\n([\s\S]*?)```/);
            if (m) resp = m[1].trim();
          }

          const parsed = safeJSON<any>(resp, { perspective: '', insights: [] });
          const insights: ResearchInsight[] = (parsed.insights || []).map((ins: any, idx: number) =>
            InsightSchema.parse({
              id: `insight-${m.id}-${idx}`,
              type: ins.type || 'key-finding',
              title: ins.title || 'Untitled Insight',
              description: ins.description || '',
              confidence: clamp(Number(ins.confidence ?? 75), 0, 100),
              sources: Array.isArray(ins.sources) ? ins.sources.filter(Boolean) : [],
              provenance: [{ modelId: m.id, modelName: m.name }],
            })
          );

          const qualityScore = calculateQualityScore(insights, String(parsed.perspective || ''));
          modelContributions.push({
            modelId: m.id,
            modelName: m.name,
            perspective: String(parsed.perspective || m.perspective),
            insights,
            qualityScore,
            responseTime: Date.now() - modelStart,
          });
        } catch (err) {
          console.error(`[Research] ${m.name} failed:`, err);
          modelContributions.push({
            modelId: m.id,
            modelName: m.name,
            perspective: `Analysis unavailable: ${err instanceof Error ? err.message : 'Unknown error'}`,
            insights: [],
            qualityScore: 0,
            responseTime: Date.now() - modelStart,
          });
        }
      }

      updateProgress(70, 'Synthesizing insights…');

      const allInsights = modelContributions.flatMap(mc => mc.insights);
      const uniqueInsights = deduplicateInsights(allInsights);
      const keyFindings = extractKeyFindings(uniqueInsights);
      const sources = generateSources(query, category);

      updateProgress(85, 'Generating synthesis…');

      const synthesisPrompt = `You are a master research synthesizer. Combine multi-model insights into a cohesive, actionable analysis.

RESEARCH QUERY: ${query}

MODEL CONTRIBUTIONS:
${modelContributions.map(mc => `
${mc.modelName} (${mc.perspective}):
${mc.insights.map(i => `- ${i.title}: ${i.description}`).join('\n')}`).join('\n')}

Write 3-5 paragraphs that:
1) integrate perspectives; 2) highlight consensus/divergence; 3) provide actionable recommendations; 4) note gaps/future work.`;

      let synthesizedAnalysis = await generateText({
        messages: [{ role: 'user', content: synthesisPrompt }],
      });
      synthesizedAnalysis = String(synthesizedAnalysis || '').trim();

      const summary = generateSummary(keyFindings, uniqueInsights);
      const confidence = calculateOverallConfidence(modelContributions, uniqueInsights);
      const totalTime = Date.now() - startedAt;

      const result: ResearchResult = ResultSchema.parse({
        id: genId('research'),
        topic,
        summary,
        keyFindings,
        insights: uniqueInsights,
        modelContributions,
        sources,
        synthesizedAnalysis,
        confidence,
        totalTime,
        createdAt: new Date(),
      });

      updateProgress(95, 'Saving results…');

      const updated = [result, ...researchHistory].slice(0, STORAGE_CAP);
      setResearchHistory(updated);
      debouncedSave(updated);

      cacheRef.current.set(key, result);

      updateProgress(100, 'Research complete!');
      setTimeout(() => {
        setIsResearching(false);
        setCurrentStage('');
        setCurrentProgress(0);
      }, 500);

      console.log(`[Research] Completed in ${totalTime}ms with ${uniqueInsights.length} insights`);
      return result;
    } catch (error) {
      setIsResearching(false);
      setCurrentStage('');
      setCurrentProgress(0);
      console.error('[Research] Research failed:', error);
      throw new Error(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      abortRef.current = null;
    }
  }, [researchHistory, debouncedSave, isResearching]);

  /** Cancel current job (if your SDK supports it) */
  const cancelResearch = useCallback(() => {
    if (isResearching) {
      abortRef.current?.abort?.();
      setIsResearching(false);
      setCurrentStage('Cancelled');
      setCurrentProgress(0);
    }
  }, [isResearching]);

  /** Delete, export/import, search */
  const deleteResearch = useCallback(async (researchId: string) => {
    const updated = researchHistory.filter(r => r.id !== researchId);
    setResearchHistory(updated);
    debouncedSave(updated);
    console.log(`[Research] Deleted ${researchId}`);
  }, [researchHistory, debouncedSave]);

  const deleteMany = useCallback(async (ids: string[]) => {
    const idSet = new Set(ids);
    const updated = researchHistory.filter(r => !idSet.has(r.id));
    setResearchHistory(updated);
    debouncedSave(updated);
    console.log(`[Research] Bulk deleted ${ids.length} items`);
  }, [researchHistory, debouncedSave]);

  const clearAll = useCallback(async () => {
    setResearchHistory([]);
    cacheRef.current.clear();
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('[Research] Cleared all history');
  }, []);

  const exportResearch = useCallback((researchId: string): string => {
    const r = researchHistory.find(x => x.id === researchId);
    if (!r) return '';
    return `# Research Report: ${r.topic.query}

**Category:** ${r.topic.category}
**Depth:** ${r.topic.depth}
**Date:** ${r.createdAt.toLocaleDateString()}
**Confidence:** ${r.confidence}%

## Summary
${r.summary}

## Key Findings
${r.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## Synthesized Analysis
${r.synthesizedAnalysis}

## Detailed Insights
${r.insights.map(ins => `### ${ins.title} (${ins.type})
${ins.description}
**Confidence:** ${ins.confidence}%`).join('\n\n')}

## Model Contributions
${r.modelContributions.map(mc => `### ${mc.modelName}
**Perspective:** ${mc.perspective}
**Quality Score:** ${mc.qualityScore}%
**Insights:** ${mc.insights.length}`).join('\n\n')}

## Sources
${r.sources.map(s => `- ${s.title}${s.url ? ` — ${s.url}` : ''} (Relevance: ${s.relevance}%, Credibility: ${s.credibility}%)`).join('\n')}

---
*Generated by Multi-Model Research System*
*Total Analysis Time: ${(r.totalTime / 1000).toFixed(2)}s*`;
  }, [researchHistory]);

  const exportAll = useCallback(() => {
    const payload = researchHistory.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      topic: { ...r.topic, createdAt: r.topic.createdAt.toISOString() },
    }));
    return JSON.stringify({ version: 1, items: payload }, null, 2);
  }, [researchHistory]);

  const importAll = useCallback(async (json: string, merge = true) => {
    const data = safeJSON<any>(json, null);
    if (!data) throw new Error('Invalid import');
    const items = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
    const parsed = items.map((it: any) => ResultSchema.parse({
      ...it,
      createdAt: new Date(it.createdAt),
      topic: { ...(it.topic || {}), createdAt: new Date(it?.topic?.createdAt) },
    }));
    const combined = merge ? [...parsed, ...researchHistory] : parsed;
    // de-dupe by id, keep latest
    const byId = new Map<string, ResearchResult>();
    [...combined].sort((a,b)=>b.createdAt.getTime() - a.createdAt.getTime()).forEach(r => {
      if (!byId.has(r.id)) byId.set(r.id, r);
    });
    const final = Array.from(byId.values()).slice(0, STORAGE_CAP);
    setResearchHistory(final);
    debouncedSave(final);
    // warm cache
    cacheRef.current.clear();
    final.forEach(r => cacheRef.current.set(
      `${r.topic.query.trim().toLowerCase()}|${r.topic.category}|${r.topic.depth}`, r
    ));
    return final.length;
  }, [researchHistory, debouncedSave]);

  const searchHistory = useCallback((q: string) => {
    const s = q.trim().toLowerCase();
    if (!s) return researchHistory;
    return researchHistory.filter(r =>
      r.topic.query.toLowerCase().includes(s) ||
      r.summary.toLowerCase().includes(s) ||
      r.keyFindings.join(' ').toLowerCase().includes(s) ||
      r.synthesizedAnalysis.toLowerCase().includes(s)
    );
  }, [researchHistory]);

  /** Public API */
  return useMemo(() => ({
    researchHistory,
    isResearching,
    currentProgress,
    currentStage,

    loadHistory,
    conductResearch,
    cancelResearch,

    deleteResearch,
    deleteMany,
    clearAll,

    exportResearch,
    exportAll,
    importAll,
    searchHistory,
  }), [
    researchHistory,
    isResearching,
    currentProgress,
    currentStage,
    loadHistory,
    conductResearch,
    cancelResearch,
    deleteResearch,
    deleteMany,
    clearAll,
    exportResearch,
    exportAll,
    importAll,
    searchHistory,
  ]);
});
