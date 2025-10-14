import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Shield, Info } from 'lucide-react-native';
import { Deep } from '@/constants/colors';
import type { PolicyMode } from '@/lib/noDemoEnforcement';

type Props = {
  enabled: boolean;
  mode: PolicyMode;
  onToggle: (enabled: boolean) => void;
  onModeChange: (mode: PolicyMode) => void;
  disabled?: boolean;
};

export function PolicyConfigPanel({ enabled, mode, onToggle, onModeChange, disabled }: Props) {
  const modes: { value: PolicyMode; label: string; description: string }[] = [
    {
      value: 'disabled',
      label: 'Disabled',
      description: 'No enforcement',
    },
    {
      value: 'warn',
      label: 'Warn',
      description: 'Show warnings, award credits, allow code',
    },
    {
      value: 'block',
      label: 'Block',
      description: 'Block delivery, award credits, require regeneration',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Shield size={20} color={Deep.cyan.line} />
        <Text style={styles.title}>Policy Configuration</Text>
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleLabel}>
          <Text style={styles.toggleText}>Enable Policy</Text>
          <Text style={styles.toggleSubtext}>Enforce no mock/demo code</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: Deep.cyan.dim, true: Deep.lime.base }}
          thumbColor={enabled ? Deep.ink : Deep.text.muted}
        />
      </View>

      {enabled && (
        <View style={styles.modesContainer}>
          <Text style={styles.modesTitle}>Enforcement Mode</Text>
          {modes.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[styles.modeCard, mode === m.value && styles.modeCardActive]}
              onPress={() => onModeChange(m.value)}
              disabled={disabled}
            >
              <View style={styles.modeHeader}>
                <Text style={[styles.modeLabel, mode === m.value && styles.modeLabelActive]}>
                  {m.label}
                </Text>
                {mode === m.value && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modeDescription}>{m.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.infoBox}>
        <Info size={16} color={Deep.cyan.line} />
        <Text style={styles.infoText}>
          Violations automatically award Bix credits. Manual flagging applies a {mode === 'block' ? '2' : '2.5-3'}× multiplier.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Deep.ink,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Deep.cyan.base,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Deep.text.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Deep.cyan.dim,
    marginBottom: 16,
  },
  toggleLabel: {
    flex: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Deep.text.primary,
    marginBottom: 4,
  },
  toggleSubtext: {
    fontSize: 12,
    color: Deep.text.muted,
  },
  modesContainer: {
    marginBottom: 16,
  },
  modesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Deep.text.primary,
    marginBottom: 12,
  },
  modeCard: {
    backgroundColor: 'rgba(13, 110, 120, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeCardActive: {
    borderColor: Deep.lime.base,
    backgroundColor: 'rgba(168, 241, 10, 0.1)',
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Deep.text.primary,
  },
  modeLabelActive: {
    color: Deep.lime.base,
  },
  activeBadge: {
    backgroundColor: Deep.lime.base,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Deep.ink,
  },
  modeDescription: {
    fontSize: 12,
    color: Deep.text.muted,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(14, 135, 148, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Deep.text.muted,
    lineHeight: 16,
  },
});
