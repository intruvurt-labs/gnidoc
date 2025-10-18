import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { RevisionResponse } from '../api/client';

interface RevisionItemProps {
  revision: RevisionResponse;
  onRollback: (version: number) => void;
  isLatest: boolean;
}

export function RevisionItem({ revision, onRollback, isLatest }: RevisionItemProps) {
  const [expanded, setExpanded] = useState(false);
  
  const patch = revision.patch;
  const patchStr = JSON.stringify(patch, null, 2);

  return (
    <View style={styles.container} testID={`revision-${revision.version}`}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.versionText}>v{revision.version}</Text>
          {isLatest && <Text style={styles.latestBadge}>LATEST</Text>}
        </View>
        {expanded ? (
          <ChevronUp size={18} color={Colors.Colors.text.secondary} />
        ) : (
          <ChevronDown size={18} color={Colors.Colors.text.secondary} />
        )}
      </TouchableOpacity>

      <Text style={styles.metaText}>
        By {revision.actor} • {new Date(revision.created_at).toLocaleString()}
      </Text>

      {expanded && (
        <>
          <View style={styles.patchContainer}>
            <Text style={styles.patchText}>{patchStr}</Text>
          </View>

          {!isLatest && (
            <TouchableOpacity
              style={styles.rollbackButton}
              onPress={() => onRollback(revision.version)}
              testID={`rollback-${revision.version}`}
            >
              <RotateCcw size={16} color={Colors.Colors.blue.primary} />
              <Text style={styles.rollbackText}>Rollback to this version</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 10,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
    fontFamily: 'monospace',
  },
  latestBadge: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: Colors.Colors.green.primary,
    backgroundColor: Colors.Colors.green.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.Colors.text.tertiary,
    marginBottom: 8,
  },
  patchContainer: {
    backgroundColor: Colors.Colors.background.tertiary,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  patchText: {
    fontSize: 11,
    color: Colors.Colors.text.primary,
    fontFamily: 'monospace',
  },
  rollbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.Colors.blue.primary + '20',
    borderWidth: 1,
    borderColor: Colors.Colors.blue.primary,
    marginTop: 8,
  },
  rollbackText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.blue.primary,
  },
});
