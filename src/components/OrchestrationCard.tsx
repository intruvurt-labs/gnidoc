import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Brain, ChevronDown, ChevronUp, RotateCw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { Orchestration } from '../db/schema';

interface OrchestrationCardProps {
  orchestration: Orchestration;
  onRerun: (runId: string, shard?: string) => void;
}

export function OrchestrationCard({ orchestration, onRerun }: OrchestrationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const votes = JSON.parse(orchestration.votes_json);
  const critiques = JSON.parse(orchestration.critiques_json);

  const consensusColor =
    orchestration.consensus >= 0.8
      ? Colors.Colors.green.primary
      : orchestration.consensus >= 0.6
      ? Colors.Colors.yellow.primary
      : Colors.Colors.red.primary;

  const statusConfig = {
    pending: { label: 'Pending', color: Colors.Colors.text.tertiary },
    running: { label: 'Running', color: Colors.Colors.blue.primary },
    completed: { label: 'Completed', color: Colors.Colors.green.primary },
    failed: { label: 'Failed', color: Colors.Colors.red.primary },
  };

  const status = statusConfig[orchestration.status];

  return (
    <View style={styles.card} testID={`orchestration-${orchestration.run_id}`}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Brain size={20} color={Colors.Colors.purple.primary} />
          <Text style={styles.titleText}>Run {orchestration.run_id.slice(0, 8)}</Text>
          <Text style={[styles.statusBadge, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={20} color={Colors.Colors.text.secondary} />
        ) : (
          <ChevronDown size={20} color={Colors.Colors.text.secondary} />
        )}
      </TouchableOpacity>

      <View style={styles.consensusRow}>
        <Text style={styles.consensusLabel}>Consensus:</Text>
        <Text style={[styles.consensusValue, { color: consensusColor }]}>
          {(orchestration.consensus * 100).toFixed(1)}%
        </Text>
      </View>

      {expanded && (
        <ScrollView style={styles.detailsContainer} nestedScrollEnabled>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Votes ({votes.length})</Text>
            {votes.map((vote: any, idx: number) => (
              <View key={idx} style={styles.voteItem}>
                <Text style={styles.modelName}>{vote.model}</Text>
                <Text style={styles.confidence}>
                  Confidence: {(vote.confidence * 100).toFixed(1)}%
                </Text>
                <Text style={styles.outputText} numberOfLines={2}>
                  {JSON.stringify(vote.output)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Critiques ({critiques.length})</Text>
            {critiques.map((critique: any, idx: number) => (
              <View key={idx} style={styles.critiqueItem}>
                <Text style={styles.modelName}>{critique.model}</Text>
                <Text style={styles.critiqueText}>{critique.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.rerunButton}
            onPress={() => onRerun(orchestration.run_id)}
            testID={`rerun-${orchestration.run_id}`}
          >
            <RotateCw size={16} color={Colors.Colors.text.inverse} />
            <Text style={styles.rerunText}>Re-run Orchestration</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
    fontFamily: 'monospace',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700' as const,
    backgroundColor: Colors.Colors.background.tertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  consensusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  consensusLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
  },
  consensusValue: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  detailsContainer: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.Colors.text.secondary,
    marginBottom: 8,
  },
  voteItem: {
    backgroundColor: Colors.Colors.background.tertiary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  modelName: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.Colors.purple.primary,
    marginBottom: 4,
  },
  confidence: {
    fontSize: 12,
    color: Colors.Colors.text.tertiary,
    marginBottom: 4,
  },
  outputText: {
    fontSize: 11,
    color: Colors.Colors.text.primary,
    fontFamily: 'monospace',
  },
  critiqueItem: {
    backgroundColor: Colors.Colors.background.tertiary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.Colors.yellow.primary,
  },
  critiqueText: {
    fontSize: 12,
    color: Colors.Colors.text.primary,
    lineHeight: 18,
  },
  rerunButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.Colors.purple.primary,
    marginTop: 8,
  },
  rerunText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.Colors.text.inverse,
  },
});
