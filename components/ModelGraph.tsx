import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Network, Zap } from 'lucide-react-native';
import Colors, { Shadows } from '@/constants/colors';

const { width } = Dimensions.get('window');

interface ModelNode {
  modelId: string;
  label: string;
  x: number;
  y: number;
  inactive?: boolean;
}

interface ModelGraphProps {
  nodes: ModelNode[];
  strategyChips: string[];
  onStrategyChange?: (strategy: string) => void;
  activeStrategy?: string;
}

const MODEL_CATALOG: Record<string, { label: string; color: string }> = {
  'claude-3': { label: 'Claude 3', color: Colors.Colors.cyan.primary },
  'gemini-1.5': { label: 'Gemini 1.5', color: Colors.Colors.lime.primary },
  'gpt-5': { label: 'GPT-5', color: Colors.Colors.magenta.primary },
  'mistral-large': { label: 'Mistral Large', color: Colors.Colors.yellow.primary },
  'llama-3.1-405b': { label: 'Llama 3.1 405B', color: Colors.Colors.purple.primary },
  'deepseek-v2': { label: 'DeepSeek V2', color: Colors.Colors.red.primary },
  'cohere-command-r': { label: 'Cohere Command-R', color: Colors.Colors.cyanOrange.primary },
  'grok-2': { label: 'Grok 2', color: Colors.Colors.cyanRed.primary },
};

export default function ModelGraph({
  nodes,
  strategyChips,
  onStrategyChange,
  activeStrategy = 'balanced',
}: ModelGraphProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<string>(activeStrategy);

  const handleStrategySelect = (strategy: string) => {
    setSelectedStrategy(strategy);
    if (onStrategyChange) {
      onStrategyChange(strategy);
    }
  };

  const graphWidth = width - 40;
  const graphHeight = 300;

  return (
    <View style={styles.container}>
      <View style={styles.graphContainer}>
        <View style={[styles.graph, { width: graphWidth, height: graphHeight }]}>
          {nodes.map((node, index) => {
            const model = MODEL_CATALOG[node.modelId];
            if (!model) return null;

            const posX = (node.x / 100) * graphWidth - 40;
            const posY = (node.y / 100) * graphHeight - 40;

            return (
              <View
                key={`node-${node.modelId}-${index}`}
                style={[
                  styles.node,
                  {
                    left: posX,
                    top: posY,
                    borderColor: model.color,
                    opacity: node.inactive ? 0.3 : 1,
                  },
                ]}
              >
                <Network color={model.color} size={20} />
                <Text style={[styles.nodeLabel, { color: model.color }]}>
                  {model.label}
                </Text>
              </View>
            );
          })}

          {!nodes.some((n) => n.inactive) && (
            <>
              <View style={[styles.connection, { top: 100, left: 80, width: 120 }]} />
              <View
                style={[
                  styles.connection,
                  { top: 150, left: 100, width: 80, transform: [{ rotate: '45deg' }] },
                ]}
              />
            </>
          )}
        </View>
      </View>

      <View style={styles.strategySection}>
        <Text style={styles.strategyTitle}>Strategy</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.strategyChips}
        >
          {strategyChips.map((strategy, index) => (
            <TouchableOpacity
              key={`strategy-${strategy}-${index}`}
              style={[
                styles.strategyChip,
                selectedStrategy === strategy && styles.strategyChipActive,
              ]}
              onPress={() => handleStrategySelect(strategy)}
            >
              <Zap
                color={
                  selectedStrategy === strategy
                    ? Colors.Colors.text.inverse
                    : Colors.Colors.cyan.primary
                }
                size={16}
              />
              <Text
                style={[
                  styles.strategyChipText,
                  selectedStrategy === strategy && styles.strategyChipTextActive,
                ]}
              >
                {strategy}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  graphContainer: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
    ...Shadows.glowCyan,
    marginBottom: 20,
  },
  graph: {
    position: 'relative',
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 12,
  },
  node: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginTop: 4,
  },
  connection: {
    position: 'absolute',
    height: 2,
    backgroundColor: Colors.Colors.cyan.primary,
    opacity: 0.5,
  },
  strategySection: {
    marginTop: 12,
  },
  strategyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 12,
  },
  strategyChips: {
    flexDirection: 'row',
  },
  strategyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
    gap: 8,
  },
  strategyChipActive: {
    backgroundColor: Colors.Colors.cyan.primary,
    ...Shadows.glowCyan,
  },
  strategyChipText: {
    color: Colors.Colors.cyan.primary,
    fontSize: 14,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  strategyChipTextActive: {
    color: Colors.Colors.text.inverse,
  },
});
