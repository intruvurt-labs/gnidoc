import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { GitMerge, ChevronDown, ChevronUp } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { Conflict } from '../db/schema';

interface ConflictCardProps {
  conflict: Conflict;
  onResolve: (id: string, resolution: 'local' | 'remote') => void;
  onDefer: (id: string) => void;
}

export function ConflictCard({ conflict, onResolve, onDefer }: ConflictCardProps) {
  const [expanded, setExpanded] = useState(false);

  const base = JSON.parse(conflict.base_json);
  const remote = JSON.parse(conflict.remote_json);
  const local = JSON.parse(conflict.local_json);

  return (
    <View style={styles.card} testID={`conflict-${conflict.id}`}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <GitMerge size={20} color={Colors.Colors.red.coral} />
          <Text style={styles.titleText}>Conflict</Text>
          <Text style={styles.policyBadge}>{conflict.policy}</Text>
        </View>
        {expanded ? (
          <ChevronUp size={20} color={Colors.Colors.text.secondary} />
        ) : (
          <ChevronDown size={20} color={Colors.Colors.text.secondary} />
        )}
      </TouchableOpacity>

      <Text style={styles.nodeText}>Node: {conflict.node_id}</Text>

      {expanded && (
        <ScrollView style={styles.diffContainer} nestedScrollEnabled>
          <View style={styles.diffSection}>
            <Text style={styles.diffLabel}>Base</Text>
            <Text style={styles.diffText}>{JSON.stringify(base, null, 2)}</Text>
          </View>

          <View style={[styles.diffSection, styles.remoteDiff]}>
            <Text style={styles.diffLabel}>Remote (Server)</Text>
            <Text style={styles.diffText}>{JSON.stringify(remote, null, 2)}</Text>
          </View>

          <View style={[styles.diffSection, styles.localDiff]}>
            <Text style={styles.diffLabel}>Local (Your Changes)</Text>
            <Text style={styles.diffText}>{JSON.stringify(local, null, 2)}</Text>
          </View>
        </ScrollView>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.localButton]}
          onPress={() => onResolve(conflict.id, 'local')}
          testID={`resolve-local-${conflict.id}`}
        >
          <Text style={styles.actionText}>Accept Local</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.remoteButton]}
          onPress={() => onResolve(conflict.id, 'remote')}
          testID={`resolve-remote-${conflict.id}`}
        >
          <Text style={styles.actionText}>Accept Remote</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deferButton]}
          onPress={() => onDefer(conflict.id)}
          testID={`defer-${conflict.id}`}
        >
          <Text style={styles.deferText}>Defer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: Colors.Colors.red.coral,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
  },
  policyBadge: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.Colors.text.tertiary,
    backgroundColor: Colors.Colors.background.tertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nodeText: {
    fontSize: 13,
    color: Colors.Colors.text.secondary,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  diffContainer: {
    maxHeight: 300,
    marginBottom: 12,
  },
  diffSection: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.tertiary,
  },
  remoteDiff: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.Colors.blue.primary,
  },
  localDiff: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.Colors.green.primary,
  },
  diffLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.Colors.text.secondary,
    marginBottom: 6,
  },
  diffText: {
    fontSize: 11,
    color: Colors.Colors.text.primary,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  localButton: {
    backgroundColor: Colors.Colors.green.primary,
  },
  remoteButton: {
    backgroundColor: Colors.Colors.blue.primary,
  },
  deferButton: {
    backgroundColor: Colors.Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
  deferText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
  },
});
