import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  Dimensions,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import {
  X,
  Plus,
  FolderOpen,
  Play,
  Eye,
  Save,
  Download,
  Users,
  Settings,
  Zap,
  Code,
  Globe,
  Smartphone,
  Shield,
  Package,
  GitBranch,
  FileText,
  Palette,
  Upload,
  Database,
  Bell,
  DollarSign,
  HelpCircle,
  FileCode,
  Layers,
  Network,
  User,
  BarChart3,
  Trophy,
  Crown,
  Gift,
  Brain,
  Monitor,
} from 'lucide-react-native';
import { Image } from 'react-native';
import Colors from '@/constants/colors';
import { useSettings } from '@/contexts/SettingsContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface LogoMenuProps {
  onPress?: () => void;
  onLongPress?: () => void;
}

type Tier = 'free' | 'pro' | 'team' | 'enterprise';
type Orchestration = 2 | 3 | 4 | 6;

interface AdvancedSettings {
  project: {
    name: string;
    slug: string;
    type: 'react-native' | 'web' | 'api' | 'mobile';
    status: 'active' | 'paused' | 'completed';
    defaultBranch: 'main' | 'dev';
    autosave: { enabled: boolean; intervalSec: number };
  };
  generator: {
    models: { orchestration: Orchestration; mix: string[] };
    plannerDepth: 'low' | 'medium' | 'high';
    hallucinationGuard: 'strict' | 'balanced' | 'creative';
    maxTokens: number;
    costLimitUSD: number;
    validations: { typecheck: boolean; tests: boolean; lint: boolean; audit: boolean };
  };
  output: {
    framework: 'Expo' | 'Next.js' | 'Tauri';
    language: 'ts' | 'js';
    state: 'zustand' | 'redux' | 'jotai' | 'none';
    ui: 'paper' | 'nativewind' | 'none';
    auth: 'none' | 'supabase' | 'clerk' | 'custom';
    api: 'rest' | 'trpc' | 'graphql';
    testing: 'jest' | 'vitest' | 'none';
    ci: 'gha' | 'none';
    envSample: boolean;
  };
  editor: {
    formatOnSave: boolean;
    linter: 'warn' | 'error';
    theme: 'dark' | 'light' | 'system';
    fontSize: number;
  };
  security: {
    stripLogs: boolean;
    secretScan: boolean;
    telemetry: 'off' | 'minimal' | 'full';
  };
  performance: {
    imageOpt: boolean;
    split: boolean;
    minify: 'none' | 'basic' | 'aggressive';
  };
  billing: {
    tier: Tier;
    burstLimit: number;
    credits: number;
  };
}

const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  project: {
    name: 'Untitled',
    slug: 'untitled',
    type: 'react-native',
    status: 'active',
    defaultBranch: 'main',
    autosave: { enabled: true, intervalSec: 10 },
  },
  generator: {
    models: { orchestration: 4, mix: ['openai:gpt', 'gemini:1.5', 'claude:opus', 'local:coder'] },
    plannerDepth: 'medium',
    hallucinationGuard: 'balanced',
    maxTokens: 6000,
    costLimitUSD: 2,
    validations: { typecheck: true, tests: true, lint: true, audit: true },
  },
  output: {
    framework: 'Expo',
    language: 'ts',
    state: 'zustand',
    ui: 'nativewind',
    auth: 'none',
    api: 'rest',
    testing: 'jest',
    ci: 'gha',
    envSample: true,
  },
  editor: {
    formatOnSave: true,
    linter: 'warn',
    theme: 'system',
    fontSize: 14,
  },
  security: {
    stripLogs: true,
    secretScan: true,
    telemetry: 'minimal',
  },
  performance: {
    imageOpt: true,
    split: true,
    minify: 'basic',
  },
  billing: {
    tier: 'free',
    burstLimit: 10,
    credits: 50,
  },
};

const PROJECT_STORAGE_KEY = 'logo-menu:last-project-id';

export default function LogoMenu({ onPress, onLongPress }: LogoMenuProps) {
  const [showQuickMenu, setShowQuickMenu] = useState<boolean>(false);
  const [showAdvancedMenu, setShowAdvancedMenu] = useState<boolean>(false);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>(DEFAULT_ADVANCED_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const router = useRouter();
  const { settings, updateSettings } = useSettings();

  const withAuth = async () => {
    const token = await AsyncStorage.getItem('auth-token');
    if (!token) throw new Error('Authentication required');
    return token;
  };

  const getTrpc = async () => {
    const { trpcClient } = await import('@/lib/trpc');
    return trpcClient;
  };

  const createProject = async (projectType: 'react-native' | 'web' | 'api') => {
    await withAuth();
    const trpc = await getTrpc();
    const res = await trpc.projects.create.mutate({
      type: projectType,
      name: advancedSettings.project.name,
      slug: advancedSettings.project.slug,
      template: projectType,
      settings: advancedSettings,
    });
    if (!res?.projectId) throw new Error('Backend did not return projectId');
    await AsyncStorage.setItem(PROJECT_STORAGE_KEY, res.projectId);
    return res.projectId as string;
  };

  const initGitRepo = async (projectId: string) => {
    await withAuth();
    const trpc = await getTrpc();
    const res = await trpc.projects.git.init.mutate({ projectId });
    if (!res?.initialized) throw new Error(res?.message || 'Git init failed');
    return true;
  };

  const requestZipExport = async (projectId: string) => {
    await withAuth();
    const trpc = await getTrpc();
    const res = await trpc.projects.export.zip.mutate({ projectId });
    if (!res?.url && !res?.fileId) throw new Error('No export artifact returned');
    return res;
  };

  const getDownloadUrlForFile = async (fileId: string) => {
    const trpc = await getTrpc();
    const res = await trpc.files.getUrl.query({ fileId });
    if (!res?.url) throw new Error('Failed to resolve download URL');
    return res.url as string;
  };

  const downloadZip = async (url: string, filename: string) => {
    if (Platform.OS === 'web') {
      try {
        await WebBrowser.openBrowserAsync(url);
      } catch {
        if (typeof window !== 'undefined') {
          window.open(url, '_blank');
        }
      }
      return;
    }

    const target = FileSystem.cacheDirectory + filename;
    const { uri, status } = await FileSystem.downloadAsync(url, target);
    if (status !== 200) throw new Error('Download failed');

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType: 'application/zip', dialogTitle: filename });
    } else {
      Alert.alert('Downloaded', `Saved to: ${uri}`);
    }
  };

  const handleQuickPress = () => {
    if (onPress) onPress();
    setShowQuickMenu(true);
  };

  const handleLongPress = () => {
    if (onLongPress) onLongPress();
    setShowAdvancedMenu(true);
  };

  const handleNewProject = () => {
    setShowQuickMenu(false);
    Alert.alert('New Project', 'Choose project type:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'React Native',
        onPress: async () => {
          try {
            const id = await createProject('react-native');
            Alert.alert('Project created', `ID: ${id}`);
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to create project');
          }
        },
      },
      {
        text: 'Web App',
        onPress: async () => {
          try {
            const id = await createProject('web');
            Alert.alert('Project created', `ID: ${id}`);
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to create project');
          }
        },
      },
      {
        text: 'API Service',
        onPress: async () => {
          try {
            const id = await createProject('api');
            Alert.alert('Project created', `ID: ${id}`);
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to create project');
          }
        },
      },
    ]);
  };

  const handleGenerateApp = () => {
    setShowQuickMenu(false);
    router.push('/app-generator' as any);
  };

  const navigateToTab = (tabName: string) => {
    setShowQuickMenu(false);
    router.push(`/(tabs)/${tabName}` as any);
  };

  const handlePreview = () => {
    setShowQuickMenu(false);
    Alert.alert('Preview', 'Opening preview in web/native...');
  };

  const handleSaveExport = async () => {
    setShowQuickMenu(false);
    
    const projectId = await AsyncStorage.getItem(PROJECT_STORAGE_KEY);
    if (!projectId) {
      Alert.alert('No Project', 'Please create a project first.');
      return;
    }

    Alert.alert(
      'Save/Export',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Export as ZIP', 
          onPress: async () => {
            try {
              setIsLoading(true);
              setLoadingMessage('Preparing export...');
              const exportRes = await requestZipExport(projectId);
              
              let downloadUrl = exportRes.url;
              if (!downloadUrl && exportRes.fileId) {
                setLoadingMessage('Getting download URL...');
                downloadUrl = await getDownloadUrlForFile(exportRes.fileId);
              }
              
              if (downloadUrl) {
                setLoadingMessage('Downloading...');
                await downloadZip(downloadUrl, `${advancedSettings.project.slug}.zip`);
              }
              
              setIsLoading(false);
              Alert.alert('Success', 'Project exported successfully!');
            } catch (error: any) {
              setIsLoading(false);
              Alert.alert('Error', error.message || 'Failed to export project');
            }
          }
        },
        { 
          text: 'Initialize Git Repo', 
          onPress: async () => {
            try {
              setIsLoading(true);
              setLoadingMessage('Initializing Git repository...');
              await initGitRepo(projectId);
              setIsLoading(false);
              Alert.alert('Success', 'Git repository initialized!');
            } catch (error: any) {
              setIsLoading(false);
              Alert.alert('Error', error.message || 'Failed to initialize Git');
            }
          }
        },
        { text: 'Save to Cloud', onPress: () => Alert.alert('Coming Soon', 'Cloud save feature coming soon!') },
      ]
    );
  };

  const handleSwitchWorkspace = () => {
    setShowQuickMenu(false);
    Alert.alert(
      'Switch Workspace',
      'Choose workspace:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Personal', onPress: () => console.log('Switched to Personal') },
        { text: 'Team', onPress: () => console.log('Switched to Team') },
      ]
    );
  };

  const handleOpenRecent = () => {
    setShowQuickMenu(false);
    Alert.alert('Open Recent', 'No recent projects found.');
  };

  const updateAdvancedSetting = (path: string, value: any) => {
    setAdvancedSettings(prev => {
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const saveAdvancedSettings = async () => {
    try {
      await updateSettings({
        fontSize: advancedSettings.editor.fontSize,
        autoSave: advancedSettings.project.autosave.enabled,
      });
      setShowAdvancedMenu(false);
      Alert.alert('Success', 'Advanced settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleQuickPress}
        onLongPress={handleLongPress}
        style={styles.logoButton}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        <View style={styles.logoCircle}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.Colors.cyan.primary} />
          ) : (
            <Image
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/3m84a7w7p2uwori7ld5pn' }}
              style={styles.logoSymbol}
              resizeMode="contain"
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Loading Modal */}
      <Modal
        visible={isLoading}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.Colors.cyan.primary} />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>

      {/* Quick Menu Modal */}
      <Modal
        visible={showQuickMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowQuickMenu(false)}
        >
          <View style={styles.quickMenu}>
            <View style={styles.menuHeader}>
              <Zap color={Colors.Colors.cyanRed.primary} size={20} />
              <Text style={styles.menuTitle}>Quick Actions</Text>
              <TouchableOpacity onPress={() => setShowQuickMenu(false)}>
                <X color={Colors.Colors.text.muted} size={20} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={handleNewProject}>
              <Plus color={Colors.Colors.cyan.primary} size={20} />
              <Text style={styles.menuItemText}>New Project</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleOpenRecent}>
              <FolderOpen color={Colors.Colors.cyanOrange.primary} size={20} />
              <Text style={styles.menuItemText}>Open Recent</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.primaryMenuItem]} onPress={handleGenerateApp}>
              <Play color={Colors.Colors.text.inverse} size={20} />
              <Text style={[styles.menuItemText, styles.primaryMenuItemText]}>Run → Generate App</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handlePreview}>
              <Eye color={Colors.Colors.success} size={20} />
              <Text style={styles.menuItemText}>Preview</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleSaveExport}>
              <Save color={Colors.Colors.warning} size={20} />
              <Text style={styles.menuItemText}>Save/Export</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleSwitchWorkspace}>
              <Users color={Colors.Colors.red.primary} size={20} />
              <Text style={styles.menuItemText}>Switch Workspace</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />
            <Text style={styles.menuSectionTitle}>Navigation</Text>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateToTab('orchestration')}>
              <Network color={Colors.Colors.cyan.primary} size={20} />
              <Text style={styles.menuItemText}>Orchestrate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateToTab('preferences')}>
              <User color={Colors.Colors.cyan.primary} size={20} />
              <Text style={styles.menuItemText}>Preferences</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateToTab('security')}>
              <Shield color={Colors.Colors.cyan.primary} size={20} />
              <Text style={styles.menuItemText}>Security</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateToTab('dashboard')}>
              <BarChart3 color={Colors.Colors.cyan.primary} size={20} />
              <Text style={styles.menuItemText}>Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateToTab('leaderboard')}>
              <Trophy color={Colors.Colors.cyan.primary} size={20} />
              <Text style={styles.menuItemText}>Leaderboard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateToTab('subscription')}>
              <Crown color={Colors.Colors.cyan.primary} size={20} />
              <Text style={styles.menuItemText}>Subscription</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateToTab('referrals')}>
              <Gift color={Colors.Colors.cyan.primary} size={20} />
              <Text style={styles.menuItemText}>Referrals</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.advancedButton}
              onPress={() => {
                setShowQuickMenu(false);
                setShowAdvancedMenu(true);
              }}
            >
              <Settings color={Colors.Colors.text.muted} size={16} />
              <Text style={styles.advancedButtonText}>Advanced Settings</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Advanced Settings Modal */}
      <Modal
        visible={showAdvancedMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdvancedMenu(false)}
      >
        <View style={styles.advancedModalContainer}>
          <View style={styles.advancedMenu}>
            <View style={styles.advancedHeader}>
              <Settings color={Colors.Colors.cyanRed.primary} size={24} />
              <Text style={styles.advancedTitle}>Advanced Settings</Text>
              <TouchableOpacity onPress={() => setShowAdvancedMenu(false)}>
                <X color={Colors.Colors.text.muted} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.advancedContent} showsVerticalScrollIndicator={false}>
              {/* Project Settings */}
              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>
                  <FileCode size={16} color={Colors.Colors.cyan.primary} /> Project
                </Text>
                
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Project Name</Text>
                  <TextInput
                    style={styles.settingInput}
                    value={advancedSettings.project.name}
                    onChangeText={(val) => updateAdvancedSetting('project.name', val)}
                    placeholder="Enter project name"
                    placeholderTextColor={Colors.Colors.text.muted}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Auto-save</Text>
                  <Switch
                    value={advancedSettings.project.autosave.enabled}
                    onValueChange={(val) => updateAdvancedSetting('project.autosave.enabled', val)}
                    trackColor={{ false: Colors.Colors.border.muted, true: Colors.Colors.cyan.primary }}
                  />
                </View>
              </View>

              {/* Generator Settings */}
              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>
                  <Zap size={16} color={Colors.Colors.cyanOrange.primary} /> Generator / Models
                </Text>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Orchestration Mode</Text>
                  <View style={styles.segmentedControl}>
                    {([2, 3, 4, 6] as const).map((num) => (
                      <TouchableOpacity
                        key={`orchestration-mode-${num}`}
                        style={[
                          styles.segmentButton,
                          advancedSettings.generator.models.orchestration === num && styles.segmentButtonActive,
                        ]}
                        onPress={() => updateAdvancedSetting('generator.models.orchestration', num)}
                      >
                        <Text
                          style={[
                            styles.segmentButtonText,
                            advancedSettings.generator.models.orchestration === num && styles.segmentButtonTextActive,
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Planner Depth</Text>
                  <View style={styles.segmentedControl}>
                    {(['low', 'medium', 'high'] as const).map((depth) => (
                      <TouchableOpacity
                        key={`planner-depth-${depth}`}
                        style={[
                          styles.segmentButton,
                          advancedSettings.generator.plannerDepth === depth && styles.segmentButtonActive,
                        ]}
                        onPress={() => updateAdvancedSetting('generator.plannerDepth', depth)}
                      >
                        <Text
                          style={[
                            styles.segmentButtonText,
                            advancedSettings.generator.plannerDepth === depth && styles.segmentButtonTextActive,
                          ]}
                        >
                          {depth}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Max Tokens</Text>
                  <TextInput
                    style={styles.settingInput}
                    value={advancedSettings.generator.maxTokens.toString()}
                    onChangeText={(val) => updateAdvancedSetting('generator.maxTokens', parseInt(val) || 0)}
                    keyboardType="numeric"
                    placeholder="6000"
                    placeholderTextColor={Colors.Colors.text.muted}
                  />
                </View>
              </View>

              {/* Output Settings */}
              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>
                  <Code size={16} color={Colors.Colors.success} /> Output / Scaffolding
                </Text>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Framework</Text>
                  <View style={styles.segmentedControl}>
                    {(['Expo', 'Next.js', 'Tauri'] as const).map((fw) => (
                      <TouchableOpacity
                        key={`output-framework-${fw}`}
                        style={[
                          styles.segmentButton,
                          advancedSettings.output.framework === fw && styles.segmentButtonActive,
                        ]}
                        onPress={() => updateAdvancedSetting('output.framework', fw)}
                      >
                        <Text
                          style={[
                            styles.segmentButtonText,
                            advancedSettings.output.framework === fw && styles.segmentButtonTextActive,
                          ]}
                        >
                          {fw}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Language</Text>
                  <View style={styles.segmentedControl}>
                    {(['ts', 'js'] as const).map((lang) => (
                      <TouchableOpacity
                        key={`output-language-${lang}`}
                        style={[
                          styles.segmentButton,
                          advancedSettings.output.language === lang && styles.segmentButtonActive,
                        ]}
                        onPress={() => updateAdvancedSetting('output.language', lang)}
                      >
                        <Text
                          style={[
                            styles.segmentButtonText,
                            advancedSettings.output.language === lang && styles.segmentButtonTextActive,
                          ]}
                        >
                          {lang.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Editor Settings */}
              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>
                  <FileText size={16} color={Colors.Colors.warning} /> IDE / Editor
                </Text>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Format on Save</Text>
                  <Switch
                    value={advancedSettings.editor.formatOnSave}
                    onValueChange={(val) => updateAdvancedSetting('editor.formatOnSave', val)}
                    trackColor={{ false: Colors.Colors.border.muted, true: Colors.Colors.cyan.primary }}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Font Size</Text>
                  <TextInput
                    style={styles.settingInput}
                    value={advancedSettings.editor.fontSize.toString()}
                    onChangeText={(val) => updateAdvancedSetting('editor.fontSize', parseInt(val) || 14)}
                    keyboardType="numeric"
                    placeholder="14"
                    placeholderTextColor={Colors.Colors.text.muted}
                  />
                </View>
              </View>

              {/* Security Settings */}
              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>
                  <Shield size={16} color={Colors.Colors.error} /> Security & Privacy
                </Text>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Strip console.logs</Text>
                  <Switch
                    value={advancedSettings.security.stripLogs}
                    onValueChange={(val) => updateAdvancedSetting('security.stripLogs', val)}
                    trackColor={{ false: Colors.Colors.border.muted, true: Colors.Colors.cyan.primary }}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Secret Scan</Text>
                  <Switch
                    value={advancedSettings.security.secretScan}
                    onValueChange={(val) => updateAdvancedSetting('security.secretScan', val)}
                    trackColor={{ false: Colors.Colors.border.muted, true: Colors.Colors.cyan.primary }}
                  />
                </View>
              </View>

              {/* Performance Settings */}
              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>
                  <Zap size={16} color={Colors.Colors.cyanRed.primary} /> Performance
                </Text>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Image Optimization</Text>
                  <Switch
                    value={advancedSettings.performance.imageOpt}
                    onValueChange={(val) => updateAdvancedSetting('performance.imageOpt', val)}
                    trackColor={{ false: Colors.Colors.border.muted, true: Colors.Colors.cyan.primary }}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Bundle Split</Text>
                  <Switch
                    value={advancedSettings.performance.split}
                    onValueChange={(val) => updateAdvancedSetting('performance.split', val)}
                    trackColor={{ false: Colors.Colors.border.muted, true: Colors.Colors.cyan.primary }}
                  />
                </View>
              </View>

              {/* Billing Info */}
              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>
                  <DollarSign size={16} color={Colors.Colors.success} /> Billing & Plan
                </Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tier</Text>
                  <Text style={styles.infoValue}>{advancedSettings.billing.tier.toUpperCase()}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Credits Remaining</Text>
                  <Text style={styles.infoValue}>{advancedSettings.billing.credits}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.advancedFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAdvancedMenu(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveAdvancedSettings}
              >
                <Save color={Colors.Colors.text.inverse} size={16} />
                <Text style={styles.saveButtonText}>Save Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  logoButton: {
    padding: 2,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSymbol: {
    width: 48,
    height: 48,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  quickMenu: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 3,
    borderColor: Colors.Colors.cyan.primary,
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: Colors.Colors.cyan.primary,
  },
  menuTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyanRed.primary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.Colors.background.secondary,
    gap: 12,
  },
  primaryMenuItem: {
    backgroundColor: Colors.Colors.cyan.primary,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  primaryMenuItemText: {
    color: Colors.Colors.text.inverse,
  },
  advancedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.Colors.border.muted,
    paddingTop: 16,
  },
  advancedButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.muted,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.Colors.border.muted,
    marginVertical: 12,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.Colors.text.muted,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  advancedModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  advancedMenu: {
    backgroundColor: Colors.Colors.background.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
    gap: 12,
  },
  advancedTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyanRed.primary,
  },
  advancedContent: {
    flex: 1,
    padding: 20,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyanRed.primary,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
    flex: 1,
  },
  settingInput: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.Colors.text.primary,
    fontSize: 14,
    minWidth: 100,
    textAlign: 'right' as const,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  segmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: Colors.Colors.cyan.primary,
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.muted,
    textTransform: 'capitalize' as const,
  },
  segmentButtonTextActive: {
    color: Colors.Colors.text.inverse,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
  },
  advancedFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.Colors.border.muted,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.Colors.cyan.primary,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    textAlign: 'center' as const,
  },
});
