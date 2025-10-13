import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutChangeEvent,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import { Network, Zap } from 'lucide-react-native';
import Colors, { Shadows } from '@/constants/colors';

interface ModelNode {
  modelId: string;
  label?: string;
  x: number; // 0..100
  y: number; // 0..100
  inactive?: boolean;
  testID?: string;
}

interface ModelConnection {
  id: string;
  from: string; // modelId
  to: string;   // modelId
}

interface ModelGraphProps {
  nodes: ModelNode[];
  connections?: ModelConnection[]; // optional: lines between nodes
  strategyChips: string[];
  onStrategyChange?: (strategy: string) => void;
  activeStrategy?: string;
  onNodePress?: (node: ModelNode, event: GestureResponderEvent) => void;
  onNodeLongPress?: (node: ModelNode, event: GestureResponderEvent) => void;
  height?: number; // graph viewport height (px)
}

const MODEL_CATALOG: Record<
  string,
  { label: string; color: string }
> = {
  'claude-3': { label: 'Claude 3', color: Colors.Colors.cyan.primary },
  'gemini-1.5': { label: 'Gemini 1.5', color: Colors.Colors.lime.primary },
  'gpt-5': { label: 'GPT-5', color: Colors.Colors.magenta.primary },
  'mistral-large': { label: 'Mistral Large', color: Colors.Colors.yellow.primary },
  'llama-3.1-405b': { label: 'Llama 3.1 405B', color: Colors.Colors.purple.primary },
  'deepseek-v2': { label: 'DeepSeek V2', color: Colors.Colors.red.primary },
  'cohere-command-r': { label: 'Cohere Command-R', color: Colors.Colors.cyanOrange.primary },
  'grok-2': { label: 'Grok 2', color: Colors.Colors.cyanRed.primary },
};

const NODE_SIZE = 80;

function lengthAndAngle(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { len, angle };
}

const ModelGraphBase: React.FC<ModelGraphProps> = ({
  nodes,
  connections,
  strategyChips,
  onStrategyChange,
  activeStrategy = 'balanced',
  onNodePress,
  onNodeLongPress,
  height = 300,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>(activeStrategy);
  const [graphSize, setGraphSize] = useState<{ w: number; h: number } | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height: h } = e.nativeEvent.layout;
    setGraphSize({ w: width, h });
  }, []);

  const handleStrategySelect = useCallback(
    (strategy: string) => {
      setSelectedStrategy(strategy);
      onStrategyChange?.(strategy);
    },
    [onStrategyChange]
  );

  const viewNodes = useMemo(() => {
    if (!graphSize) return [];
    return nodes
      .map((n) => {
        const catalog = MODEL_CATALOG[n.modelId];
        if (!catalog) return null;
        const xPx = (n.x / 100) * graphSize.w - NODE_SIZE / 2;
        const yPx = (n.y / 100) * graphSize.h - NODE_SIZE / 2;
        return {
          ...n,
          color: catalog.color,
          label: n.label ?? catalog.label,
          left: xPx,
          top: yPx,
        };
      })
      .filter(Boolean) as Array<
      ModelNode & { color: string; left: number; top: number; label: string }
    >;
  }, [nodes, graphSize]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, { left: number; top: number; color: string }>();
    viewNodes.forEach((n) => {
      map.set(n.modelId, { left: n.left, top: n.top, color: n.color });
    });
    return map;
  }, [viewNodes]);

  const renderedConnections = useMemo(() => {
    if (!graphSize || !connections || connections.length === 0) return null;

    return connections.map((c) => {
      const from = nodeMap.get(c.from);
      const to = nodeMap.get(c.to);
      if (!from || !to) return null;

      // Use node centers
      const x1 = from.left + NODE_SIZE / 2;
      const y1 = from.top + NODE_SIZE / 2;
      const x2 = to.left + NODE_SIZE / 2;
      const y2 = to.top + NODE_SIZE / 2;

      const { len, angle } = lengthAndAngle(x1, y1, x2, y2);
      const midX = x1;
      const midY = y1;

      return (
        <View
          key={`conn-${c.id}`}
          style={[
            styles.connection,
            {
              width: Math.max(1, len),
              left: midX,
              top: midY,
              transform: [{ rotate: `${angle}deg` }, { translateX: 0 }, { translateY: 0 }],
              backgroundColor: Colors.Colors.cyan.primary,
              opacity: 0.5,
            },
          ]}
          // improve hitSlop if we ever want to tap connections:
          pointerEvents="none"
        />
      );
    });
  }, [connections, nodeMap, graphSize]);

  return (
    <View style={styles.container}>
      <View style={styles.graphContainer}>
        <View
          style={[styles.graph, { height }]}
          onLayout={onLayout}
          testID="model-graph"
        >
          {/* Connections below nodes */}
          {renderedConnections}

          {/* Nodes */}
          {viewNodes.map((node) => (
            <TouchableOpacity
              key={`node-${node.modelId}`}
              activeOpacity={0.85}
              style={[
                styles.node,
                {
                  left: node.left,
                  top: node.top,
                  borderColor: node.color,
                  opacity: node.inactive ? 0.35 : 1,
                  ...(node.inactive ? null : Shadows.glowCyan),
                },
              ]}
              onPress={(e) => onNodePress?.(node, e)}
              onLongPress={(e) => onNodeLongPress?.(node, e)}
              disabled={!!node.inactive}
              accessibilityRole="button"
              accessibilityLabel={`${node.label}${node.inactive ? ' (inactive)' : ''}`}
              testID={node.testID ?? `node-${node.modelId}`}
            >
              <Network color={node.color} size={20} />
              <Text style={[styles.nodeLabel, { color: node.color }]} numberOfLines={2}>
                {node.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Empty state */}
          {viewNodes.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No models to display</Text>
              <Text style={styles.emptyStateText}>
                Add models or adjust filters to see the orchestration graph.
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.strategySection}>
        <Text style={styles.strategyTitle}>Strategy</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.strategyChips}
          contentContainerStyle={styles.strategyChipsContent}
        >
          {strategyChips.map((strategy) => {
            const active = strategy === selectedStrategy;
            return (
              <TouchableOpacity
                key={`strategy-${strategy}`}
                style={[styles.strategyChip, active && styles.strategyChipActive]}
                onPress={() => handleStrategySelect(strategy)}
                accessibilityRole="button"
                accessibilityLabel={`Strategy ${strategy}${active ? ' (selected)' : ''}`}
                testID={`strategy-${strategy}`}
              >
                <Zap
                  color={active ? Colors.Colors.text.inverse : Colors.Colors.cyan.primary}
                  size={16}
                />
                <Text
                  style={[styles.strategyChipText, active && styles.strategyChipTextActive]}
                >
                  {strategy}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
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
    overflow: 'hidden',
  },
  node: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: Platform.OS === 'web' ? 0.35 : 0.6,
    shadowRadius: 10,
    elevation: 10,
    paddingHorizontal: 6,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  connection: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
  },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.Colors.text.primary,
  },
  emptyStateText: {
    fontSize: 12,
    color: Colors.Colors.text.secondary,
  },
  strategySection: { marginTop: 12 },
  strategyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.Colors.cyan.primary,
    marginBottom: 12,
  },
  strategyChips: { flexDirection: 'row' },
  strategyChipsContent: { paddingRight: 4 },
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
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  strategyChipTextActive: {
    color: Colors.Colors.text.inverse,
  },
});

export default React.memo(ModelGraphBase);
