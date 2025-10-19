import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,

} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Zap, Brain, CheckCircle, XCircle, Clock, DollarSign, Code } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { createAuthenticatedTRPCClient } from '@/lib/trpc';

interface ModelResponse {
  modelId: string;
  content: string;
  qualityScore: number;
  responseTime: number;
  tokensUsed: number;
  cost: number;
  error?: string;
}

interface ConsensusData {
  winner: string;
  consensusScore: number;
  agreements: string[];
  conflicts: Array<{
    id: string;
    aspect: string;
    models: Array<{ model: string; approach: string; score: number }>;
    resolution: string;
  }>;
  reasoning: string;
}

interface OrchestrationResult {
  id: string;
  prompt: string;
  models: string[];
  responses: ModelResponse[];
  selectedResponse: ModelResponse;
  totalCost: number;
  totalTime: number;
  consensus?: ConsensusData;
  files?: Array<{ name: string; content: string; language: string; path: string }>;
  dependencies?: string[];
}

export default function CreatorStudioScreen() {
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState<string>('');
  const [selectedModels, setSelectedModels] = useState<string[]>(['gpt-4', 'claude-3-opus']);
  const [strategy, setStrategy] = useState<'quality' | 'speed' | 'cost' | 'balanced'>('quality');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableModels = [
    { id: 'gpt-4', name: 'GPT-4', color: Colors.Colors.cyan.primary },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', color: Colors.Colors.cyan.secondary },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', color: Colors.Colors.yellow.primary },
    { id: 'claude-2', name: 'Claude 2', color: Colors.Colors.yellow.secondary },
    { id: 'gemini-pro', name: 'Gemini Pro', color: Colors.Colors.red.primary },
    { id: 'mistral-7b', name: 'Mistral 7B', color: Colors.Colors.cyanRed.primary },
  ];

  const strategies = [
    { id: 'quality' as const, name: 'Quality', icon: CheckCircle },
    { id: 'speed' as const, name: 'Speed', icon: Zap },
    { id: 'cost' as const, name: 'Cost', icon: DollarSign },
    { id: 'balanced' as const, name: 'Balanced', icon: Brain },
  ];

  const toggleModel = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      setSelectedModels(selectedModels.filter(m => m !== modelId));
    } else {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  const handleGenerate = async () => {
    if (selectedModels.length === 0) {
      setError('Please select at least one model');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const trpcClient = createAuthenticatedTRPCClient();

      console.log('[CreatorStudio] Starting orchestration...');
      console.log('[CreatorStudio] Models:', selectedModels);
      console.log('[CreatorStudio] Strategy:', strategy);
      console.log('[CreatorStudio] Prompt:', prompt);

      const orchestrationResult = await trpcClient.orchestration.generate.mutate({
        prompt: prompt.trim(),
        models: selectedModels,
        selectionStrategy: strategy,
        systemPrompt: `You are an expert app builder. Generate a complete, production-ready React Native component with TypeScript.
        
REQUIREMENTS:
- Use TypeScript with proper types
- Use React Native components and StyleSheet
- Include proper error handling
- Make it web-compatible
- Use the cyan (#00FFFF) color scheme
- Add testID props for testing
- No console.log statements
- No 'any' types

Generate ONLY the code, no explanations.`,
        enforcePolicyCheck: true,
        tier: 3,
      });

      console.log('[CreatorStudio] Orchestration complete:', orchestrationResult);

      setResult(orchestrationResult);
    } catch (err) {
      console.error('[CreatorStudio] Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate code');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Creator Studio',
          headerStyle: { backgroundColor: Colors.Colors.black.primary },
          headerTintColor: Colors.Colors.cyan.primary,
          headerTitleStyle: { fontWeight: 'bold' as const },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.header}>
          <Brain size={48} color={Colors.Colors.cyan.primary} />
          <Text style={styles.title}>Multi-Model AI Creator</Text>
          <Text style={styles.subtitle}>
            Generate code using multiple AI models with consensus voting
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Models ({selectedModels.length})</Text>
          <View style={styles.modelsGrid}>
            {availableModels.map(model => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelChip,
                  selectedModels.includes(model.id) && styles.modelChipSelected,
                  { borderColor: model.color },
                ]}
                onPress={() => toggleModel(model.id)}
                disabled={isGenerating}
              >
                <Text
                  style={[
                    styles.modelChipText,
                    selectedModels.includes(model.id) && { color: model.color },
                  ]}
                >
                  {model.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selection Strategy</Text>
          <View style={styles.strategiesRow}>
            {strategies.map(strat => {
              const Icon = strat.icon;
              return (
                <TouchableOpacity
                  key={strat.id}
                  style={[
                    styles.strategyButton,
                    strategy === strat.id && styles.strategyButtonSelected,
                  ]}
                  onPress={() => setStrategy(strat.id)}
                  disabled={isGenerating}
                >
                  <Icon
                    size={20}
                    color={
                      strategy === strat.id
                        ? Colors.Colors.cyan.primary
                        : Colors.Colors.text.muted
                    }
                  />
                  <Text
                    style={[
                      styles.strategyText,
                      strategy === strat.id && styles.strategyTextSelected,
                    ]}
                  >
                    {strat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What do you want to build?</Text>
          <TextInput
            style={styles.promptInput}
            placeholder="E.g., A todo list app with categories and due dates"
            placeholderTextColor={Colors.Colors.text.muted}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={4}
            editable={!isGenerating}
          />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <XCircle size={20} color={Colors.Colors.red.primary} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <ActivityIndicator size="small" color={Colors.Colors.black.primary} />
              <Text style={styles.generateButtonText}>Generating...</Text>
            </>
          ) : (
            <>
              <Zap size={24} color={Colors.Colors.black.primary} />
              <Text style={styles.generateButtonText}>Generate</Text>
            </>
          )}
        </TouchableOpacity>

        {result && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>Results</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Clock size={16} color={Colors.Colors.cyan.primary} />
                <Text style={styles.statValue}>{result.totalTime}ms</Text>
                <Text style={styles.statLabel}>Time</Text>
              </View>
              <View style={styles.statBox}>
                <DollarSign size={16} color={Colors.Colors.yellow.primary} />
                <Text style={styles.statValue}>${result.totalCost.toFixed(4)}</Text>
                <Text style={styles.statLabel}>Cost</Text>
              </View>
              <View style={styles.statBox}>
                <Brain size={16} color={Colors.Colors.red.primary} />
                <Text style={styles.statValue}>{result.selectedResponse.qualityScore}%</Text>
                <Text style={styles.statLabel}>Quality</Text>
              </View>
            </View>

            {result.consensus && (
              <View style={styles.consensusBox}>
                <Text style={styles.consensusTitle}>Consensus Analysis</Text>
                <Text style={styles.consensusWinner}>
                  Winner: {result.consensus.winner}
                </Text>
                <Text style={styles.consensusScore}>
                  Consensus Score: {result.consensus.consensusScore}%
                </Text>

                {result.consensus.agreements.length > 0 && (
                  <View style={styles.agreementsBox}>
                    <Text style={styles.agreementsTitle}>Agreements:</Text>
                    {result.consensus.agreements.map((agreement, i) => (
                      <Text key={i} style={styles.agreementText}>
                        • {agreement}
                      </Text>
                    ))}
                  </View>
                )}

                {result.consensus.conflicts.length > 0 && (
                  <View style={styles.conflictsBox}>
                    <Text style={styles.conflictsTitle}>Conflicts Resolved:</Text>
                    {result.consensus.conflicts.map((conflict, i) => (
                      <View key={i} style={styles.conflictItem}>
                        <Text style={styles.conflictAspect}>{conflict.aspect}</Text>
                        <Text style={styles.conflictResolution}>
                          {conflict.resolution}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.reasoning}>{result.consensus.reasoning}</Text>
              </View>
            )}

            {result.files && result.files.length > 0 && (
              <View style={styles.filesBox}>
                <Text style={styles.filesTitle}>Generated Files ({result.files.length})</Text>
                {result.files.map((file, i) => (
                  <View key={i} style={styles.fileItem}>
                    <Code size={16} color={Colors.Colors.cyan.primary} />
                    <Text style={styles.fileName}>{file.path}</Text>
                    <Text style={styles.fileSize}>{file.content.length} chars</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.responsesBox}>
              <Text style={styles.responsesTitle}>Model Responses</Text>
              {result.responses.map((response, i) => (
                <View
                  key={i}
                  style={[
                    styles.responseItem,
                    response.modelId === result.selectedResponse.modelId &&
                      styles.responseItemWinner,
                  ]}
                >
                  <View style={styles.responseHeader}>
                    <Text style={styles.responseModel}>{response.modelId}</Text>
                    {response.modelId === result.selectedResponse.modelId && (
                      <CheckCircle size={16} color={Colors.Colors.success} />
                    )}
                  </View>
                  <View style={styles.responseStats}>
                    <Text style={styles.responseStat}>
                      Score: {response.qualityScore}%
                    </Text>
                    <Text style={styles.responseStat}>
                      Time: {response.responseTime}ms
                    </Text>
                    <Text style={styles.responseStat}>
                      Tokens: {response.tokensUsed}
                    </Text>
                  </View>
                  {response.error && (
                    <Text style={styles.responseError}>{response.error}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.black.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center' as const,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
    textAlign: 'center' as const,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
    marginBottom: 12,
  },
  modelsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  modelChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.Colors.border.muted,
    backgroundColor: Colors.Colors.background.card,
  },
  modelChipSelected: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  modelChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.muted,
  },
  strategiesRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  strategyButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.Colors.border.muted,
    backgroundColor: Colors.Colors.background.card,
    gap: 6,
  },
  strategyButtonSelected: {
    borderColor: Colors.Colors.cyan.primary,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  strategyText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.Colors.text.muted,
  },
  strategyTextSelected: {
    color: Colors.Colors.cyan.primary,
  },
  promptInput: {
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 2,
    borderColor: Colors.Colors.border.muted,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.Colors.text.secondary,
    minHeight: 100,
    textAlignVertical: 'top' as const,
  },
  errorBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 0, 64, 0.1)',
    borderWidth: 1,
    borderColor: Colors.Colors.red.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: Colors.Colors.red.primary,
  },
  generateButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.Colors.cyan.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.black.primary,
  },
  resultsSection: {
    marginTop: 32,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 2,
    borderColor: Colors.Colors.border.muted,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    gap: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.text.secondary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  consensusBox: {
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  consensusTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 12,
  },
  consensusWinner: {
    fontSize: 16,
    color: Colors.Colors.text.secondary,
    marginBottom: 8,
  },
  consensusScore: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
    marginBottom: 16,
  },
  agreementsBox: {
    marginBottom: 16,
  },
  agreementsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.success,
    marginBottom: 8,
  },
  agreementText: {
    fontSize: 13,
    color: Colors.Colors.text.muted,
    marginBottom: 4,
    paddingLeft: 8,
  },
  conflictsBox: {
    marginBottom: 16,
  },
  conflictsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.yellow.primary,
    marginBottom: 8,
  },
  conflictItem: {
    marginBottom: 8,
    paddingLeft: 8,
  },
  conflictAspect: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
  },
  conflictResolution: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  reasoning: {
    fontSize: 13,
    color: Colors.Colors.text.muted,
    fontStyle: 'italic' as const,
  },
  filesBox: {
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 2,
    borderColor: Colors.Colors.border.muted,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  filesTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
    marginBottom: 12,
  },
  fileItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    gap: 12,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    color: Colors.Colors.text.secondary,
  },
  fileSize: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  responsesBox: {
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 2,
    borderColor: Colors.Colors.border.muted,
    borderRadius: 12,
    padding: 20,
  },
  responsesTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
    marginBottom: 12,
  },
  responseItem: {
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  responseItemWinner: {
    borderColor: Colors.Colors.success,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  responseHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 8,
  },
  responseModel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
  },
  responseStats: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  responseStat: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  responseError: {
    fontSize: 12,
    color: Colors.Colors.red.primary,
    marginTop: 8,
  },
});
