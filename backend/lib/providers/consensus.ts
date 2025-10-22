import { ScoredResult, ConsensusResult } from './types';

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

function findClusters(results: ScoredResult[], threshold = 0.3): ScoredResult[][] {
  if (results.length === 0) return [];
  
  const clusters: ScoredResult[][] = [];
  const used = new Set<number>();
  
  for (let i = 0; i < results.length; i++) {
    if (used.has(i)) continue;
    
    const cluster: ScoredResult[] = [results[i]];
    used.add(i);
    
    for (let j = i + 1; j < results.length; j++) {
      if (used.has(j)) continue;
      
      const text1 = results[i].text || '';
      const text2 = results[j].text || '';
      
      if (calculateSimilarity(text1, text2) >= threshold) {
        cluster.push(results[j]);
        used.add(j);
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters.sort((a, b) => b.length - a.length);
}

function weightedAverage(results: ScoredResult[]): number {
  const totalWeight = results.reduce((sum, r) => sum + (r.confidence || 0.5), 0);
  if (totalWeight === 0) return 0;
  
  return results.reduce((sum, r) => {
    const weight = (r.confidence || 0.5) / totalWeight;
    return sum + r.score * weight;
  }, 0);
}

export function buildConsensus(results: ScoredResult[]): ConsensusResult {
  if (results.length === 0) {
    throw new Error('No results to build consensus from');
  }

  const validResults = results.filter(r => r.status === 'ok' && r.text);
  
  if (validResults.length === 0) {
    const fallback = results[0];
    return {
      consensus: fallback.text || '',
      confidence: 0,
      agreement: 0,
      results,
      winner: fallback,
      reasoning: 'No valid results available',
    };
  }

  const clusters = findClusters(validResults);
  const largestCluster = clusters[0];
  
  const clusterScores = largestCluster.map(r => r.score);
  const avgScore = clusterScores.reduce((a, b) => a + b, 0) / clusterScores.length;
  
  const winner = largestCluster.reduce((best, current) =>
    current.score > best.score ? current : best
  );
  
  const agreement = largestCluster.length / validResults.length;
  const avgConfidence = largestCluster.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / largestCluster.length;
  
  const reasoning = [
    `Consensus from ${largestCluster.length}/${validResults.length} models`,
    `Average score: ${(avgScore * 100).toFixed(0)}%`,
    `Agreement: ${(agreement * 100).toFixed(0)}%`,
    `Providers: ${[...new Set(largestCluster.map(r => r.provider))].join(', ')}`,
  ].join('; ');

  return {
    consensus: winner.text || '',
    confidence: avgConfidence,
    agreement,
    results: validResults,
    winner,
    reasoning,
  };
}

export function buildWeightedConsensus(results: ScoredResult[]): ConsensusResult {
  if (results.length === 0) {
    throw new Error('No results to build consensus from');
  }

  const validResults = results.filter(r => r.status === 'ok' && r.text);
  
  if (validResults.length === 0) {
    const fallback = results[0];
    return {
      consensus: fallback.text || '',
      confidence: 0,
      agreement: 0,
      results,
      winner: fallback,
      reasoning: 'No valid results available',
    };
  }

  const sortedByScore = [...validResults].sort((a, b) => b.score - a.score);
  const winner = sortedByScore[0];
  
  const avgWeightedScore = weightedAverage(validResults);
  
  const topHalf = sortedByScore.slice(0, Math.ceil(sortedByScore.length / 2));
  const agreement = topHalf.length / validResults.length;
  
  const reasoning = [
    `Best result from ${validResults.length} models`,
    `Weighted score: ${(avgWeightedScore * 100).toFixed(0)}%`,
    `Winner: ${winner.provider} (${(winner.score * 100).toFixed(0)}%)`,
    `Response time: ${winner.responseTime}ms`,
  ].join('; ');

  return {
    consensus: winner.text || '',
    confidence: winner.confidence || 0.5,
    agreement,
    results: validResults,
    winner,
    reasoning,
  };
}

export function buildHybridConsensus(results: ScoredResult[]): ConsensusResult {
  if (results.length === 0) {
    throw new Error('No results to build consensus from');
  }

  const validResults = results.filter(r => r.status === 'ok' && r.text);
  
  if (validResults.length === 0) {
    const fallback = results[0];
    return {
      consensus: fallback.text || '',
      confidence: 0,
      agreement: 0,
      results,
      winner: fallback,
      reasoning: 'No valid results available',
    };
  }

  if (validResults.length < 3) {
    return buildWeightedConsensus(results);
  }

  const clusters = findClusters(validResults);
  const largestCluster = clusters[0];
  
  if (largestCluster.length >= validResults.length * 0.5) {
    return buildConsensus(results);
  }
  
  return buildWeightedConsensus(results);
}
