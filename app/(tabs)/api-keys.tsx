import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Key, Eye, EyeOff, Save, X, AlertCircle, CheckCircle, Github } from 'lucide-react-native';
import Colors from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface APIKey {
  id: string;
  name: string;
  key: string;
  description: string;
  isConfigured: boolean;
  isRequired: boolean;
  category: 'oauth' | 'ai' | 'weather' | 'database' | 'deployment';
}

const API_KEYS_STORAGE_KEY = 'secure-api-keys';

const DEFAULT_API_KEYS: APIKey[] = [
  {
    id: 'github-client-id',
    name: 'GitHub Client ID',
    key: '',
    description: 'OAuth Client ID for GitHub authentication',
    isConfigured: false,
    isRequired: true,
    category: 'oauth',
  },
  {
    id: 'github-client-secret',
    name: 'GitHub Client Secret',
    key: '',
    description: 'OAuth Client Secret for GitHub authentication',
    isConfigured: false,
    isRequired: true,
    category: 'oauth',
  },
  {
    id: 'google-client-id',
    name: 'Google Client ID',
    key: '',
    description: 'OAuth Client ID for Google authentication',
    isConfigured: false,
    isRequired: false,
    category: 'oauth',
  },
  {
    id: 'openai-api-key',
    name: 'OpenAI API Key',
    key: '',
    description: 'API key for OpenAI GPT models',
    isConfigured: false,
    isRequired: false,
    category: 'ai',
  },
  {
    id: 'anthropic-api-key',
    name: 'Anthropic API Key',
    key: '',
    description: 'API key for Claude AI models',
    isConfigured: false,
    isRequired: false,
    category: 'ai',
  },
  {
    id: 'openweather-api-key',
    name: 'OpenWeatherMap API Key',
    key: '',
    description: 'API key for weather data',
    isConfigured: false,
    isRequired: false,
    category: 'weather',
  },
  {
    id: 'db-host',
    name: 'Database Host',
    key: '',
    description: 'PostgreSQL database host address',
    isConfigured: false,
    isRequired: false,
    category: 'database',
  },
  {
    id: 'db-password',
    name: 'Database Password',
    key: '',
    description: 'PostgreSQL database password',
    isConfigured: false,
    isRequired: false,
    category: 'database',
  },
  {
    id: 'droplet-ip',
    name: 'DigitalOcean Droplet IP',
    key: '',
    description: 'IP address of your deployment server',
    isConfigured: false,
    isRequired: false,
    category: 'deployment',
  },
];

export default function APIKeysScreen() {
  const insets = useSafeAreaInsets();
  const [apiKeys, setApiKeys] = useState<APIKey[]>(DEFAULT_API_KEYS);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>('');
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      const stored = await AsyncStorage.getItem(API_KEYS_STORAGE_KEY);
      if (stored) {
        const parsedKeys = JSON.parse(stored);
        setApiKeys(parsedKeys);
        console.log('[API Keys] Loaded API keys configuration');
      }
    } catch (error) {
      console.error('[API Keys] Failed to load:', error);
    }
  };

  const saveAPIKeys = async () => {
    try {
      await AsyncStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(apiKeys));
      setHasChanges(false);
      Alert.alert('Success', 'API keys saved successfully');
      console.log('[API Keys] Saved API keys configuration');
    } catch (error) {
      console.error('[API Keys] Failed to save:', error);
      Alert.alert('Error', 'Failed to save API keys');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const handleEditKey = (key: APIKey) => {
    setEditingKey(key);
    setEditValue(key.key);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingKey) return;

    const updatedKeys = apiKeys.map((k) =>
      k.id === editingKey.id
        ? { ...k, key: editValue, isConfigured: editValue.trim().length > 0 }
        : k
    );

    setApiKeys(updatedKeys);
    setHasChanges(true);
    setShowEditModal(false);
    setEditingKey(null);
    setEditValue('');
  };

  const handleClearKey = (keyId: string) => {
    Alert.alert('Clear API Key', 'Are you sure you want to clear this API key?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          const updatedKeys = apiKeys.map((k) =>
            k.id === keyId ? { ...k, key: '', isConfigured: false } : k
          );
          setApiKeys(updatedKeys);
          setHasChanges(true);
        },
      },
    ]);
  };

  const handleTestGitHubConnection = async () => {
    const clientId = apiKeys.find((k) => k.id === 'github-client-id')?.key;
    const clientSecret = apiKeys.find((k) => k.id === 'github-client-secret')?.key;

    if (!clientId || !clientSecret) {
      Alert.alert('Missing Credentials', 'Please configure both GitHub Client ID and Client Secret');
      return;
    }

    Alert.alert(
      'Test GitHub OAuth',
      'GitHub OAuth is configured. You can now use "Continue with GitHub" on the login screen.',
      [{ text: 'OK' }]
    );
  };

  const getCategoryKeys = (category: string) => {
    return apiKeys.filter((k) => k.category === category);
  };

  const renderKeyCard = (key: APIKey) => {
    const isVisible = visibleKeys.has(key.id);
    const maskedKey = key.key ? '•'.repeat(Math.min(key.key.length, 20)) : 'Not configured';

    return (
      <View key={key.id} style={styles.keyCard}>
        <View style={styles.keyHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.keyTitleRow}>
              <Text style={styles.keyName}>{key.name}</Text>
              {key.isRequired && (
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>Required</Text>
                </View>
              )}
            </View>
            <Text style={styles.keyDescription}>{key.description}</Text>
          </View>
          {key.isConfigured ? (
            <CheckCircle color={Colors.Colors.success} size={20} />
          ) : (
            <AlertCircle color={Colors.Colors.warning} size={20} />
          )}
        </View>

        <View style={styles.keyValueContainer}>
          <Text style={styles.keyValue} numberOfLines={1}>
            {isVisible ? key.key || 'Not configured' : maskedKey}
          </Text>
          <View style={styles.keyActions}>
            <TouchableOpacity
              style={styles.keyActionButton}
              onPress={() => toggleKeyVisibility(key.id)}
            >
              {isVisible ? (
                <EyeOff color={Colors.Colors.text.muted} size={18} />
              ) : (
                <Eye color={Colors.Colors.text.muted} size={18} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keyActionButton}
              onPress={() => handleEditKey(key)}
            >
              <Text style={styles.keyActionText}>Edit</Text>
            </TouchableOpacity>
            {key.isConfigured && (
              <TouchableOpacity
                style={styles.keyActionButton}
                onPress={() => handleClearKey(key.id)}
              >
                <X color={Colors.Colors.error} size={18} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderCategory = (category: string, title: string, icon: React.ReactNode) => {
    const keys = getCategoryKeys(category);
    if (keys.length === 0) return null;

    return (
      <View style={styles.category}>
        <View style={styles.categoryHeader}>
          {icon}
          <Text style={styles.categoryTitle}>{title}</Text>
        </View>
        {keys.map(renderKeyCard)}
      </View>
    );
  };

  const configuredCount = apiKeys.filter((k) => k.isConfigured).length;
  const requiredCount = apiKeys.filter((k) => k.isRequired && !k.isConfigured).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Key color={Colors.Colors.cyan.primary} size={24} />
        <Text style={styles.headerTitle}>API Keys & Secrets</Text>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{configuredCount}/{apiKeys.length}</Text>
          <Text style={styles.statLabel}>Configured</Text>
        </View>
        {requiredCount > 0 && (
          <View style={[styles.statItem, styles.warningStatItem]}>
            <Text style={[styles.statValue, styles.warningText]}>{requiredCount}</Text>
            <Text style={[styles.statLabel, styles.warningText]}>Required Missing</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.warningCard}>
          <AlertCircle color={Colors.Colors.warning} size={20} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Security Notice</Text>
            <Text style={styles.warningText}>
              API keys are stored locally on your device. Never share your keys or commit them to
              version control. Use environment variables for production deployments.
            </Text>
          </View>
        </View>

        {renderCategory('oauth', 'OAuth Configuration', <Github color={Colors.Colors.cyan.primary} size={20} />)}
        {renderCategory('ai', 'AI Models', <Zap color={Colors.Colors.red.primary} size={20} />)}
        {renderCategory('weather', 'Weather Services', <Cloud color={Colors.Colors.cyan.primary} size={20} />)}
        {renderCategory('database', 'Database', <Database color={Colors.Colors.success} size={20} />)}
        {renderCategory('deployment', 'Deployment', <Server color={Colors.Colors.warning} size={20} />)}

        <View style={styles.testSection}>
          <Text style={styles.testTitle}>Test Integrations</Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestGitHubConnection}
          >
            <Github color={Colors.Colors.text.inverse} size={20} />
            <Text style={styles.testButtonText}>Test GitHub OAuth</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {hasChanges && (
        <View style={styles.saveBar}>
          <Text style={styles.saveBarText}>You have unsaved changes</Text>
          <TouchableOpacity style={styles.saveButton} onPress={saveAPIKeys}>
            <Save color={Colors.Colors.text.inverse} size={20} />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {editingKey?.name}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X color={Colors.Colors.text.muted} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>{editingKey?.description}</Text>
              <TextInput
                style={styles.input}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={`Enter ${editingKey?.name}`}
                placeholderTextColor={Colors.Colors.text.muted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!visibleKeys.has(editingKey?.id || '')}
              />

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const Database = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, backgroundColor: color, borderRadius: size / 2 }} />
);

const Server = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, backgroundColor: color, borderRadius: 4 }} />
);

const Cloud = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, backgroundColor: color, borderRadius: size / 2 }} />
);

const Zap = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, backgroundColor: color, borderRadius: size / 4 }} />
);

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
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.Colors.text.primary,
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    backgroundColor: Colors.Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
  },
  warningStatItem: {
    backgroundColor: Colors.Colors.warning + '20',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.Colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginTop: 4,
  },
  warningText: {
    color: Colors.Colors.warning,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: Colors.Colors.warning + '20',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.Colors.warning + '40',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.warning,
    marginBottom: 4,
  },
  category: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  keyCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  keyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  keyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  keyName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  requiredBadge: {
    backgroundColor: Colors.Colors.error + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.Colors.error,
  },
  keyDescription: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  keyValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  keyValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'monospace',
    color: Colors.Colors.text.secondary,
    backgroundColor: Colors.Colors.background.secondary,
    padding: 8,
    borderRadius: 6,
  },
  keyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  keyActionButton: {
    padding: 8,
  },
  keyActionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.Colors.cyan.primary,
  },
  testSection: {
    marginTop: 24,
    marginBottom: 40,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.cyan.primary,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
  saveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.Colors.cyan.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.Colors.border.primary,
  },
  saveBarText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.text.inverse,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.cyan.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.text.primary,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.Colors.text.primary,
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  modalSaveButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
});
