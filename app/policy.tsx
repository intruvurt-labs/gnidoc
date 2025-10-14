import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Shield, History, Flag, Coins, ArrowLeft } from 'lucide-react-native';
import { usePolicy } from '@/contexts/PolicyContext';
import { PolicyTierGate } from '@/components/PolicyTierGate';
import { PolicyConfigPanel } from '@/components/PolicyConfigPanel';
import { PolicyViolationCard } from '@/components/PolicyViolationCard';
import { Deep } from '@/constants/colors';

export default function PolicyScreen() {
  const insets = useSafeAreaInsets();
  const {
    settings,
    violations,
    isLoading,
    manualFlag,
    clearViolations,
    updateTier,
    togglePolicy,
    setMode,
    isFlagging,
  } = usePolicy();

  const [testCode, setTestCode] = useState('');
  const [flagNotes, setFlagNotes] = useState('');

  const handleManualFlag = async () => {
    if (!testCode.trim()) {
      Alert.alert('Error', 'Please enter code to flag');
      return;
    }

    try {
      const result = await manualFlag(testCode, flagNotes || undefined);
      Alert.alert(
        'Code Flagged',
        `${result.scanResult.offendingLines} violations found. ${result.creditsAwarded} Bix credits awarded.`,
        [{ text: 'OK', onPress: () => setTestCode('') }]
      );
    } catch {
      Alert.alert('Error', 'Failed to flag code');
    }
  };

  const handleClearHistory = () => {
    Alert.alert('Clear History', 'Are you sure you want to clear all violation records?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearViolations },
    ]);
  };

  const handleUpgrade = () => {
    router.push('/subscription');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.loadingText}>Loading policy settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, Platform.OS !== 'web' && { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Deep.cyan.line} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Shield size={28} color={Deep.lime.base} />
          <Text style={styles.headerTitle}>No Mock/Demo Policy</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.balanceCard}>
          <Coins size={24} color={Deep.lime.base} />
          <View style={styles.balanceContent}>
            <Text style={styles.balanceLabel}>Bix Balance</Text>
            <Text style={styles.balanceValue}>{settings.bixBalance}</Text>
          </View>
        </View>

        <PolicyTierGate
          currentTier={settings.tier}
          requiredTier={3}
          onUpgrade={handleUpgrade}
        />

        {settings.tier >= 3 && (
          <>
            <PolicyConfigPanel
              enabled={settings.enabled}
              mode={settings.mode}
              onToggle={togglePolicy}
              onModeChange={setMode}
            />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Flag size={20} color={Deep.cyan.line} />
                <Text style={styles.sectionTitle}>Manual Flag</Text>
              </View>
              <Text style={styles.sectionDescription}>
                Test code or manually flag violations for {settings.tier === 3 ? '2' : settings.tier === 4 ? '2.5' : '3'}× credit multiplier
              </Text>

              <TextInput
                style={styles.codeInput}
                placeholder="Paste code to check..."
                placeholderTextColor={Deep.text.muted}
                value={testCode}
                onChangeText={setTestCode}
                multiline
                numberOfLines={8}
              />

              <TextInput
                style={styles.notesInput}
                placeholder="Optional notes..."
                placeholderTextColor={Deep.text.muted}
                value={flagNotes}
                onChangeText={setFlagNotes}
              />

              <TouchableOpacity
                style={[styles.flagButton, isFlagging && styles.flagButtonDisabled]}
                onPress={handleManualFlag}
                disabled={isFlagging}
              >
                <Flag size={18} color={Deep.ink} />
                <Text style={styles.flagButtonText}>
                  {isFlagging ? 'Flagging...' : 'Flag Code'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <History size={20} color={Deep.cyan.line} />
                <Text style={styles.sectionTitle}>Violation History</Text>
                {violations.length > 0 && (
                  <TouchableOpacity onPress={handleClearHistory} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {violations.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No violations recorded</Text>
                </View>
              ) : (
                violations.map((violation) => (
                  <PolicyViolationCard
                    key={violation.id}
                    scanResult={violation.scanResult}
                    creditsAwarded={violation.creditsAwarded}
                    timestamp={violation.timestamp}
                  />
                ))
              )}
            </View>
          </>
        )}

        <View style={styles.tierDebug}>
          <Text style={styles.tierDebugText}>Current Tier: {settings.tier}</Text>
          <View style={styles.tierButtons}>
            {[1, 2, 3, 4, 5].map((tier) => (
              <TouchableOpacity
                key={tier}
                style={[
                  styles.tierButton,
                  settings.tier === tier && styles.tierButtonActive,
                ]}
                onPress={() => updateTier(tier as 1 | 2 | 3 | 4 | 5)}
              >
                <Text
                  style={[
                    styles.tierButtonText,
                    settings.tier === tier && styles.tierButtonTextActive,
                  ]}
                >
                  {tier}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Deep.ink,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Deep.cyan.dim,
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Deep.text.primary,
  },
  loadingText: {
    fontSize: 16,
    color: Deep.text.muted,
    textAlign: 'center',
    marginTop: 100,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(168, 241, 10, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Deep.lime.base,
    padding: 16,
    marginBottom: 16,
  },
  balanceContent: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 13,
    color: Deep.text.muted,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Deep.lime.base,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Deep.text.primary,
    flex: 1,
  },
  sectionDescription: {
    fontSize: 13,
    color: Deep.text.muted,
    marginBottom: 16,
  },
  codeInput: {
    backgroundColor: 'rgba(13, 110, 120, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Deep.cyan.dim,
    padding: 12,
    color: Deep.text.primary,
    fontFamily: 'monospace',
    fontSize: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  notesInput: {
    backgroundColor: 'rgba(13, 110, 120, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Deep.cyan.dim,
    padding: 12,
    color: Deep.text.primary,
    fontSize: 14,
    marginBottom: 12,
  },
  flagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Deep.red.accent,
    paddingVertical: 14,
    borderRadius: 8,
  },
  flagButtonDisabled: {
    opacity: 0.5,
  },
  flagButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Deep.ink,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Deep.red.base,
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Deep.text.primary,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Deep.text.muted,
    fontStyle: 'italic',
  },
  tierDebug: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(13, 110, 120, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Deep.cyan.dim,
  },
  tierDebugText: {
    fontSize: 12,
    color: Deep.text.muted,
    marginBottom: 12,
    textAlign: 'center',
  },
  tierButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tierButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(13, 110, 120, 0.2)',
    borderWidth: 1,
    borderColor: Deep.cyan.dim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierButtonActive: {
    backgroundColor: Deep.lime.base,
    borderColor: Deep.lime.base,
  },
  tierButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Deep.text.muted,
  },
  tierButtonTextActive: {
    color: Deep.ink,
  },
});
