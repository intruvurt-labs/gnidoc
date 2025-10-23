import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Image,
} from 'react-native';
import { Bot, Code } from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import BrandedHeader from '@/components/BrandedHeader';
import LogoMenu from '@/components/LogoMenu';
import TypewriterEffect from '@/components/TypewriterEffect';
import NeuroCanvas from '@/components/NeuroCanvas';
import CardRow from '@/components/CardRow';
import FeatureStrip from '@/components/FeatureStrip';
import MatrixGridBackground from '@/components/MatrixGridBackground';
import GenerateAppCTA from '@/components/GenerateAppCTA';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [promptText, setPromptText] = useState('');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Home screen refreshed');
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <MatrixGridBackground parallax tint={Colors.Colors.background.gridGlow} />

      <BrandedHeader rightAction={<LogoMenu />} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.Colors.cyan.primary}
            colors={[Colors.Colors.cyan.primary, Colors.Colors.lime.primary]}
            progressBackgroundColor={Colors.Colors.background.card}
          />
        }
      >
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>AI App Generator</Text>
          <TypewriterEffect
            phrases={[
              'Build Complete Apps with AI',
              'Generate Production-Ready Code',
              'Dual-Model AI Technology',
              'Live Preview & Compilation'
            ]}
            style={styles.typewriterText}
            typingSpeed={60}
            deletingSpeed={40}
            pauseDuration={2500}
          />
          <Text style={styles.heroDescription}>
            Describe your app idea and watch as our dual-model AI (Claude + Gemini)
            generates production-ready code with full compilation and live preview
          </Text>
        </View>

        <View style={styles.canvasSection}>
          <NeuroCanvas
            placeholder="Describe your app…"
            assistChips={['Claude+Gemini', 'TypeScript', 'expo-router']}
            onTextChange={setPromptText}
          />
          <GenerateAppCTA
            blueprint={{ prompt: promptText }}
            label="Generate App"
            style={styles.generateButton}
            testID="home-generate-app"
          />
        </View>

        <CardRow
          cards={[
            { title: 'Preview Live', style: 'lime_shadow', route: '/app-generator' },
            { title: 'Deploy', style: 'magenta_red', route: '/deploy' },
          ]}
        />

        <FeatureStrip
          items={[
            { icon: 'bolt', title: 'Dual-Model AI', description: 'Claude + Gemini powered generation' },
            { icon: 'shield', title: 'Security Scan', description: 'Built-in security analysis' },
            { icon: 'panel', title: 'Production-Ready', description: 'Deploy-ready architecture' },
          ]}
        />

        <View style={styles.platformFeaturesSection}>
          <Text style={styles.sectionTitle}>Enterprise Features</Text>
          <View style={styles.platformFeaturesList}>
            <View style={styles.platformFeatureCard}>
              <View style={styles.platformFeatureHeader}>
                <Text style={styles.platformFeatureIcon}>🗄️</Text>
                <Text style={styles.platformFeatureTitle}>Built-in PostgreSQL</Text>
              </View>
              <Text style={styles.platformFeatureDesc}>
                No lock-in to a Backend-as-a-Service platform
              </Text>
            </View>

            <View style={styles.platformFeatureCard}>
              <View style={styles.platformFeatureHeader}>
                <Text style={styles.platformFeatureIcon}>☁️</Text>
                <Text style={styles.platformFeatureTitle}>Your Cloud Deployment</Text>
              </View>
              <Text style={styles.platformFeatureDesc}>
                Deploys to AWS/GCP so your app can grow to any scale
              </Text>
            </View>

            <View style={styles.platformFeatureCard}>
              <View style={styles.platformFeatureHeader}>
                <Text style={styles.platformFeatureIcon}>⚡</Text>
                <Text style={styles.platformFeatureTitle}>Modern Architecture</Text>
              </View>
              <Text style={styles.platformFeatureDesc}>
                Microservices & Event-Driven Architectures for flexibility
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/orchestration' as any)}
            >
              <Image
                source={require('@/assets/images/quickicon-orchestrate.png')}
                style={styles.quickActionImage}
                resizeMode="contain"
              />
              <Text style={styles.quickActionTitle}>Orchestrate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/deploy' as any)}
            >
              <Image
                source={require('@/assets/images/deploy.png')}
                style={styles.quickActionImage}
                resizeMode="contain"
              />
              <Text style={styles.quickActionTitle}>Deploy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/agent' as any)}
            >
              <View style={styles.quickActionIconContainer}>
                <Bot size={48} color={Colors.Colors.cyan.primary} strokeWidth={1.5} />
              </View>
              <Text style={styles.quickActionTitle}>AI Agent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/dashboard' as any)}
            >
              <Image
                source={require('@/assets/images/dashboard.png')}
                style={styles.quickActionImage}
                resizeMode="contain"
              />
              <Text style={styles.quickActionTitle}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/app-generator' as any)}
            >
              <View style={styles.quickActionIconContainer}>
                <Code size={48} color={Colors.Colors.cyan.primary} strokeWidth={1.5} />
              </View>
              <Text style={styles.quickActionTitle}>Creator Studio</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F12',
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
    color: Colors.Colors.lime.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.Colors.lime.primary,
    marginTop: 2,
  },
  configButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  typewriterText: {
    fontSize: 18,
    color: '#00FFFF',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600' as const,
  },
  heroDescription: {
    fontSize: 16,
    color: '#8B92A0',
    textAlign: 'center',
    lineHeight: 24,
  },
  canvasSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },

  promptSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitleContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: (width - 52) / 2,
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#30363D',
  },
  quickActionImage: {
    width: 48,
    height: 48,
    marginBottom: 12,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
    textAlign: 'center',
  },
  platformFeaturesSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
    marginTop: 16,
  },
  platformFeaturesList: {
    gap: 12,
  },
  platformFeatureCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    borderLeftWidth: 4,
    borderLeftColor: Colors.Colors.cyan.primary,
  },
  platformFeatureHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  platformFeatureIcon: {
    fontSize: 24,
  },
  platformFeatureTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
  },
  platformFeatureDesc: {
    fontSize: 14,
    color: Colors.Colors.lime.primary,
    lineHeight: 20,
  },
  underline: {
    height: 3,
    backgroundColor: '#FF4444',
    width: '100%',
    borderRadius: 2,
  },
  promptInput: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    color: Colors.Colors.lime.primary,
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
    color: Colors.Colors.lime.primary,
  },
  generateButton: {
    marginTop: 16,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.text.inverse,
  },
  generateButtonIcon: {
    width: 24,
    height: 24,
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
    color: Colors.Colors.lime.primary,
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
    color: Colors.Colors.lime.primary,
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
    color: Colors.Colors.lime.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: Colors.Colors.lime.primary,
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
    color: Colors.Colors.lime.primary,
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
    color: Colors.Colors.lime.primary,
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
    color: Colors.Colors.lime.primary,
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
    color: Colors.Colors.lime.primary,
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
    color: Colors.Colors.lime.primary,
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
    color: Colors.Colors.lime.primary,
    marginBottom: 2,
  },
  errorLocation: {
    fontSize: 11,
    color: Colors.Colors.text.muted,
  },
});
