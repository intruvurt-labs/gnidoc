import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, CheckCircle, Clock, XCircle, RotateCw, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { QueueItem } from '../db/schema';

interface QueueItemCardProps {
  item: QueueItem;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
}

export function QueueItemCard({ item, onRetry, onDelete }: QueueItemCardProps) {
  const statusConfig = {
    pending: { icon: Clock, color: Colors.Colors.blue.primary, label: 'Pending' },
    retrying: { icon: RotateCw, color: Colors.Colors.yellow.primary, label: 'Retrying' },
    poison: { icon: XCircle, color: Colors.Colors.red.primary, label: 'Failed' },
    done: { icon: CheckCircle, color: Colors.Colors.green.primary, label: 'Done' },
  };

  const config = statusConfig[item.status];
  const StatusIcon = config.icon;

  return (
    <View style={styles.card} testID={`queue-item-${item.id}`}>
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          <StatusIcon size={16} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
        <Text style={styles.opText}>{item.op.toUpperCase()}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.targetText}>
          {item.target_type}/{item.target_id}
        </Text>
        <Text style={styles.metaText} numberOfLines={2}>
          Version: {item.base_version} | Retries: {item.retries}
        </Text>
      </View>

      <View style={styles.actions}>
        {(item.status === 'poison' || item.status === 'retrying') && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onRetry(item.id)}
            testID={`retry-${item.id}`}
          >
            <RotateCw size={18} color={Colors.Colors.blue.primary} />
            <Text style={styles.actionText}>Retry</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onDelete(item.id)}
          testID={`delete-${item.id}`}
        >
          <Trash2 size={18} color={Colors.Colors.red.primary} />
          <Text style={styles.actionText}>Delete</Text>
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
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  opText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.Colors.text.secondary,
    backgroundColor: Colors.Colors.background.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  body: {
    marginBottom: 12,
  },
  targetText: {
    fontSize: 14,
    color: Colors.Colors.text.primary,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  metaText: {
    fontSize: 12,
    color: Colors.Colors.text.tertiary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.tertiary,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
});
