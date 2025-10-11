import React, { useState, useRef } from 'react';
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
  Image,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { Audio } from 'expo-av';
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
  Mic,
  MicOff,
  Image as ImageIcon,
  Video,
  Users,

  Brain,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppBuilder, AppGenerationConfig, ModelConsensus, ConsensusAnalysis } from '@/contexts/AppBuilderContext';
import { useAuth } from '@/contexts/AuthContext';
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
    cachedGenerations,
    currentConsensus,
    currentAnalysis,
    generateApp,
    setCurrentApp,
    runConsensusMode,
    getSmartModelRecommendation,
    getCachedGeneration,
    replayGeneration,
  } = useAppBuilder();

  const { user } = useAuth();
  const [prompt, setPrompt] = useState<string>('');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showModelSelector, setShowModelSelector] = useState<boolean>(false);
  const [showCollabModal, setShowCollabModal] = useState<boolean>(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const [config, setConfig] = useState<AppGenerationConfig>({
    useTypeScript: true,
    includeTests: true,
    includeDocumentation: true,
    styleFramework: 'stylesheet',
    stateManagement: 'context',
    routing: 'expo-router',
    aiModel: 'dual-claude-gemini',
    enableConsensusMode: false,
    enableSmartSelector: true,
    enableCaching: true,
  });
  const [mgaSettings, setMgaSettings] = useState({
    modelGauge: 'balanced' as 'fast' | 'balanced' | 'quality' | 'custom',
    adaptiveMode: true,
    costOptimization: true,
    selectedModels: ['claude', 'gemini', 'gpt-4'] as string[],
  });
  const [showConsensus, setShowConsensus] = useState<boolean>(false);
  const [showRecommendation, setShowRecommendation] = useState<boolean>(false);
  const [recommendation, setRecommendation] = useState<any>(null);

  const startRecording = async () => {
    try {
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        Alert.alert('Not Supported', 'Voice recording is not available on web. Please use text input.');
        return;
      }

      console.log('[AppGenerator] Requesting audio permissions...');
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to use voice input.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('[AppGenerator] Starting recording...');
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      console.log('[AppGenerator] Recording started');
    } catch (error) {
      console.error('[AppGenerator] Failed to start recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      console.log('[AppGenerator] Stopping recording...');
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        Alert.alert('Error', 'Failed to get recording URI');
        return;
      }

      console.log('[AppGenerator] Recording saved:', uri);
      await transcribeAudio(uri);
    } catch (error) {
      console.error('[AppGenerator] Failed to stop recording:', error);
      Alert.alert('Recording Error', 'Failed to stop recording. Please try again.');
    }
  };

  const transcribeAudio = async (uri: string) => {
    try {
      setIsTranscribing(true);
      console.log('[AppGenerator] Transcribing audio...');

      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: `recording.${fileType}`,
        type: `audio/${fileType}`,
      } as any);

      const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      console.log('[AppGenerator] Transcription complete:', data.text);

      setPrompt(prev => prev ? `${prev} ${data.text}` : data.text);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert('Success', 'Voice input transcribed successfully!');
    } catch (error) {
      console.error('[AppGenerator] Transcription failed:', error);
      Alert.alert('Transcription Error', 'Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library permission.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...newImages]);
        console.log('[AppGenerator] Images selected:', newImages.length);

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('[AppGenerator] Image picker error:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library permission.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedVideo(result.assets[0].uri);
        console.log('[AppGenerator] Video selected:', result.assets[0].uri);

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('[AppGenerator] Video picker error:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && selectedImages.length === 0 && !selectedVideo) {
      Alert.alert('Error', 'Please provide a description, image, or video of the app you want to build');
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      console.log('[AppGenerator] Starting app generation...');

      if (config.enableCaching) {
        const cached = getCachedGeneration(prompt, config);
        if (cached) {
          Alert.alert(
            'Cached Generation Found',
            'A recent generation with the same prompt was found. Use cached version?',
            [
              {
                text: 'Use Cache',
                onPress: async () => {
                  const app = await replayGeneration(cached.id);
                  setShowPreview(true);
                },
              },
              { text: 'Generate New', onPress: () => proceedWithGeneration() },
            ]
          );
          return;
        }
      }

      await proceedWithGeneration();
    } catch (error) {
      Alert.alert(
        'Generation Failed',
        error instanceof Error ? error.message : 'Failed to generate app'
      );
      console.error('[AppGenerator] Generation error:', error);
    }
  };

  const proceedWithGeneration = async () => {
    if (config.enableSmartSelector) {
      const rec = await getSmartModelRecommendation(prompt);
      setRecommendation(rec);
      setShowRecommendation(true);
      return;
    }

    if (config.enableConsensusMode) {
      await runConsensusMode(prompt);
      setShowConsensus(true);
      return;
    }

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
  };

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <X color={Colors.Colors.text.primary} size={24} />
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
            Describe your app idea and watch as our 4-model AI orchestration
            generates production-ready code with full compilation and live preview
          </Text>
        </View>

        <View style={styles.promptSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>What do you want to build?</Text>
            <TouchableOpacity
              style={styles.mgaButton}
              onPress={() => setShowModelSelector(true)}
            >
              <Brain color={Colors.Colors.cyan.primary} size={20} />
              <Text style={styles.mgaButtonText}>MGA</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputToolbar}>
            <TouchableOpacity
              style={[styles.toolButton, isRecording && styles.toolButtonActive]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
            >
              {isRecording ? (
                <MicOff color={Colors.Colors.red.primary} size={20} />
              ) : (
                <Mic color={Colors.Colors.cyan.primary} size={20} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolButton} onPress={pickImage}>
              <ImageIcon color={Colors.Colors.cyan.primary} size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolButton} onPress={pickVideo}>
              <Video color={Colors.Colors.cyan.primary} size={20} />
            </TouchableOpacity>
            {user && (
              <TouchableOpacity
                style={styles.toolButton}
                onPress={() => setShowCollabModal(true)}
              >
                <Users color={Colors.Colors.cyan.primary} size={20} />
                {collaborators.length > 0 && (
                  <View style={styles.collabBadge}>
                    <Text style={styles.collabBadgeText}>{collaborators.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {isTranscribing && (
            <View style={styles.transcribingIndicator}>
              <ActivityIndicator color={Colors.Colors.cyan.primary} />
              <Text style={styles.transcribingText}>Transcribing voice input...</Text>
            </View>
          )}

          {selectedImages.length > 0 && (
            <ScrollView horizontal style={styles.mediaPreview} showsHorizontalScrollIndicator={false}>
              {selectedImages.map((uri, index) => (
                <View key={index} style={styles.mediaItem}>
                  <Image source={{ uri }} style={styles.mediaImage} />
                  <TouchableOpacity
                    style={styles.mediaRemove}
                    onPress={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                  >
                    <X color={Colors.Colors.text.inverse} size={16} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {selectedVideo && (
            <View style={styles.videoPreview}>
              <Video color={Colors.Colors.cyan.primary} size={48} />
              <Text style={styles.videoText}>Video selected</Text>
              <TouchableOpacity
                style={styles.videoRemove}
                onPress={() => setSelectedVideo(null)}
              >
                <X color={Colors.Colors.text.primary} size={20} />
              </TouchableOpacity>
            </View>
          )}

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
              <Text style={styles.featureTitle}>4-Model Orchestration</Text>
              <Text style={styles.featureDescription}>
                Uses 4 AI models simultaneously for unmatched quality
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
              {renderConfigOption('Consensus Mode', config.enableConsensusMode, () =>
                setConfig({ ...config, enableConsensusMode: !config.enableConsensusMode })
              )}
              {renderConfigOption('Smart Model Selector', config.enableSmartSelector, () =>
                setConfig({ ...config, enableSmartSelector: !config.enableSmartSelector })
              )}
              {renderConfigOption('Enable Caching', config.enableCaching, () =>
                setConfig({ ...config, enableCaching: !config.enableCaching })
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

      <Modal visible={showConsensus} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Multi-Model Consensus</Text>
              <TouchableOpacity onPress={() => setShowConsensus(false)}>
                <X color={Colors.Colors.text.muted} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.consensusContent}>
              {currentConsensus && currentConsensus.map((model, index) => (
                <View key={model.modelId} style={styles.consensusCard}>
                  <View style={styles.consensusHeader}>
                    <Text style={styles.consensusModelName}>{model.modelName}</Text>
                    <View style={styles.consensusBadge}>
                      <Text style={styles.consensusBadgeText}>
                        {model.confidence}% confidence
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.consensusResponse} numberOfLines={3}>
                    {model.response.substring(0, 150)}...
                  </Text>
                  <View style={styles.consensusStats}>
                    <Text style={styles.consensusStat}>
                      {model.responseTime}ms
                    </Text>
                    <Text style={styles.consensusStat}>
                      ${model.cost.toFixed(4)}
                    </Text>
                    <Text style={styles.consensusStat}>
                      {model.tokensUsed} tokens
                    </Text>
                  </View>
                </View>
              ))}

              {currentAnalysis && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>Consensus Analysis</Text>
                  <View style={styles.analysisScore}>
                    <Text style={styles.analysisScoreText}>
                      {currentAnalysis.consensusScore}%
                    </Text>
                    <Text style={styles.analysisScoreLabel}>Agreement</Text>
                  </View>

                  <Text style={styles.analysisSection}>Agreements:</Text>
                  {currentAnalysis.agreements.map((agreement, i) => (
                    <Text key={i} style={styles.analysisItem}>• {agreement}</Text>
                  ))}

                  {currentAnalysis.conflicts.length > 0 && (
                    <>
                      <Text style={styles.analysisSection}>Conflicts:</Text>
                      {currentAnalysis.conflicts.map((conflict) => (
                        <View key={conflict.id} style={styles.conflictCard}>
                          <Text style={styles.conflictAspect}>{conflict.aspect}</Text>
                          {conflict.models.map((m, i) => (
                            <Text key={i} style={styles.conflictModel}>
                              {m.modelId}: {m.suggestion}
                            </Text>
                          ))}
                          <Text style={styles.conflictResolution}>
                            Resolution: {conflict.resolution}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.useMergedButton}
                    onPress={async () => {
                      setShowConsensus(false);
                      const app = await generateApp(prompt, config);
                      setShowPreview(true);
                    }}
                  >
                    <Text style={styles.useMergedButtonText}>Use Merged Result</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showRecommendation} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Smart Model Recommendation</Text>
              <TouchableOpacity onPress={() => setShowRecommendation(false)}>
                <X color={Colors.Colors.text.muted} size={24} />
              </TouchableOpacity>
            </View>
            {recommendation && (
              <View style={styles.recommendationContent}>
                <View style={styles.recommendationHeader}>
                  <Text style={styles.recommendationTaskType}>
                    Task Type: {recommendation.taskType.toUpperCase()}
                  </Text>
                  <View style={styles.recommendationConfidence}>
                    <Text style={styles.recommendationConfidenceText}>
                      {recommendation.confidence}% confidence
                    </Text>
                  </View>
                </View>

                <Text style={styles.recommendationReasoning}>
                  {recommendation.reasoning}
                </Text>

                <Text style={styles.recommendationModelsTitle}>
                  Recommended Models:
                </Text>
                {recommendation.recommendedModels.map((model: string, i: number) => (
                  <View key={i} style={styles.recommendationModelCard}>
                    <Layers color={Colors.Colors.cyan.primary} size={20} />
                    <Text style={styles.recommendationModelName}>{model}</Text>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.proceedButton}
                  onPress={async () => {
                    setShowRecommendation(false);
                    const app = await generateApp(prompt, config);
                    setShowPreview(true);
                  }}
                >
                  <Text style={styles.proceedButtonText}>Proceed with Generation</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showModelSelector} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>MGA Model Selector</Text>
              <TouchableOpacity onPress={() => setShowModelSelector(false)}>
                <X color={Colors.Colors.text.muted} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.mgaContent}>
              <Text style={styles.mgaDescription}>
                Model-Gauge-Adaptation: Intelligently select and adapt AI models based on your task requirements.
              </Text>

              <Text style={styles.mgaLabel}>Model Gauge</Text>
              <View style={styles.gaugeOptions}>
                {['fast', 'balanced', 'quality', 'custom'].map(gauge => (
                  <TouchableOpacity
                    key={gauge}
                    style={[
                      styles.gaugeButton,
                      mgaSettings.modelGauge === gauge && styles.gaugeButtonActive,
                    ]}
                    onPress={() => setMgaSettings(prev => ({ ...prev, modelGauge: gauge as any }))}
                  >
                    <Text
                      style={[
                        styles.gaugeButtonText,
                        mgaSettings.modelGauge === gauge && styles.gaugeButtonTextActive,
                      ]}
                    >
                      {gauge.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.mgaToggle}>
                <Text style={styles.mgaLabel}>Adaptive Mode</Text>
                <TouchableOpacity
                  style={[styles.toggle, mgaSettings.adaptiveMode && styles.toggleActive]}
                  onPress={() => setMgaSettings(prev => ({ ...prev, adaptiveMode: !prev.adaptiveMode }))}
                >
                  {mgaSettings.adaptiveMode && <CheckCircle color={Colors.Colors.text.inverse} size={16} />}
                </TouchableOpacity>
              </View>

              <View style={styles.mgaToggle}>
                <Text style={styles.mgaLabel}>Cost Optimization</Text>
                <TouchableOpacity
                  style={[styles.toggle, mgaSettings.costOptimization && styles.toggleActive]}
                  onPress={() => setMgaSettings(prev => ({ ...prev, costOptimization: !prev.costOptimization }))}
                >
                  {mgaSettings.costOptimization && <CheckCircle color={Colors.Colors.text.inverse} size={16} />}
                </TouchableOpacity>
              </View>

              <Text style={styles.mgaLabel}>Selected Models</Text>
              {['claude', 'gemini', 'gpt-4', 'gpt-4-vision', 'llama'].map(model => (
                <TouchableOpacity
                  key={model}
                  style={styles.modelOption}
                  onPress={() => {
                    setMgaSettings(prev => ({
                      ...prev,
                      selectedModels: prev.selectedModels.includes(model)
                        ? prev.selectedModels.filter(m => m !== model)
                        : [...prev.selectedModels, model],
                    }));
                  }}
                >
                  <View style={[
                    styles.modelCheckbox,
                    mgaSettings.selectedModels.includes(model) && styles.modelCheckboxActive,
                  ]}>
                    {mgaSettings.selectedModels.includes(model) && (
                      <CheckCircle color={Colors.Colors.text.inverse} size={16} />
                    )}
                  </View>
                  <Text style={styles.modelOptionText}>{model.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.mgaSaveButton}
                onPress={() => {
                  setShowModelSelector(false);
                  Alert.alert('MGA Settings Saved', 'Your model preferences have been updated.');
                }}
              >
                <Text style={styles.mgaSaveButtonText}>Save MGA Settings</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCollabModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Collaboration</Text>
              <TouchableOpacity onPress={() => setShowCollabModal(false)}>
                <X color={Colors.Colors.text.muted} size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.collabContent}>
              <View style={styles.tierInfo}>
                <Text style={styles.tierTitle}>Your Plan: {user?.subscription?.toUpperCase() || 'FREE'}</Text>
                <Text style={styles.tierDescription}>
                  {user?.subscription === 'free' || !user?.subscription
                    ? 'Freemium: 1 collaboration seat'
                    : user?.subscription === 'basic'
                    ? 'Basic: 3 collaboration seats'
                    : user?.subscription === 'pro'
                    ? 'Pro: 10 collaboration seats'
                    : 'Enterprise: Unlimited seats'}
                </Text>
              </View>

              <Text style={styles.collabLabel}>Collaborators ({collaborators.length}/{user?.subscription === 'free' || !user?.subscription ? 1 : user?.subscription === 'basic' ? 3 : user?.subscription === 'pro' ? 10 : '∞'})</Text>
              
              {collaborators.map((email, index) => (
                <View key={index} style={styles.collabItem}>
                  <Text style={styles.collabEmail}>{email}</Text>
                  <TouchableOpacity
                    onPress={() => setCollaborators(prev => prev.filter((_, i) => i !== index))}
                  >
                    <X color={Colors.Colors.red.primary} size={20} />
                  </TouchableOpacity>
                </View>
              ))}

              {(user?.subscription === 'free' || !user?.subscription) && collaborators.length >= 1 ? (
                <View style={styles.upgradePrompt}>
                  <Text style={styles.upgradeText}>Upgrade to add more collaborators</Text>
                  <TouchableOpacity style={styles.upgradeButton}>
                    <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addCollabButton}
                  onPress={() => {
                    Alert.prompt(
                      'Add Collaborator',
                      'Enter email address',
                      (email) => {
                        if (email && email.includes('@')) {
                          setCollaborators(prev => [...prev, email]);
                        }
                      }
                    );
                  }}
                >
                  <Text style={styles.addCollabButtonText}>+ Add Collaborator</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
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
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 16,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  promptSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 16,
  },
  promptInput: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    color: Colors.Colors.text.primary,
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
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
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
    fontWeight: 'bold',
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
    color: Colors.Colors.text.secondary,
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
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  appCardDescription: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
  },
  appStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.Colors.text.inverse,
    textTransform: 'uppercase',
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
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: Colors.Colors.text.secondary,
    lineHeight: 18,
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
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
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
    color: Colors.Colors.text.primary,
    fontWeight: '500',
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
    color: Colors.Colors.text.secondary,
    fontWeight: '500',
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
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
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
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
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
    color: Colors.Colors.text.primary,
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
    color: Colors.Colors.text.primary,
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
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
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
    color: Colors.Colors.text.primary,
    marginBottom: 2,
  },
  errorLocation: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
  },
  consensusContent: {
    padding: 20,
  },
  consensusCard: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  consensusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  consensusModelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Colors.cyan.primary,
  },
  consensusBadge: {
    backgroundColor: Colors.Colors.cyan.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  consensusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.Colors.cyan.primary,
  },
  consensusResponse: {
    fontSize: 13,
    color: Colors.Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  consensusStats: {
    flexDirection: 'row',
    gap: 16,
  },
  consensusStat: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
  },
  analysisCard: {
    backgroundColor: Colors.Colors.background.primary,
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 16,
  },
  analysisScore: {
    alignItems: 'center',
    marginBottom: 20,
  },
  analysisScoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.Colors.cyan.primary,
  },
  analysisScoreLabel: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    marginTop: 4,
  },
  analysisSection: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  analysisItem: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    marginBottom: 6,
    paddingLeft: 8,
  },
  conflictCard: {
    backgroundColor: Colors.Colors.red.primary + '10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.Colors.red.primary,
  },
  conflictAspect: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  conflictModel: {
    fontSize: 12,
    color: Colors.Colors.text.secondary,
    marginBottom: 4,
    paddingLeft: 8,
  },
  conflictResolution: {
    fontSize: 13,
    color: Colors.Colors.success,
    marginTop: 8,
    fontWeight: '600',
  },
  useMergedButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  useMergedButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Colors.text.inverse,
  },
  recommendationContent: {
    padding: 20,
  },
  recommendationHeader: {
    marginBottom: 20,
  },
  recommendationTaskType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  recommendationConfidence: {
    backgroundColor: Colors.Colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  recommendationConfidenceText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.Colors.success,
  },
  recommendationReasoning: {
    fontSize: 15,
    color: Colors.Colors.text.secondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  recommendationModelsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 12,
  },
  recommendationModelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.secondary,
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  recommendationModelName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  proceedButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Colors.text.inverse,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mgaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.cyan.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.Colors.cyan.primary,
  },
  mgaButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.Colors.cyan.primary,
  },
  inputToolbar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toolButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.Colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  toolButtonActive: {
    backgroundColor: Colors.Colors.red.primary + '20',
    borderColor: Colors.Colors.red.primary,
  },
  collabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.Colors.red.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collabBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.Colors.text.inverse,
  },
  transcribingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.cyan.primary + '20',
    padding: 12,
    borderRadius: 8,
    gap: 12,
    marginBottom: 12,
  },
  transcribingText: {
    fontSize: 14,
    color: Colors.Colors.cyan.primary,
    fontWeight: '600',
  },
  mediaPreview: {
    marginBottom: 12,
  },
  mediaItem: {
    marginRight: 8,
    position: 'relative',
  },
  mediaImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  mediaRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.Colors.red.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreview: {
    backgroundColor: Colors.Colors.background.card,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  videoText: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    marginTop: 8,
  },
  videoRemove: {
    marginTop: 8,
  },
  mgaContent: {
    padding: 20,
  },
  mgaDescription: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  mgaLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 12,
  },
  gaugeOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  gaugeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.Colors.background.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  gaugeButtonActive: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderColor: Colors.Colors.cyan.primary,
  },
  gaugeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
  },
  gaugeButtonTextActive: {
    color: Colors.Colors.text.inverse,
  },
  mgaToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.Colors.cyan.primary,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  modelCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  modelCheckboxActive: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderColor: Colors.Colors.cyan.primary,
  },
  modelOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
  },
  mgaSaveButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  mgaSaveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Colors.text.inverse,
  },
  collabContent: {
    padding: 20,
  },
  tierInfo: {
    backgroundColor: Colors.Colors.cyan.primary + '20',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.Colors.cyan.primary,
  },
  tierTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.Colors.cyan.primary,
    marginBottom: 4,
  },
  tierDescription: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
  },
  collabLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 12,
  },
  collabItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  collabEmail: {
    fontSize: 14,
    color: Colors.Colors.text.primary,
  },
  upgradePrompt: {
    backgroundColor: Colors.Colors.warning + '20',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.warning,
  },
  upgradeText: {
    fontSize: 14,
    color: Colors.Colors.text.primary,
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: Colors.Colors.warning,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.Colors.text.inverse,
  },
  addCollabButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  addCollabButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.Colors.text.inverse,
  },
});
