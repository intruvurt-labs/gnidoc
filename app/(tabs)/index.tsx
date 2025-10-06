import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Sparkles,
  Code,
  Play,
  Download,
  Eye,
  Settings,
  X,
  CheckCircle,
  AlertCircle,
  Loader,
  FileText,
  Package,
  Zap,
  Layers,
  Menu,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppBuilder, AppGenerationConfig } from '@/contexts/AppBuilderContext';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function AppGeneratorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    generatedApps,
    currentApp,
    isGenerating,
    generationProgress,
    generateApp,
    setCurrentApp,
  } = useAppBuilder();

  const [prompt, setPrompt] = useState<string>('');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showQuickMenu, setShowQuickMenu] = useState<boolean>(false);

  const [config, setConfig] = useState<AppGenerationConfig>({
    useTypeScript: true,
    includeTests: true,
    includeDocumentation: true,
    styleFramework: 'stylesheet',
    stateManagement: 'context',
    routing: 'expo-router',
    aiModel: 'dual-claude-gemini',
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Error', 'Please enter a description of the app you want to build');
      return;
    }

    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      console.log('[AppGenerator] Starting app generation...');
      const app = await generateApp(prompt, config);
      
      Alert.alert(
        '✓ App Generated!',
        `"${app.name}" has been generated successfully!\n\n${app.files.length} files created\n${app.dependencies.length} dependencies\n\nStatus: ${app.status}`,
        [
          { text: 'View Code', onPress: () => setShowPreview(true) },
          { text: 'OK' },
        ]
      );
      
      setPrompt('');
    } catch (error) {
      Alert.alert(
        'Generation Failed',
        error instanceof Error ? error.message : 'Failed to generate app'
      );
      console.error('[AppGenerator] Generation error:', error);
    }
  };

  const quickMenuActions = [
    { id: 'terminal', title: 'Terminal', icon: '💻', route: '/terminal' },
    { id: 'analysis', title: 'Analysis', icon: '📊', route: '/analysis' },
    { id: 'database', title: 'Database', icon: '🗄️', route: '/database' },
    { id: 'integrations', title: 'Integrations', icon: '🔌', route: '/integrations' },
    { id: 'research', title: 'Research', icon: '🔍', route: '/research' },
    { id: 'deploy', title: 'Deploy', icon: '🚀', route: '/deploy' },
  ];

  const renderConfigOption = (
    label: string,
    value: boolean,
    onToggle: () => void
  ) => (
    <TouchableOpacity style={styles.configOption} onPress={onToggle}>
      <Text style={styles.configLabel}>{label}</Text>
      <View style={[styles.configToggle, value && styles.configToggleActive]}>
        {value && <CheckCircle color={Colors.Colors.text.inverse} size={16} />}
      </View>
    </TouchableOpacity>
  );

  const renderSelectOption = (
    label: string,
    options: string[],
    value: string,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.selectOption}>
      <Text style={styles.configLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.selectButton,
              value === option && styles.selectButtonActive,
            ]}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[
                styles.selectButtonText,
                value === option && styles.selectButtonTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowQuickMenu(true)}
        >
          <Menu color={Colors.Colors.cyan.primary} size={24} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>AI App Generator</Text>
          <Text style={styles.headerSubtitle}>Production-Ready Apps in Seconds</Text>
        </View>
        <TouchableOpacity
          style={styles.configButton}
          onPress={() => setShowConfig(true)}
        >
          <Settings color={Colors.Colors.cyan.primary} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Sparkles color={Colors.Colors.cyan.primary} size={48} />
          </View>
          <Text style={styles.heroTitle}>Build Complete Apps with AI</Text>
          <Text style={styles.heroDescription}>
            Describe your app idea and watch as our dual-model AI (Claude + Gemini)
            generates production-ready code with full compilation and live preview
          </Text>
        </View>

        <View style={styles.promptSection}>
          <Text style={styles.sectionTitle}>What do you want to build?</Text>
          <TextInput
            style={styles.promptInput}
            placeholder="E.g., A fitness tracking app with workout plans, progress charts, and social features..."
            placeholderTextColor={Colors.Colors.text.muted}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <View style={styles.configSummary}>
            <View style={styles.configBadge}>
              <Layers color={Colors.Colors.cyan.primary} size={14} />
              <Text style={styles.configBadgeText}>
                {config.aiModel === 'dual-claude-gemini' ? 'Dual Model (Claude+Gemini)' :
                 config.aiModel === 'tri-model' ? 'Tri-Model' :
                 config.aiModel === 'quad-model' ? 'Quad-Model' :
                 '4-Model Orchestration'}
              </Text>
            </View>
            <View style={styles.configBadge}>
              <Code color={Colors.Colors.success} size={14} />
              <Text style={styles.configBadgeText}>
                {config.useTypeScript ? 'TypeScript' : 'JavaScript'}
              </Text>
            </View>
            <View style={styles.configBadge}>
              <Package color={Colors.Colors.warning} size={14} />
              <Text style={styles.configBadgeText}>{config.routing}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader color={Colors.Colors.text.inverse} size={24} />
                <Text style={styles.generateButtonText}>
                  Generating... {Math.round(generationProgress)}%
                </Text>
              </>
            ) : (
              <>
                <Sparkles color={Colors.Colors.text.inverse} size={24} />
                <Text style={styles.generateButtonText}>Generate App</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {isGenerating && currentApp && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${generationProgress}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentApp.buildLogs.length > 0
                ? currentApp.buildLogs[currentApp.buildLogs.length - 1].message
                : 'Initializing...'}
            </Text>
          </View>
        )}

        {generatedApps.length > 0 && (
          <View style={styles.appsSection}>
            <Text style={styles.sectionTitle}>Generated Apps</Text>
            {generatedApps.map(app => (
              <TouchableOpacity
                key={app.id}
                style={styles.appCard}
                onPress={() => {
                  setCurrentApp(app);
                  setShowPreview(true);
                }}
              >
                <View style={styles.appCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appCardTitle}>{app.name}</Text>
                    <Text style={styles.appCardDescription} numberOfLines={2}>
                      {app.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.appStatusBadge,
                      { backgroundColor: getStatusColor(app.status) },
                    ]}
                  >
                    <Text style={styles.appStatusText}>{app.status}</Text>
                  </View>
                </View>
                <View style={styles.appCardStats}>
                  <View style={styles.appStat}>
                    <FileText color={Colors.Colors.text.muted} size={14} />
                    <Text style={styles.appStatText}>{app.files.length} files</Text>
                  </View>
                  <View style={styles.appStat}>
                    <Package color={Colors.Colors.text.muted} size={14} />
                    <Text style={styles.appStatText}>
                      {app.dependencies.length} deps
                    </Text>
                  </View>
                  <View style={styles.appStat}>
                    <AlertCircle color={Colors.Colors.text.muted} size={14} />
                    <Text style={styles.appStatText}>{app.errors.length} issues</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureCard}>
              <Zap color={Colors.Colors.cyan.primary} size={32} />
              <Text style={styles.featureTitle}>Dual-Model AI</Text>
              <Text style={styles.featureDescription}>
                Claude + Gemini working together for superior code quality
              </Text>
            </View>
            <View style={styles.featureCard}>
              <Code color={Colors.Colors.success} size={32} />
              <Text style={styles.featureTitle}>Production Ready</Text>
              <Text style={styles.featureDescription}>
                Complete, error-free code with proper architecture
              </Text>
            </View>
            <View style={styles.featureCard}>
              <Play color={Colors.Colors.warning} size={32} />
              <Text style={styles.featureTitle}>Live Preview</Text>
              <Text style={styles.featureDescription}>
                Instant compilation and preview of generated apps
              </Text>
            </View>
            <View style={styles.featureCard}>
              <Eye color={Colors.Colors.red.primary} size={32} />
              <Text style={styles.featureTitle}>Full IDE</Text>
              <Text style={styles.featureDescription}>
                Edit, debug, and deploy directly from the app
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showQuickMenu} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.quickMenuContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick Access</Text>
              <TouchableOpacity onPress={() => setShowQuickMenu(false)}>
                <X color={Colors.Colors.text.muted} size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.quickMenuGrid}>
              {quickMenuActions.map(action => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.quickMenuItem}
                  onPress={() => {
                    setShowQuickMenu(false);
                    router.push(action.route as any);
                  }}
                >
                  <Text style={styles.quickMenuIcon}>{action.icon}</Text>
                  <Text style={styles.quickMenuText}>{action.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showConfig} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generation Config</Text>
              <TouchableOpacity onPress={() => setShowConfig(false)}>
                <X color={Colors.Colors.text.muted} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.configList}>
              {renderConfigOption('TypeScript', config.useTypeScript, () =>
                setConfig({ ...config, useTypeScript: !config.useTypeScript })
              )}
              {renderConfigOption('Include Tests', config.includeTests, () =>
                setConfig({ ...config, includeTests: !config.includeTests })
              )}
              {renderConfigOption(
                'Include Documentation',
                config.includeDocumentation,
                () =>
                  setConfig({
                    ...config,
                    includeDocumentation: !config.includeDocumentation,
                  })
              )}

              {renderSelectOption(
                'AI Model Orchestration',
                ['dual-claude-gemini', 'tri-model', 'quad-model', 'orchestrated'],
                config.aiModel,
                value =>
                  setConfig({ ...config, aiModel: value as AppGenerationConfig['aiModel'] })
              )}

              {renderSelectOption(
                'Style Framework',
                ['stylesheet', 'styled-components', 'tailwind'],
                config.styleFramework,
                value =>
                  setConfig({
                    ...config,
                    styleFramework: value as AppGenerationConfig['styleFramework'],
                  })
              )}

              {renderSelectOption(
                'State Management',
                ['context', 'redux', 'zustand', 'none'],
                config.stateManagement,
                value =>
                  setConfig({
                    ...config,
                    stateManagement: value as AppGenerationConfig['stateManagement'],
                  })
              )}

              {renderSelectOption(
                'Routing',
                ['expo-router', 'react-navigation', 'none'],
                config.routing,
                value =>
                  setConfig({ ...config, routing: value as AppGenerationConfig['routing'] })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPreview} animationType="slide">
        <View style={[styles.previewContainer, { paddingTop: insets.top }]}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>{currentApp?.name}</Text>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <X color={Colors.Colors.text.primary} size={24} />
            </TouchableOpacity>
          </View>

          {currentApp && (
            <>
              <View style={styles.previewToolbar}>
                <TouchableOpacity style={styles.previewButton}>
                  <Play color={Colors.Colors.success} size={18} />
                  <Text style={styles.previewButtonText}>Run</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.previewButton}>
                  <Download color={Colors.Colors.cyan.primary} size={18} />
                  <Text style={styles.previewButtonText}>Export</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.previewButton}>
                  <Code color={Colors.Colors.warning} size={18} />
                  <Text style={styles.previewButtonText}>
                    {currentApp.files.length} Files
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.fileList}>
                {currentApp.files.map(file => (
                  <TouchableOpacity
                    key={file.id}
                    style={[
                      styles.fileItem,
                      selectedFile === file.id && styles.fileItemActive,
                    ]}
                    onPress={() => setSelectedFile(file.id)}
                  >
                    <FileText color={Colors.Colors.cyan.primary} size={16} />
                    <Text style={styles.fileName}>{file.path}</Text>
                    <Text style={styles.fileSize}>{formatBytes(file.size)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {selectedFile && (
                <View style={styles.codePreview}>
                  <ScrollView>
                    <Text style={styles.codeText}>
                      {currentApp.files.find(f => f.id === selectedFile)?.content}
                    </Text>
                  </ScrollView>
                </View>
              )}

              {currentApp.errors.length > 0 && (
                <View style={styles.errorsSection}>
                  <Text style={styles.errorsTitle}>
                    {currentApp.errors.length} Issues Found
                  </Text>
                  {currentApp.errors.slice(0, 5).map(error => (
                    <View key={error.id} style={styles.errorItem}>
                      <AlertCircle
                        color={
                          error.severity === 'error'
                            ? Colors.Colors.error
                            : Colors.Colors.warning
                        }
                        size={16}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.errorMessage}>{error.message}</Text>
                        <Text style={styles.errorLocation}>
                          {error.file}:{error.line}:{error.column}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'ready':
      return Colors.Colors.success;
    case 'generating':
    case 'compiling':
      return Colors.Colors.warning;
    case 'error':
      return Colors.Colors.error;
    default:
      return Colors.Colors.text.muted;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
    gap: 12,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyanRed.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.Colors.cyanOrange.primary,
    marginTop: 2,
  },
  configButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.Colors.cyan.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 16,
    color: Colors.Colors.cyanOrange.primary,
    textAlign: 'center',
    lineHeight: 24,
  },
  promptSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyanRed.primary,
    marginBottom: 16,
  },
  promptInput: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    color: Colors.Colors.orange.primary,
    fontSize: 16,
    minHeight: 150,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    marginBottom: 16,
  },
  configSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  configBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  configBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.cyanOrange.primary,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.cyan.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.text.inverse,
  },
  progressSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.Colors.cyan.primary,
  },
  progressText: {
    fontSize: 14,
    color: Colors.Colors.cyanOrange.primary,
    textAlign: 'center',
  },
  appsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  appCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  appCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  appCardTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 4,
  },
  appCardDescription: {
    fontSize: 14,
    color: Colors.Colors.cyanOrange.primary,
  },
  appStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appStatusText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.Colors.text.inverse,
    textTransform: 'uppercase' as const,
  },
  appCardStats: {
    flexDirection: 'row',
    gap: 16,
  },
  appStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appStatText: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (width - 52) / 2,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyanRed.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: Colors.Colors.cyanOrange.primary,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  quickMenuContent: {
    backgroundColor: Colors.Colors.background.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  quickMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  quickMenuItem: {
    width: (width - 64) / 3,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  quickMenuIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickMenuText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    textAlign: 'center',
  },
  modalContent: {
    backgroundColor: Colors.Colors.background.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
  },
  configList: {
    padding: 20,
  },
  configOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  configLabel: {
    fontSize: 16,
    color: Colors.Colors.cyanOrange.primary,
    fontWeight: '500' as const,
  },
  configToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configToggleActive: {
    backgroundColor: Colors.Colors.cyan.primary,
  },
  selectOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.secondary,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  selectButtonActive: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderColor: Colors.Colors.cyan.primary,
  },
  selectButtonText: {
    fontSize: 14,
    color: Colors.Colors.cyanOrange.primary,
    fontWeight: '500' as const,
  },
  selectButtonTextActive: {
    color: Colors.Colors.text.inverse,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
  },
  previewToolbar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.Colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
    gap: 12,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  previewButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.Colors.cyanOrange.primary,
  },
  fileList: {
    maxHeight: 200,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  fileItemActive: {
    backgroundColor: Colors.Colors.background.card,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: Colors.Colors.cyanOrange.primary,
  },
  fileSize: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  codePreview: {
    flex: 1,
    backgroundColor: Colors.Colors.background.card,
    padding: 16,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: Colors.Colors.orange.primary,
    lineHeight: 18,
  },
  errorsSection: {
    backgroundColor: Colors.Colors.background.secondary,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.Colors.border.muted,
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: Colors.Colors.red.primary,
    marginBottom: 12,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 13,
    color: Colors.Colors.cyanOrange.primary,
    marginBottom: 2,
  },
  errorLocation: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
  },
});
