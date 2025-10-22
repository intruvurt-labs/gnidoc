import { GenResult, ScoredResult } from './types';

const CodeBlockRegex = /```[\s\S]*?```/g;
const JsonRegex = /\{[\s\S]*\}/;

function extractCodeBlocks(text: string): string[] {
  return (text.match(CodeBlockRegex) || []).map((block) =>
    block.replace(/```(\w+)?\n?/g, '').trim()
  );
}

function hasValidJson(text: string): boolean {
  try {
    const match = text.match(JsonRegex);
    if (!match) return false;
    JSON.parse(match[0]);
    return true;
  } catch {
    return false;
  }
}

function calculateComplexity(text: string): number {
  const lines = text.split('\n').length;
  const functions = (text.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length;
  const classes = (text.match(/class\s+\w+/g) || []).length;
  const imports = (text.match(/import\s+.*from/g) || []).length;
  
  return Math.min(
    (lines / 50 + functions / 5 + classes / 2 + imports / 10) / 4,
    1
  );
}

function calculateCodeQuality(text: string): number {
  let score = 0.5;
  
  if (text.includes('export')) score += 0.1;
  if (text.includes('type') || text.includes('interface')) score += 0.1;
  if (text.includes('async') || text.includes('await')) score += 0.05;
  if (text.includes('try') && text.includes('catch')) score += 0.1;
  if (text.includes('//') || text.includes('/*')) score += 0.05;
  
  const hasLongLines = text.split('\n').some(line => line.length > 120);
  if (hasLongLines) score -= 0.1;
  
  return Math.max(0, Math.min(1, score));
}

export function scoreCodeResult(result: GenResult): ScoredResult {
  if (result.status !== 'ok' || !result.text) {
    return {
      ...result,
      score: 0,
      confidence: 0,
      reasoning: result.error || 'No valid output',
    };
  }

  const text = result.text;
  const codeBlocks = extractCodeBlocks(text);
  
  let score = 0.3;
  let reasoning: string[] = [];

  if (codeBlocks.length > 0) {
    score += 0.2;
    reasoning.push(`Contains ${codeBlocks.length} code block(s)`);
    
    const complexity = calculateComplexity(codeBlocks.join('\n'));
    score += complexity * 0.2;
    reasoning.push(`Complexity: ${(complexity * 100).toFixed(0)}%`);
    
    const quality = calculateCodeQuality(codeBlocks.join('\n'));
    score += quality * 0.2;
    reasoning.push(`Code quality: ${(quality * 100).toFixed(0)}%`);
  }

  if (hasValidJson(text)) {
    score += 0.1;
    reasoning.push('Contains valid JSON');
  }

  if (text.length > 100) {
    score += Math.min(text.length / 2000, 0.2);
    reasoning.push(`Length: ${text.length} chars`);
  }

  const confidence = Math.min(
    (result.tokensUsed || 0) / 1000,
    (result.responseTime || 0) < 10000 ? 0.9 : 0.5
  );

  return {
    ...result,
    score: Math.min(score, 1),
    confidence,
    reasoning: reasoning.join('; '),
  };
}

export function scoreTextResult(result: GenResult): ScoredResult {
  if (result.status !== 'ok' || !result.text) {
    return {
      ...result,
      score: 0,
      confidence: 0,
      reasoning: result.error || 'No valid output',
    };
  }

  const text = result.text;
  let score = 0.5;
  let reasoning: string[] = [];

  const wordCount = text.split(/\s+/).length;
  if (wordCount > 50) {
    score += Math.min(wordCount / 500, 0.3);
    reasoning.push(`${wordCount} words`);
  }

  const sentences = text.split(/[.!?]+/).filter(Boolean).length;
  if (sentences > 3) {
    score += Math.min(sentences / 20, 0.2);
    reasoning.push(`${sentences} sentences`);
  }

  if (hasValidJson(text)) {
    score += 0.15;
    reasoning.push('Contains structured data');
  }

  const hasHeadings = /^#{1,6}\s+/m.test(text);
  if (hasHeadings) {
    score += 0.05;
    reasoning.push('Well-structured with headings');
  }

  const confidence = (result.tokensUsed || 0) / 1000;

  return {
    ...result,
    score: Math.min(score, 1),
    confidence: Math.min(confidence, 1),
    reasoning: reasoning.join('; '),
  };
}

export function scoreResult(result: GenResult, taskType: 'code' | 'text' = 'text'): ScoredResult {
  return taskType === 'code' ? scoreCodeResult(result) : scoreTextResult(result);
}

export function scoreResults(results: GenResult[], taskType: 'code' | 'text' = 'text'): ScoredResult[] {
  return results.map(r => scoreResult(r, taskType));
}
