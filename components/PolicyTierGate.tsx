import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lock, Zap } from 'lucide-react-native';
import { Deep } from '@/constants/colors';
import type { SubscriptionTier } from '@/lib/noDemoEnforcement';

type Props = {
  currentTier: SubscriptionTier;
  requiredTier: SubscriptionTier;
  onUpgrade?: () => void;
};

export function PolicyTierGate({ currentTier, requiredTier, onUpgrade }: Props) {
  if (currentTier >= requiredTier) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Lock size={32} color={Deep.red.accent} />
        <Text style={styles.title}>Premium Feature</Text>
        <Text style={styles.description}>
          No Mock/Demo Code enforcement is available for Tier {requiredTier}+ subscribers
        </Text>
        <Text style={styles.currentTier}>Your tier: {currentTier}</Text>
      </View>

      {onUpgrade && (
        <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
          <Zap size={18} color={Deep.ink} />
          <Text style={styles.upgradeText}>Upgrade to Tier {requiredTier}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Deep.ink,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Deep.red.base,
    padding: 24,
    alignItems: 'center',
    marginVertical: 16,
  },
  content: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Deep.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Deep.text.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
  currentTier: {
    fontSize: 12,
    color: Deep.cyan.line,
    fontWeight: '600',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Deep.lime.base,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  upgradeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Deep.ink,
  },
});
