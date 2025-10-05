import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plug,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  X,
  RefreshCw,
  ExternalLink,
  Zap,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  useIntegrations,
  Integration,
  IntegrationCategory,
} from '@/contexts/IntegrationsContext';
import * as Haptics from 'expo-haptics';



const CATEGORY_CONFIG: Record<
  IntegrationCategory | 'all',
  { label: string; icon: string; color: string }
> = {
  all: { label: 'All', icon: '🌐', color: Colors.Colors.cyan.primary },
  'creator-tools': { label: 'Creator Tools', icon: '🎨', color: Colors.Colors.red.primary },
  'web3-blockchain': { label: 'Web3 & Blockchain', icon: '⛓️', color: Colors.Colors.cyan.primary },
  'crypto-payments': { label: 'Crypto Payments', icon: '💰', color: Colors.Colors.warning },
  productivity: { label: 'Productivity', icon: '⚡', color: Colors.Colors.success },
  'b2b-saas': { label: 'B2B SaaS', icon: '🏢', color: Colors.Colors.cyanRed.primary },
  'b2c-commerce': { label: 'B2C Commerce', icon: '🛒', color: Colors.Colors.cyanOrange.primary },
  'ai-ml': { label: 'AI & ML', icon: '🤖', color: Colors.Colors.cyan.primary },
  analytics: { label: 'Analytics', icon: '📊', color: Colors.Colors.red.primary },
  communication: { label: 'Communication', icon: '💬', color: Colors.Colors.success },
  storage: { label: 'Storage', icon: '☁️', color: Colors.Colors.warning },
};

export default function IntegrationsScreen() {
  const insets = useSafeAreaInsets();
  const {
    filteredIntegrations,
    connectedIntegrations,
    selectedCategory,
    setSelectedCategory,
    loadIntegrations,
    connectIntegration,
    disconnectIntegration,
    syncIntegration,
  } = useIntegrations();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');

  React.useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const searchedIntegrations = useMemo(() => {
    if (!searchQuery.trim()) return filteredIntegrations;
    const query = searchQuery.toLowerCase();
    return filteredIntegrations.filter(
      (int) =>
        int.name.toLowerCase().includes(query) ||
        int.description.toLowerCase().includes(query) ||
        int.features.some((f) => f.toLowerCase().includes(query))
    );
  }, [filteredIntegrations, searchQuery]);

  const handleIntegrationPress = useCallback((integration: Integration) => {
    setSelectedIntegration(integration);
    setShowDetailModal(true);
  }, []);

  const handleConnect = useCallback(async () => {
    if (!selectedIntegration) return;

    if (!apiKey.trim()) {
      Alert.alert('Missing API Key', 'Please enter your API key');
      return;
    }

    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      await connectIntegration(
        selectedIntegration.id,
        { apiKey, apiSecret },
        { enabled: true }
      );

      setShowConnectModal(false);
      setShowDetailModal(false);
      setApiKey('');
      setApiSecret('');

      Alert.alert(
        'Connected!',
        `${selectedIntegration.name} has been successfully connected.`
      );
    } catch (error) {
      Alert.alert('Connection Failed', 'Failed to connect integration. Please try again.');
      console.error('[Integrations] Connection error:', error);
    }
  }, [selectedIntegration, apiKey, apiSecret, connectIntegration]);

  const handleDisconnect = useCallback(async () => {
    if (!selectedIntegration) return;

    Alert.alert(
      'Disconnect Integration',
      `Are you sure you want to disconnect ${selectedIntegration.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectIntegration(selectedIntegration.id);
              setShowDetailModal(false);
              Alert.alert('Disconnected', `${selectedIntegration.name} has been disconnected.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect integration.');
              console.error('[Integrations] Disconnect error:', error);
            }
          },
        },
      ]
    );
  }, [selectedIntegration, disconnectIntegration]);

  const handleSync = useCallback(async () => {
    if (!selectedIntegration) return;

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await syncIntegration(selectedIntegration.id);
      Alert.alert('Synced', `${selectedIntegration.name} has been synced successfully.`);
    } catch (error) {
      Alert.alert('Sync Failed', 'Failed to sync integration.');
      console.error('[Integrations] Sync error:', error);
    }
  }, [selectedIntegration, syncIntegration]);

  const renderCategoryChip = useCallback(
    (category: IntegrationCategory | 'all') => {
      const config = CATEGORY_CONFIG[category];
      const isSelected = selectedCategory === category;

      return (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryChip,
            isSelected && { backgroundColor: config.color + '20', borderColor: config.color },
          ]}
          onPress={() => setSelectedCategory(category)}
        >
          <Text style={styles.categoryIcon}>{config.icon}</Text>
          <Text
            style={[
              styles.categoryLabel,
              isSelected && { color: config.color, fontWeight: '700' },
            ]}
          >
            {config.label}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedCategory, setSelectedCategory]
  );

  const renderIntegrationCard = useCallback(
    (integration: Integration) => {
      const isConnected = integration.status === 'connected';

      return (
        <TouchableOpacity
          key={integration.id}
          style={[
            styles.integrationCard,
            isConnected && { borderColor: Colors.Colors.success, borderWidth: 2 },
          ]}
          onPress={() => handleIntegrationPress(integration)}
        >
          <View style={styles.integrationHeader}>
            <Text style={styles.integrationIcon}>{integration.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.integrationName}>{integration.name}</Text>
              <Text style={styles.integrationDescription} numberOfLines={2}>
                {integration.description}
              </Text>
            </View>
            {isConnected ? (
              <CheckCircle2 color={Colors.Colors.success} size={24} />
            ) : (
              <Circle color={Colors.Colors.text.muted} size={24} />
            )}
          </View>

          <View style={styles.integrationFeatures}>
            {integration.features.slice(0, 3).map((feature, index) => (
              <View key={index} style={styles.featureTag}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
            {integration.features.length > 3 && (
              <View style={styles.featureTag}>
                <Text style={styles.featureText}>+{integration.features.length - 3}</Text>
              </View>
            )}
          </View>

          <View style={styles.integrationFooter}>
            <View
              style={[
                styles.pricingBadge,
                {
                  backgroundColor:
                    integration.pricing === 'free'
                      ? Colors.Colors.success + '20'
                      : integration.pricing === 'paid'
                      ? Colors.Colors.warning + '20'
                      : Colors.Colors.cyan.primary + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.pricingText,
                  {
                    color:
                      integration.pricing === 'free'
                        ? Colors.Colors.success
                        : integration.pricing === 'paid'
                        ? Colors.Colors.warning
                        : Colors.Colors.cyan.primary,
                  },
                ]}
              >
                {integration.pricing.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.categoryBadge}>
              {CATEGORY_CONFIG[integration.category].label}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [handleIntegrationPress]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Plug color={Colors.Colors.cyan.primary} size={24} />
        <Text style={styles.headerTitle}>Integrations</Text>
        <TouchableOpacity onPress={loadIntegrations}>
          <RefreshCw color={Colors.Colors.text.muted} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{connectedIntegrations.length}</Text>
          <Text style={styles.statLabel}>Connected</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{filteredIntegrations.length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {Object.keys(CATEGORY_CONFIG).length - 1}
          </Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search color={Colors.Colors.text.muted} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search integrations..."
            placeholderTextColor={Colors.Colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color={Colors.Colors.text.muted} size={20} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {(Object.keys(CATEGORY_CONFIG) as (IntegrationCategory | 'all')[]).map(
          renderCategoryChip
        )}
      </ScrollView>

      <ScrollView style={styles.integrationsContainer} showsVerticalScrollIndicator={false}>
        {searchedIntegrations.length === 0 ? (
          <View style={styles.emptyState}>
            <Filter color={Colors.Colors.text.muted} size={64} />
            <Text style={styles.emptyStateTitle}>No Integrations Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'No integrations available in this category'}
            </Text>
          </View>
        ) : (
          <View style={styles.integrationsGrid}>
            {searchedIntegrations.map(renderIntegrationCard)}
          </View>
        )}
      </ScrollView>

      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedIntegration && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Text style={styles.modalIcon}>{selectedIntegration.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>{selectedIntegration.name}</Text>
                      <Text style={styles.modalSubtitle}>
                        {CATEGORY_CONFIG[selectedIntegration.category].label}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <X color={Colors.Colors.text.muted} size={24} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>{selectedIntegration.description}</Text>

                  <Text style={styles.sectionTitle}>Features</Text>
                  <View style={styles.featuresList}>
                    {selectedIntegration.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Zap color={Colors.Colors.cyan.primary} size={16} />
                        <Text style={styles.featureItemText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.sectionTitle}>Pricing</Text>
                  <View
                    style={[
                      styles.pricingCard,
                      {
                        backgroundColor:
                          selectedIntegration.pricing === 'free'
                            ? Colors.Colors.success + '10'
                            : selectedIntegration.pricing === 'paid'
                            ? Colors.Colors.warning + '10'
                            : Colors.Colors.cyan.primary + '10',
                      },
                    ]}
                  >
                    <Text style={styles.pricingCardText}>
                      {selectedIntegration.pricing === 'free'
                        ? 'Free to use'
                        : selectedIntegration.pricing === 'paid'
                        ? 'Paid service - subscription required'
                        : 'Free tier available with paid upgrades'}
                    </Text>
                  </View>

                  {selectedIntegration.status === 'connected' && (
                    <>
                      <Text style={styles.sectionTitle}>Connection Status</Text>
                      <View style={styles.statusCard}>
                        <CheckCircle2 color={Colors.Colors.success} size={20} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.statusCardTitle}>Connected</Text>
                          <Text style={styles.statusCardText}>
                            Last synced:{' '}
                            {selectedIntegration.lastSyncAt?.toLocaleString() || 'Never'}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  {selectedIntegration.status === 'connected' ? (
                    <>
                      <TouchableOpacity style={styles.syncButton} onPress={handleSync}>
                        <RefreshCw color={Colors.Colors.cyan.primary} size={20} />
                        <Text style={styles.syncButtonText}>Sync Now</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.disconnectButton}
                        onPress={handleDisconnect}
                      >
                        <Text style={styles.disconnectButtonText}>Disconnect</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.connectButton}
                      onPress={() => {
                        setShowDetailModal(false);
                        setShowConnectModal(true);
                      }}
                    >
                      <Plug color={Colors.Colors.text.inverse} size={20} />
                      <Text style={styles.connectButtonText}>Connect</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showConnectModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedIntegration && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Connect {selectedIntegration.name}</Text>
                  <TouchableOpacity onPress={() => setShowConnectModal(false)}>
                    <X color={Colors.Colors.text.muted} size={24} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <Text style={styles.inputLabel}>API Key *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your API key"
                    placeholderTextColor={Colors.Colors.text.muted}
                    value={apiKey}
                    onChangeText={setApiKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Text style={styles.inputLabel}>API Secret (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your API secret"
                    placeholderTextColor={Colors.Colors.text.muted}
                    value={apiSecret}
                    onChangeText={setApiSecret}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                  />

                  <View style={styles.helpCard}>
                    <ExternalLink color={Colors.Colors.cyan.primary} size={20} />
                    <Text style={styles.helpText}>
                      Need help finding your API credentials? Visit the{' '}
                      {selectedIntegration.name} documentation.
                    </Text>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowConnectModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
                    <Text style={styles.connectButtonText}>Connect</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.cyanOrange.primary,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.Colors.cyan.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.Colors.border.muted,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderColor: Colors.Colors.border.muted,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: Colors.Colors.text.primary,
    fontSize: 16,
  },
  categoriesContainer: {
    maxHeight: 60,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
  },
  integrationsContainer: {
    flex: 1,
    paddingTop: 12,
  },
  integrationsGrid: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  integrationCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  integrationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  integrationIcon: {
    fontSize: 32,
  },
  integrationName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  integrationDescription: {
    fontSize: 13,
    color: Colors.Colors.text.muted,
    lineHeight: 18,
  },
  integrationFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  featureTag: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 11,
    color: Colors.Colors.text.secondary,
    fontWeight: '600',
  },
  integrationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pricingBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pricingText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryBadge: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.cyanRed.primary,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.Colors.background.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIcon: {
    fontSize: 32,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.Colors.cyanOrange.primary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.Colors.text.muted,
    marginTop: 2,
  },
  modalBody: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.Colors.cyanRed.primary,
    marginTop: 16,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    lineHeight: 20,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureItemText: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    flex: 1,
  },
  pricingCard: {
    borderRadius: 8,
    padding: 12,
  },
  pricingCardText: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.success + '10',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  statusCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.success,
  },
  statusCardText: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.Colors.border.muted,
  },
  connectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.Colors.text.inverse,
  },
  syncButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.cyan.primary,
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.Colors.cyan.primary,
  },
  disconnectButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.Colors.error,
  },
  disconnectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.Colors.error,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.Colors.text.secondary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.Colors.text.primary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.cyan.primary + '10',
    borderRadius: 8,
    padding: 12,
    gap: 12,
    marginTop: 16,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: Colors.Colors.text.secondary,
    lineHeight: 18,
  },
});
