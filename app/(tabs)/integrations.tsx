import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Link, 
  Github, 
  Database, 
  Cloud, 
  Webhook, 
  Key, 
  CheckCircle, 
  XCircle,
  Settings,
  Plus
} from 'lucide-react-native';
import Colors from '@/constants/colors';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  status: 'active' | 'inactive' | 'error';
}

export default function IntegrationsScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'github',
      name: 'GitHub',
      description: 'Connect your GitHub repositories',
      icon: <Github color={Colors.Colors.text.primary} size={24} />,
      connected: true,
      status: 'active',
    },
    {
      id: 'database',
      name: 'Database',
      description: 'Connect to external databases',
      icon: <Database color={Colors.Colors.text.primary} size={24} />,
      connected: false,
      status: 'inactive',
    },
    {
      id: 'cloud',
      name: 'Cloud Storage',
      description: 'Integrate cloud storage providers',
      icon: <Cloud color={Colors.Colors.text.primary} size={24} />,
      connected: false,
      status: 'inactive',
    },
    {
      id: 'webhook',
      name: 'Webhooks',
      description: 'Configure webhook endpoints',
      icon: <Webhook color={Colors.Colors.text.primary} size={24} />,
      connected: true,
      status: 'active',
    },
    {
      id: 'api',
      name: 'API Keys',
      description: 'Manage API keys and tokens',
      icon: <Key color={Colors.Colors.text.primary} size={24} />,
      connected: true,
      status: 'active',
    },
  ]);

  const toggleIntegration = (id: string) => {
    setIntegrations(prev =>
      prev.map(integration =>
        integration.id === id
          ? {
              ...integration,
              connected: !integration.connected,
              status: !integration.connected ? 'active' : 'inactive',
            }
          : integration
      )
    );
  };

  const filteredIntegrations = integrations.filter(integration =>
    integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    integration.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle color={Colors.Colors.success} size={16} />;
      case 'error':
        return <XCircle color={Colors.Colors.error} size={16} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Link color={Colors.Colors.cyan.primary} size={24} />
        <Text style={styles.headerTitle}>Integrations</Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus color={Colors.Colors.cyan.primary} size={20} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search integrations..."
          placeholderTextColor={Colors.Colors.text.muted}
        />
      </View>

      {/* Integrations List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredIntegrations.map((integration) => (
          <View key={integration.id} style={styles.integrationCard}>
            <View style={styles.integrationHeader}>
              <View style={styles.integrationIcon}>{integration.icon}</View>
              <View style={styles.integrationInfo}>
                <View style={styles.integrationTitleRow}>
                  <Text style={styles.integrationName}>{integration.name}</Text>
                  {integration.connected && getStatusIcon(integration.status)}
                </View>
                <Text style={styles.integrationDescription}>
                  {integration.description}
                </Text>
              </View>
            </View>

            <View style={styles.integrationActions}>
              <Switch
                value={integration.connected}
                onValueChange={() => toggleIntegration(integration.id)}
                trackColor={{
                  false: Colors.Colors.border.muted,
                  true: Colors.Colors.cyan.primary,
                }}
                thumbColor={Colors.Colors.text.inverse}
              />
              {integration.connected && (
                <TouchableOpacity style={styles.settingsButton}>
                  <Settings color={Colors.Colors.text.muted} size={18} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {filteredIntegrations.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No integrations found</Text>
          </View>
        )}
      </ScrollView>
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
    color: Colors.Colors.cyanRed.primary,
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.Colors.text.primary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  integrationCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  integrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  integrationIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrationInfo: {
    flex: 1,
  },
  integrationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  integrationName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  integrationDescription: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  integrationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: Colors.Colors.text.muted,
    fontSize: 14,
  },
});
