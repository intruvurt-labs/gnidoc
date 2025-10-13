import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  scanAvailableProviders,
  getProviderSummary,
  AIProvider,
  AIModelConfig,
} from '@/lib/ai-providers';
import { CheckCircle, XCircle, Zap, DollarSign, Award, Eye, Mic, Video } from 'lucide-react-native';

export default function AIModelsScreen() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [summary, setSummary] = useState<ReturnType<typeof getProviderSummary> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const loadProviders = () => {
    const scanned = scanAvailableProviders();
    const sum = getProviderSummary();
    setProviders(scanned);
    setSummary(sum);
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadProviders();
    setTimeout(() => setRefreshing(false), 500);
  };

  const toggleProvider = (providerId: string) => {
    setExpandedProvider(prev => prev === providerId ? null : providerId);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'AI Models',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#00FFFF',
          headerTitleStyle: { fontWeight: 'bold' as const },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00FFFF" />
        }
      >
        {summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Provider Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.total}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#00FF00' }]}>{summary.available}</Text>
                <Text style={styles.summaryLabel}>Available</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#FF0000' }]}>{summary.unavailable}</Text>
                <Text style={styles.summaryLabel}>Unavailable</Text>
              </View>
            </View>
          </View>
        )}

        {providers.map(provider => (
          <View key={provider.id} style={styles.providerCard}>
            <TouchableOpacity
              style={styles.providerHeader}
              onPress={() => toggleProvider(provider.id)}
              activeOpacity={0.7}
            >
              <View style={styles.providerHeaderLeft}>
                {provider.available ? (
                  <CheckCircle size={24} color="#00FF00" />
                ) : (
                  <XCircle size={24} color="#FF0000" />
                )}
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerModels}>
                    {provider.models.length} model{provider.models.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <Text style={styles.expandIcon}>
                {expandedProvider === provider.id ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {expandedProvider === provider.id && (
              <View style={styles.modelsContainer}>
                {provider.models.map(model => (
                  <ModelCard key={model.id} model={model} available={provider.available} />
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Configure API keys in your .env file to enable more providers
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ModelCard({ model, available }: { model: AIModelConfig; available: boolean }) {
  return (
    <View style={[styles.modelCard, !available && styles.modelCardDisabled]}>
      <View style={styles.modelHeader}>
        <Text style={styles.modelName}>{model.name}</Text>
        <View style={styles.modelBadges}>
          {model.supportsVision && <Eye size={16} color="#00FFFF" />}
          {model.supportsAudio && <Mic size={16} color="#00FFFF" />}
          {model.supportsVideo && <Video size={16} color="#00FFFF" />}
        </View>
      </View>

      <View style={styles.modelStats}>
        <View style={styles.statItem}>
          <Award size={14} color="#CCFF00" />
          <Text style={styles.statText}>{model.qualityScore}%</Text>
        </View>
        <View style={styles.statItem}>
          <Zap size={14} color="#CCFF00" />
          <Text style={styles.statText}>{(model.avgResponseTime / 1000).toFixed(1)}s</Text>
        </View>
        <View style={styles.statItem}>
          <DollarSign size={14} color="#CCFF00" />
          <Text style={styles.statText}>${model.costPerRequest.toFixed(3)}</Text>
        </View>
      </View>

      <View style={styles.capabilitiesContainer}>
        {model.capabilities.slice(0, 4).map(cap => (
          <View key={cap} style={styles.capabilityBadge}>
            <Text style={styles.capabilityText}>{cap}</Text>
          </View>
        ))}
        {model.capabilities.length > 4 && (
          <View style={styles.capabilityBadge}>
            <Text style={styles.capabilityText}>+{model.capabilities.length - 4}</Text>
          </View>
        )}
      </View>

      {model.contextWindow && (
        <Text style={styles.contextWindow}>
          Context: {model.contextWindow.toLocaleString()} tokens
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#111',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00FFFF',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#00FFFF',
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
  },
  summaryItem: {
    alignItems: 'center' as const,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#00FFFF',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  providerCard: {
    backgroundColor: '#111',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden' as const,
  },
  providerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
  },
  providerHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  providerInfo: {
    marginLeft: 12,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#FFF',
  },
  providerModels: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 16,
    color: '#00FFFF',
  },
  modelsContainer: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  modelCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00FFFF',
  },
  modelCardDisabled: {
    opacity: 0.5,
    borderColor: '#333',
  },
  modelHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  modelName: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#00FFFF',
    flex: 1,
  },
  modelBadges: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  modelStats: {
    flexDirection: 'row' as const,
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#CCFF00',
    fontWeight: '600' as const,
  },
  capabilitiesContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 8,
  },
  capabilityBadge: {
    backgroundColor: '#00FFFF22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00FFFF',
  },
  capabilityText: {
    fontSize: 10,
    color: '#00FFFF',
    fontWeight: '600' as const,
  },
  contextWindow: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    alignItems: 'center' as const,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center' as const,
  },
});
