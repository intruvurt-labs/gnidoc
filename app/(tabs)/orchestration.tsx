import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Network,
  Play,
  TrendingUp,
  Zap,
  DollarSign,
  Clock,
  Award,
  GitCompare,
  History,
  X,
  Check,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useTriModel } from '@/contexts/TriModelContext';

const { width } = Dimensions.get('window');

type TabType = 'orchestrate' | 'consensus' | 'selector' | 'cache';

interface ModelNode {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  selected: boolean;
}

export default function OrchestrationScreen() {
  const insets = useSafeAreaInsets();
  const {
    availableModels,
    config,
    orchestrationHistory,
    isOrchestrating,
    currentProgress,
    updateConfig,
    orchestrateGeneration,
    compareModels,
    getModelStats,
  } = useTriModel();

  const [activeTab, setActiveTab] = useState<TabType>('orchestrate');
  const [prompt, setPrompt] = useState<string>('');

  const [showResultModal, setShowResultModal] = useState(false);
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [consensusResults, setConsensusResults] = useState<any[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [modelNodes, setModelNodes] = useState<ModelNode[]>([]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const nodes: ModelNode[] = availableModels.map((model, idx) => ({
      id: model.id,
      name: model.name,
      x: (width / (availableModels.length + 1)) * (idx + 1) - 60,
      y: 100,
      color: getModelColor(model.provider),
      selected: config.models.includes(model.id),
    }));
    setModelNodes(nodes);
  }, [fadeAnim, availableModels, config.models]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentProgress, progressAnim]);

  const getModelColor = (provider: string) => {
    switch (provider) {
      case 'openai': return Colors.Colors.cyan.primary;
      case 'anthropic': return Colors.Colors.orange.primary;
      case 'google': return Colors.Colors.success;
      default: return Colors.Colors.text.muted;
    }
  };

  const handleOrchestrate = async () => {
    if (!prompt.trim()) return;

    try {
      const result = await orchestrateGeneration(prompt);
      setCurrentResult(result);
      setShowResultModal(true);
      setPrompt('');
    } catch (error) {
      console.error('[Orchestration] Failed:', error);
    }
  };

  const handleConsensusMode = async () => {
    if (!prompt.trim()) return;

    setIsComparing(true);
    try {
      const results = await compareModels(prompt, config.models);
      setConsensusResults(results);
    } catch (error) {
      console.error('[Consensus] Failed:', error);
    } finally {
      setIsComparing(false);
    }
  };

  const toggleModelSelection = (modelId: string) => {
    const currentModels = config.models;
    const newModels = currentModels.includes(modelId)
      ? currentModels.filter(id => id !== modelId)
      : [...currentModels, modelId];
    
    updateConfig({ models: newModels });
    
    setModelNodes(prev => prev.map(node => ({
      ...node,
      selected: newModels.includes(node.id),
    })));
  };

  const renderModelGraph = () => {
    const selectedNodes = modelNodes.filter(n => n.selected);
    
    return (
      <View style={styles.graphContainer}>
        <Text style={styles.graphTitle}>Model Orchestration Graph</Text>
        <Text style={styles.graphSubtitle}>Tap models to add/remove from orchestration</Text>
        
        <View style={styles.canvas}>
          {modelNodes.map((node, idx) => {
            const isSelected = node.selected;
            const selectedIdx = selectedNodes.findIndex(n => n.id === node.id);
            
            return (
              <View key={node.id}>
                {isSelected && selectedIdx > 0 && (
                  <View
                    style={[
                      styles.connectionLine,
                      {
                        left: selectedNodes[selectedIdx - 1].x + 60,
                        top: selectedNodes[selectedIdx - 1].y + 30,
                        width: Math.abs(node.x - selectedNodes[selectedIdx - 1].x),
                      },
                    ]}
                  />
                )}
                
                <TouchableOpacity
                  style={[
                    styles.modelNode,
                    {
                      left: node.x,
                      top: node.y,
                      borderColor: node.color,
                      backgroundColor: isSelected 
                        ? node.color + '30' 
                        : Colors.Colors.background.card,
                      borderWidth: isSelected ? 3 : 1,
                    },
                  ]}
                  onPress={() => toggleModelSelection(node.id)}
                >
                  <Text style={[
                    styles.modelNodeText,
                    { color: isSelected ? node.color : Colors.Colors.text.muted }
                  ]}>
                    {node.name.split(' ')[0]}
                  </Text>
                  {isSelected && (
                    <View style={[styles.selectedBadge, { backgroundColor: node.color }]}>
                      <Check color={Colors.Colors.text.inverse} size={12} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.flowIndicator}>
          <Text style={styles.flowText}>
            Data Flow: {selectedNodes.map(n => n.name.split(' ')[0]).join(' → ')}
          </Text>
        </View>
      </View>
    );
  };

  const renderConsensusMode = () => {
    const hasResults = consensusResults.length > 0;
    
    return (
      <View style={styles.consensusContainer}>
        <Text style={styles.sectionTitle}>Multi-Model Consensus</Text>
        <Text style={styles.sectionSubtitle}>
          Run the same prompt across multiple models and compare results
        </Text>

        {!hasResults ? (
          <View style={styles.emptyState}>
            <GitCompare color={Colors.Colors.text.muted} size={48} />
            <Text style={styles.emptyStateText}>
              Enter a prompt and run consensus mode to compare model outputs
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.resultsScroll}>
            {consensusResults.map((result, idx) => {
              const model = availableModels.find(m => m.id === result.modelId);
              if (!model) return null;

              return (
                <View key={idx} style={styles.consensusCard}>
                  <View style={styles.consensusHeader}>
                    <View style={[styles.modelBadge, { backgroundColor: getModelColor(model.provider) }]}>
                      <Text style={styles.modelBadgeText}>{model.name}</Text>
                    </View>
                    <View style={styles.metricsRow}>
                      <View style={styles.metric}>
                        <Award color={Colors.Colors.success} size={14} />
                        <Text style={styles.metricText}>{result.qualityScore}%</Text>
                      </View>
                      <View style={styles.metric}>
                        <Clock color={Colors.Colors.warning} size={14} />
                        <Text style={styles.metricText}>{result.responseTime}ms</Text>
                      </View>
                      <View style={styles.metric}>
                        <DollarSign color={Colors.Colors.cyan.primary} size={14} />
                        <Text style={styles.metricText}>${result.cost.toFixed(4)}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <ScrollView style={styles.codePreview} horizontal>
                    <Text style={styles.codeText}>{result.content.substring(0, 200)}...</Text>
                  </ScrollView>
                </View>
              );
            })}

            <View style={styles.consensusAnalysis}>
              <Text style={styles.analysisTitle}>Consensus Analysis</Text>
              <Text style={styles.analysisText}>
                • Best Quality: {consensusResults.reduce((best, curr) => 
                  curr.qualityScore > best.qualityScore ? curr : best
                ).modelId}
              </Text>
              <Text style={styles.analysisText}>
                • Fastest: {consensusResults.reduce((best, curr) => 
                  curr.responseTime < best.responseTime ? curr : best
                ).modelId}
              </Text>
              <Text style={styles.analysisText}>
                • Most Cost-Effective: {consensusResults.reduce((best, curr) => 
                  curr.cost < best.cost ? curr : best
                ).modelId}
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  const renderSmartSelector = () => {
    const stats = getModelStats();
    
    return (
      <ScrollView style={styles.selectorContainer}>
        <Text style={styles.sectionTitle}>Smart Model Selector</Text>
        <Text style={styles.sectionSubtitle}>
          AI-powered recommendations based on task type and historical performance
        </Text>

        <View style={styles.recommendationCard}>
          <View style={styles.recommendationHeader}>
            <Zap color={Colors.Colors.cyan.primary} size={24} />
            <Text style={styles.recommendationTitle}>Recommended Configuration</Text>
          </View>
          
          <View style={styles.strategySelector}>
            <Text style={styles.strategyLabel}>Selection Strategy:</Text>
            <View style={styles.strategyButtons}>
              {(['quality', 'speed', 'cost', 'balanced'] as const).map(strategy => (
                <TouchableOpacity
                  key={strategy}
                  style={[
                    styles.strategyButton,
                    config.selectionStrategy === strategy && styles.strategyButtonActive,
                  ]}
                  onPress={() => updateConfig({ selectionStrategy: strategy })}
                >
                  <Text style={[
                    styles.strategyButtonText,
                    config.selectionStrategy === strategy && styles.strategyButtonTextActive,
                  ]}>
                    {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.statsTitle}>Model Performance Statistics</Text>
        {availableModels.map(model => {
          const modelStat = stats[model.id];
          
          return (
            <View key={model.id} style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.statBadge, { backgroundColor: getModelColor(model.provider) }]}>
                  <Text style={styles.statBadgeText}>{model.name}</Text>
                </View>
                <Text style={styles.statProvider}>{model.provider}</Text>
              </View>

              {modelStat ? (
                <View style={styles.statGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Requests</Text>
                    <Text style={styles.statValue}>{modelStat.totalRequests}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Avg Quality</Text>
                    <Text style={styles.statValue}>{modelStat.avgQuality.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Avg Time</Text>
                    <Text style={styles.statValue}>{modelStat.avgResponseTime.toFixed(0)}ms</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Cost</Text>
                    <Text style={styles.statValue}>${modelStat.totalCost.toFixed(2)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Selected</Text>
                    <Text style={styles.statValue}>{modelStat.timesSelected}x</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noDataText}>No usage data yet</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderCacheReplay = () => {
    return (
      <ScrollView style={styles.cacheContainer}>
        <Text style={styles.sectionTitle}>Cache & Replay Engine</Text>
        <Text style={styles.sectionSubtitle}>
          Saved orchestration results for instant replay without API calls
        </Text>

        {orchestrationHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <History color={Colors.Colors.text.muted} size={48} />
            <Text style={styles.emptyStateText}>No cached orchestrations yet</Text>
          </View>
        ) : (
          orchestrationHistory.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              style={styles.cacheCard}
              onPress={() => {
                setCurrentResult(item);
                setShowResultModal(true);
              }}
            >
              <View style={styles.cacheHeader}>
                <Text style={styles.cachePrompt} numberOfLines={2}>{item.prompt}</Text>
                <Text style={styles.cacheDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.cacheMetrics}>
                <View style={styles.cacheMetric}>
                  <Network color={Colors.Colors.cyan.primary} size={14} />
                  <Text style={styles.cacheMetricText}>{item.models.length} models</Text>
                </View>
                <View style={styles.cacheMetric}>
                  <Clock color={Colors.Colors.warning} size={14} />
                  <Text style={styles.cacheMetricText}>{item.totalTime}ms</Text>
                </View>
                <View style={styles.cacheMetric}>
                  <DollarSign color={Colors.Colors.success} size={14} />
                  <Text style={styles.cacheMetricText}>${item.totalCost.toFixed(4)}</Text>
                </View>
                <View style={styles.cacheMetric}>
                  <Award color={Colors.Colors.orange.primary} size={14} />
                  <Text style={styles.cacheMetricText}>
                    {item.selectedResponse.qualityScore}%
                  </Text>
                </View>
              </View>

              <View style={styles.selectedModelBadge}>
                <Text style={styles.selectedModelText}>
                  Selected: {item.selectedResponse.modelId}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    );
  };

  const renderResultModal = () => {
    if (!currentResult) return null;

    return (
      <Modal
        visible={showResultModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Orchestration Result</Text>
              <TouchableOpacity onPress={() => setShowResultModal(false)}>
                <X color={Colors.Colors.text.primary} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.resultPrompt}>{currentResult.prompt}</Text>

              <View style={styles.resultMetrics}>
                <View style={styles.resultMetric}>
                  <Text style={styles.resultMetricLabel}>Total Time</Text>
                  <Text style={styles.resultMetricValue}>{currentResult.totalTime}ms</Text>
                </View>
                <View style={styles.resultMetric}>
                  <Text style={styles.resultMetricLabel}>Total Cost</Text>
                  <Text style={styles.resultMetricValue}>${currentResult.totalCost.toFixed(4)}</Text>
                </View>
                <View style={styles.resultMetric}>
                  <Text style={styles.resultMetricLabel}>Models Used</Text>
                  <Text style={styles.resultMetricValue}>{currentResult.models.length}</Text>
                </View>
              </View>

              <Text style={styles.selectedModelTitle}>
                Selected Model: {currentResult.selectedResponse.modelId}
              </Text>
              <Text style={styles.selectedModelQuality}>
                Quality Score: {currentResult.selectedResponse.qualityScore}%
              </Text>

              <View style={styles.codeContainer}>
                <ScrollView horizontal>
                  <Text style={styles.resultCode}>{currentResult.selectedResponse.content}</Text>
                </ScrollView>
              </View>

              <Text style={styles.allResponsesTitle}>All Model Responses:</Text>
              {currentResult.responses.map((response: any, idx: number) => (
                <View key={idx} style={styles.responseCard}>
                  <Text style={styles.responseModel}>{response.modelId}</Text>
                  <View style={styles.responseMetrics}>
                    <Text style={styles.responseMetric}>Quality: {response.qualityScore}%</Text>
                    <Text style={styles.responseMetric}>Time: {response.responseTime}ms</Text>
                    <Text style={styles.responseMetric}>Cost: ${response.cost.toFixed(4)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <Network color={Colors.Colors.cyan.primary} size={28} />
          <View>
            <Text style={styles.headerTitle}>Multi-Model Orchestration</Text>
            <Text style={styles.headerSubtitle}>
              {config.models.length} models • {config.selectionStrategy} strategy
            </Text>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {isOrchestrating && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>Orchestrating... {currentProgress.toFixed(0)}%</Text>
        </View>
      )}

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orchestrate' && styles.activeTab]}
          onPress={() => setActiveTab('orchestrate')}
        >
          <Network color={activeTab === 'orchestrate' ? Colors.Colors.cyan.primary : Colors.Colors.text.muted} size={20} />
          <Text style={[styles.tabText, activeTab === 'orchestrate' && styles.activeTabText]}>
            Orchestrate
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'consensus' && styles.activeTab]}
          onPress={() => setActiveTab('consensus')}
        >
          <GitCompare color={activeTab === 'consensus' ? Colors.Colors.cyan.primary : Colors.Colors.text.muted} size={20} />
          <Text style={[styles.tabText, activeTab === 'consensus' && styles.activeTabText]}>
            Consensus
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'selector' && styles.activeTab]}
          onPress={() => setActiveTab('selector')}
        >
          <TrendingUp color={activeTab === 'selector' ? Colors.Colors.cyan.primary : Colors.Colors.text.muted} size={20} />
          <Text style={[styles.tabText, activeTab === 'selector' && styles.activeTabText]}>
            Selector
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'cache' && styles.activeTab]}
          onPress={() => setActiveTab('cache')}
        >
          <History color={activeTab === 'cache' ? Colors.Colors.cyan.primary : Colors.Colors.text.muted} size={20} />
          <Text style={[styles.tabText, activeTab === 'cache' && styles.activeTabText]}>
            Cache
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'orchestrate' && renderModelGraph()}
        {activeTab === 'consensus' && renderConsensusMode()}
        {activeTab === 'selector' && renderSmartSelector()}
        {activeTab === 'cache' && renderCacheReplay()}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.promptInput}
          placeholder="Enter your prompt for multi-model orchestration..."
          placeholderTextColor={Colors.Colors.text.muted}
          value={prompt}
          onChangeText={setPrompt}
          multiline
          maxLength={500}
        />
        <View style={styles.actionButtons}>
          {activeTab === 'consensus' ? (
            <TouchableOpacity
              style={[styles.actionButton, isComparing && styles.actionButtonDisabled]}
              onPress={handleConsensusMode}
              disabled={isComparing || !prompt.trim()}
            >
              {isComparing ? (
                <ActivityIndicator size="small" color={Colors.Colors.text.inverse} />
              ) : (
                <>
                  <GitCompare color={Colors.Colors.text.inverse} size={18} />
                  <Text style={styles.actionButtonText}>Compare Models</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, isOrchestrating && styles.actionButtonDisabled]}
              onPress={handleOrchestrate}
              disabled={isOrchestrating || !prompt.trim()}
            >
              {isOrchestrating ? (
                <ActivityIndicator size="small" color={Colors.Colors.text.inverse} />
              ) : (
                <>
                  <Play color={Colors.Colors.text.inverse} size={18} />
                  <Text style={styles.actionButtonText}>Orchestrate</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderResultModal()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.Colors.cyanRed.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginTop: 2,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.Colors.background.secondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.Colors.cyan.primary,
  },
  progressText: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginTop: 4,
    textAlign: 'center' as const,
  },
  tabBar: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  tab: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.Colors.cyan.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.muted,
  },
  activeTabText: {
    color: Colors.Colors.cyan.primary,
  },
  content: {
    flex: 1,
  },
  graphContainer: {
    flex: 1,
    padding: 16,
  },
  graphTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.cyanRed.primary,
    marginBottom: 4,
  },
  graphSubtitle: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginBottom: 16,
  },
  canvas: {
    height: 250,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    position: 'relative' as const,
  },
  connectionLine: {
    position: 'absolute' as const,
    height: 2,
    backgroundColor: Colors.Colors.cyan.primary + '40',
  },
  modelNode: {
    position: 'absolute' as const,
    width: 120,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modelNodeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  selectedBadge: {
    position: 'absolute' as const,
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  flowIndicator: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  flowText: {
    fontSize: 12,
    color: Colors.Colors.text.secondary,
    textAlign: 'center' as const,
  },
  consensusContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.cyanRed.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
    textAlign: 'center' as const,
    paddingHorizontal: 40,
  },
  resultsScroll: {
    flex: 1,
  },
  consensusCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  consensusHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  modelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modelBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
  metricsRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  metric: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  metricText: {
    fontSize: 11,
    color: Colors.Colors.text.secondary,
  },
  codePreview: {
    maxHeight: 100,
  },
  codeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.Colors.text.secondary,
  },
  consensusAnalysis: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.cyan.primary,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 13,
    color: Colors.Colors.text.secondary,
    marginBottom: 4,
  },
  selectorContainer: {
    flex: 1,
    padding: 16,
  },
  recommendationCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.cyan.primary,
  },
  recommendationHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 16,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
  },
  strategySelector: {
    gap: 8,
  },
  strategyLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  strategyButtons: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  strategyButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: Colors.Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    alignItems: 'center' as const,
  },
  strategyButtonActive: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderColor: Colors.Colors.cyan.primary,
  },
  strategyButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.muted,
  },
  strategyButtonTextActive: {
    color: Colors.Colors.text.inverse,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  statHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  statBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
  statProvider: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
    textTransform: 'uppercase' as const,
  },
  statGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  statItem: {
    width: '30%',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.Colors.text.muted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  noDataText: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    fontStyle: 'italic' as const,
  },
  cacheContainer: {
    flex: 1,
    padding: 16,
  },
  cacheCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  cacheHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
  },
  cachePrompt: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    marginRight: 8,
  },
  cacheDate: {
    fontSize: 10,
    color: Colors.Colors.text.muted,
  },
  cacheMetrics: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 8,
  },
  cacheMetric: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  cacheMetricText: {
    fontSize: 11,
    color: Colors.Colors.text.secondary,
  },
  selectedModelBadge: {
    backgroundColor: Colors.Colors.cyan.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start' as const,
  },
  selectedModelText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.Colors.cyan.primary,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.Colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: Colors.Colors.border.muted,
  },
  promptInput: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.Colors.text.primary,
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top' as const,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.Colors.background.overlay,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.cyanRed.primary,
  },
  modalBody: {
    padding: 16,
  },
  resultPrompt: {
    fontSize: 14,
    color: Colors.Colors.text.primary,
    marginBottom: 16,
    fontWeight: '600' as const,
  },
  resultMetrics: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
  },
  resultMetric: {
    alignItems: 'center' as const,
  },
  resultMetricLabel: {
    fontSize: 10,
    color: Colors.Colors.text.muted,
    marginBottom: 4,
  },
  resultMetricValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
  },
  selectedModelTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  selectedModelQuality: {
    fontSize: 12,
    color: Colors.Colors.success,
    marginBottom: 12,
  },
  codeContainer: {
    backgroundColor: Colors.Colors.background.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    maxHeight: 200,
  },
  resultCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.Colors.text.secondary,
  },
  allResponsesTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  responseCard: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  responseModel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 6,
  },
  responseMetrics: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  responseMetric: {
    fontSize: 10,
    color: Colors.Colors.text.muted,
  },
});
