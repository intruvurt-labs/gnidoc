import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  CheckCircle, 
  XCircle,
  RefreshCcw,
  Search
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useIntegrations } from '@/contexts/IntegrationsContext';

export default function IntegrationsScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [healthChecks, setHealthChecks] = useState<Record<string, { loading: boolean; result?: { ok: boolean; latencyMs: number; error?: string } }>>({});
  const {
    filteredIntegrations,
    connectedIntegrations,
    checkHealth,
    isLoading,
  } = useIntegrations();

  const handleHealthCheck = async (integrationId: string) => {
    setHealthChecks(prev => ({ ...prev, [integrationId]: { loading: true } }));
    try {
      const result = await checkHealth(integrationId);
      setHealthChecks(prev => ({ ...prev, [integrationId]: { loading: false, result } }));
    } catch (error) {
      setHealthChecks(prev => ({
        ...prev,
        [integrationId]: {
          loading: false,
          result: { ok: false, latencyMs: 0, error: String(error) },
        },
      }));
    }
  };

  const displayedIntegrations = filteredIntegrations.filter(integration =>
    integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    integration.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIndicator = (integrationId: string) => {
    const health = healthChecks[integrationId];
    const integration = displayedIntegrations.find(i => i.id === integrationId);
    const isConnected = integration?.status === 'connected';

    if (health?.loading) {
      return (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={Colors.Colors.cyan.primary} />
          <Text style={styles.statusText}>Checking...</Text>
        </View>
      );
    }

    if (health?.result) {
      return (
        <View style={styles.statusRow}>
          {health.result.ok ? (
            <CheckCircle color="#10B981" size={16} />
          ) : (
            <XCircle color="#EF4444" size={16} />
          )}
          <Text style={[styles.statusText, { color: health.result.ok ? '#10B981' : '#EF4444' }]}>
            {health.result.ok ? `${health.result.latencyMs}ms` : 'Error'}
          </Text>
        </View>
      );
    }

    if (isConnected) {
      return (
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, styles.statusConnected]} />
          <Text style={styles.statusTextConnected}>Connected</Text>
        </View>
      );
    }

    return (
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, styles.statusDisconnected]} />
        <Text style={styles.statusTextDisconnected}>Disconnected</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Integrations</Text>
        <View style={styles.headerStats}>
          <Text style={styles.statsText}>
            {connectedIntegrations.length} / {filteredIntegrations.length} Connected
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Search color={Colors.Colors.text.muted} size={18} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search integrations..."
          placeholderTextColor={Colors.Colors.text.muted}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.Colors.cyan.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {displayedIntegrations.map((integration) => (
            <View key={integration.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Text style={styles.iconEmoji}>{integration.icon}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{integration.name}</Text>
                  <Text style={styles.cardDescription}>{integration.description}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                {getStatusIndicator(integration.id)}
                <TouchableOpacity
                  style={styles.checkButton}
                  onPress={() => handleHealthCheck(integration.id)}
                  disabled={healthChecks[integration.id]?.loading}
                >
                  <RefreshCcw
                    color={Colors.Colors.cyan.primary}
                    size={16}
                  />
                  <Text style={styles.checkButtonText}>Check</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {displayedIntegrations.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No integrations found</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerStats: {
    marginTop: 4,
  },
  statsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconEmoji: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusConnected: {
    backgroundColor: '#10B981',
  },
  statusDisconnected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusTextConnected: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  statusTextDisconnected: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  checkButtonText: {
    color: Colors.Colors.cyan.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
  },
});
