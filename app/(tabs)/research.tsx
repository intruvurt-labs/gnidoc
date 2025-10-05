import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Brain,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useResearch } from '@/contexts/ResearchContext';
import type { ResearchResult, ResearchInsight } from '@/contexts/ResearchContext';

const { width } = Dimensions.get('window');

export default function ResearchScreen() {
  const [query, setQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'technology' | 'business' | 'science' | 'market' | 'trends' | 'general'>('general');
  const [selectedDepth, setSelectedDepth] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const [showDepthPicker, setShowDepthPicker] = useState<boolean>(false);

  const insets = useSafeAreaInsets();
  const {
    researchHistory,
    isResearching,
    currentProgress,
    currentStage,
    loadHistory,
    conductResearch,
    deleteResearch,
    exportResearch,
  } = useResearch();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleResearch = async () => {
    if (!query.trim() || isResearching) return;

    try {
      await conductResearch(query.trim(), selectedCategory, selectedDepth);
      setQuery('');
    } catch (error) {
      console.error('[ResearchScreen] Research failed:', error);
    }
  };

  const handleDelete = async (researchId: string) => {
    try {
      await deleteResearch(researchId);
    } catch (error) {
      console.error('[ResearchScreen] Delete failed:', error);
    }
  };

  const handleExport = (researchId: string) => {
    const markdown = exportResearch(researchId);
    console.log('[ResearchScreen] Exported research:', markdown);
  };

  const getInsightIcon = (type: ResearchInsight['type']) => {
    switch (type) {
      case 'key-finding': return <CheckCircle size={16} color={Colors.Colors.cyan.primary} />;
      case 'trend': return <TrendingUp size={16} color={Colors.Colors.cyanOrange.primary} />;
      case 'opportunity': return <Lightbulb size={16} color={Colors.Colors.success} />;
      case 'risk': return <AlertTriangle size={16} color={Colors.Colors.error} />;
      case 'recommendation': return <Sparkles size={16} color={Colors.Colors.cyanRed.primary} />;
    }
  };

  const categories = [
    { value: 'general' as const, label: 'General' },
    { value: 'technology' as const, label: 'Technology' },
    { value: 'business' as const, label: 'Business' },
    { value: 'science' as const, label: 'Science' },
    { value: 'market' as const, label: 'Market' },
    { value: 'trends' as const, label: 'Trends' },
  ];

  const depths = [
    { value: 'quick' as const, label: 'Quick', desc: '2-3 key points' },
    { value: 'standard' as const, label: 'Standard', desc: '5-7 insights' },
    { value: 'deep' as const, label: 'Deep', desc: '10+ insights' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Brain color={Colors.Colors.cyanRed.primary} size={24} />
        <Text style={styles.headerTitle}>Multi-Model Research</Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.inputContainer}>
          <Search color={Colors.Colors.text.muted} size={20} />
          <TextInput
            style={styles.input}
            placeholder="What would you like to research?"
            placeholderTextColor={Colors.Colors.text.muted}
            value={query}
            onChangeText={setQuery}
            editable={!isResearching}
            multiline
          />
        </View>

        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => setShowCategoryPicker(true)}
            disabled={isResearching}
          >
            <Text style={styles.optionLabel}>Category</Text>
            <Text style={styles.optionValue}>{selectedCategory}</Text>
            <ChevronDown size={16} color={Colors.Colors.text.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => setShowDepthPicker(true)}
            disabled={isResearching}
          >
            <Text style={styles.optionLabel}>Depth</Text>
            <Text style={styles.optionValue}>{selectedDepth}</Text>
            <ChevronDown size={16} color={Colors.Colors.text.muted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.researchButton, (!query.trim() || isResearching) && styles.researchButtonDisabled]}
          onPress={handleResearch}
          disabled={!query.trim() || isResearching}
        >
          {isResearching ? (
            <>
              <ActivityIndicator color={Colors.Colors.text.inverse} size="small" />
              <Text style={styles.researchButtonText}>{currentStage}</Text>
            </>
          ) : (
            <>
              <Sparkles color={Colors.Colors.text.inverse} size={20} />
              <Text style={styles.researchButtonText}>Start Research</Text>
            </>
          )}
        </TouchableOpacity>

        {isResearching && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${currentProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(currentProgress)}%</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Research History</Text>

        {researchHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Brain color={Colors.Colors.text.muted} size={48} />
            <Text style={styles.emptyText}>No research yet</Text>
            <Text style={styles.emptySubtext}>Start by entering a research query above</Text>
          </View>
        ) : (
          researchHistory.map((result) => (
            <View key={result.id} style={styles.resultCard}>
              <TouchableOpacity
                style={styles.resultHeader}
                onPress={() => setExpandedResult(expandedResult === result.id ? null : result.id)}
              >
                <View style={styles.resultHeaderLeft}>
                  <Text style={styles.resultQuery}>{result.topic.query}</Text>
                  <View style={styles.resultMeta}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{result.topic.category}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{result.topic.depth}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={12} color={Colors.Colors.text.muted} />
                      <Text style={styles.metaText}>{(result.totalTime / 1000).toFixed(1)}s</Text>
                    </View>
                  </View>
                </View>
                {expandedResult === result.id ? (
                  <ChevronUp size={20} color={Colors.Colors.text.muted} />
                ) : (
                  <ChevronDown size={20} color={Colors.Colors.text.muted} />
                )}
              </TouchableOpacity>

              {expandedResult === result.id && (
                <View style={styles.resultContent}>
                  <View style={styles.confidenceBar}>
                    <Text style={styles.confidenceLabel}>Confidence</Text>
                    <View style={styles.confidenceTrack}>
                      <View style={[styles.confidenceFill, { width: `${result.confidence}%` }]} />
                    </View>
                    <Text style={styles.confidenceValue}>{result.confidence}%</Text>
                  </View>

                  <Text style={styles.resultSectionTitle}>Summary</Text>
                  <Text style={styles.resultText}>{result.summary}</Text>

                  <Text style={styles.resultSectionTitle}>Key Findings</Text>
                  {result.keyFindings.map((finding, idx) => (
                    <View key={`finding-${idx}`} style={styles.findingItem}>
                      <Text style={styles.findingBullet}>•</Text>
                      <Text style={styles.findingText}>{finding}</Text>
                    </View>
                  ))}

                  <Text style={styles.resultSectionTitle}>Synthesized Analysis</Text>
                  <Text style={styles.resultText}>{result.synthesizedAnalysis}</Text>

                  <Text style={styles.resultSectionTitle}>Insights ({result.insights.length})</Text>
                  {result.insights.slice(0, 5).map((insight) => (
                    <View key={insight.id} style={styles.insightCard}>
                      <View style={styles.insightHeader}>
                        {getInsightIcon(insight.type)}
                        <Text style={styles.insightTitle}>{insight.title}</Text>
                      </View>
                      <Text style={styles.insightDescription}>{insight.description}</Text>
                      <View style={styles.insightFooter}>
                        <Text style={styles.insightType}>{insight.type}</Text>
                        <Text style={styles.insightConfidence}>{insight.confidence}% confidence</Text>
                      </View>
                    </View>
                  ))}

                  <Text style={styles.resultSectionTitle}>Model Contributions</Text>
                  {result.modelContributions.map((contribution) => (
                    <View key={contribution.modelId} style={styles.contributionCard}>
                      <View style={styles.contributionHeader}>
                        <Text style={styles.contributionName}>{contribution.modelName}</Text>
                        <Text style={styles.contributionQuality}>{contribution.qualityScore}%</Text>
                      </View>
                      <Text style={styles.contributionPerspective}>{contribution.perspective}</Text>
                      <Text style={styles.contributionStats}>
                        {contribution.insights.length} insights • {contribution.responseTime}ms
                      </Text>
                    </View>
                  ))}

                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleExport(result.id)}
                    >
                      <Download size={16} color={Colors.Colors.cyan.primary} />
                      <Text style={styles.actionButtonText}>Export</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDelete(result.id)}
                    >
                      <Trash2 size={16} color={Colors.Colors.error} />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Select Category</Text>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.pickerOption, selectedCategory === cat.value && styles.pickerOptionSelected]}
                onPress={() => {
                  setSelectedCategory(cat.value);
                  setShowCategoryPicker(false);
                }}
              >
                <Text style={[styles.pickerOptionText, selectedCategory === cat.value && styles.pickerOptionTextSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showDepthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDepthPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDepthPicker(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Select Depth</Text>
            {depths.map((depth) => (
              <TouchableOpacity
                key={depth.value}
                style={[styles.pickerOption, selectedDepth === depth.value && styles.pickerOptionSelected]}
                onPress={() => {
                  setSelectedDepth(depth.value);
                  setShowDepthPicker(false);
                }}
              >
                <View>
                  <Text style={[styles.pickerOptionText, selectedDepth === depth.value && styles.pickerOptionTextSelected]}>
                    {depth.label}
                  </Text>
                  <Text style={styles.pickerOptionDesc}>{depth.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyanRed.primary,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: Colors.Colors.text.primary,
    fontSize: 16,
    maxHeight: 100,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  optionLabel: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  optionValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    textTransform: 'capitalize' as const,
  },
  researchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.cyanRed.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  researchButtonDisabled: {
    opacity: 0.5,
  },
  researchButtonText: {
    color: Colors.Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  progressContainer: {
    marginTop: 12,
    gap: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.Colors.cyanRed.primary,
  },
  progressText: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    textAlign: 'center' as const,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyanRed.primary,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
  },
  resultCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  resultHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  resultQuery: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  badge: {
    backgroundColor: Colors.Colors.background.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
    textTransform: 'capitalize' as const,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
  },
  resultContent: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  confidenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
    minWidth: 70,
  },
  confidenceTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: Colors.Colors.success,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.muted,
    minWidth: 35,
  },
  resultSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyanRed.primary,
    marginTop: 4,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.Colors.text.secondary,
  },
  findingItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  findingBullet: {
    fontSize: 14,
    color: Colors.Colors.cyan.primary,
    fontWeight: 'bold' as const,
  },
  findingText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.Colors.text.secondary,
  },
  insightCard: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  insightTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  insightDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.Colors.text.secondary,
    marginBottom: 8,
  },
  insightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightType: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.Colors.text.muted,
    textTransform: 'capitalize' as const,
  },
  insightConfidence: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
  },
  contributionCard: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  contributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  contributionName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  contributionQuality: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.success,
  },
  contributionPerspective: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.Colors.text.secondary,
    marginBottom: 6,
  },
  contributionStats: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  deleteButton: {
    borderColor: Colors.Colors.error,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.cyan.primary,
  },
  deleteButtonText: {
    color: Colors.Colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModal: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyanRed.primary,
    marginBottom: 16,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.Colors.background.secondary,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.Colors.cyan.primary,
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  pickerOptionTextSelected: {
    color: Colors.Colors.text.inverse,
  },
  pickerOptionDesc: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginTop: 2,
  },
});
