import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Rocket,
  CheckCircle,
  AlertCircle,
  Loader,
  Download,
  ExternalLink,
  Crown,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAgent } from '@/contexts/AgentContext';
import { useDeployment } from '@/contexts/DeploymentContext';
import * as Haptics from 'expo-haptics';

export default function DeployScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentProject } = useAgent();
  const {
    deployments,
    currentTier,
    isDeploying,
    deployProgress,
    canDeploy,
    deployProject,
    getTierConfig,
  } = useDeployment();

  const [subdomain, setSubdomain] = useState<string>('');
  const [customDomain, setCustomDomain] = useState<string>('');
  const [projectDescription, setProjectDescription] = useState<string>('');
  const [features, setFeatures] = useState<string>('');

  const tierConfig = getTierConfig();

  useEffect(() => {
    if (currentProject) {
      setProjectDescription(currentProject.name);
      const fileNames = currentProject.files.map(f => f.name).join(', ');
      setFeatures(fileNames);
    }
  }, [currentProject]);

  const handleDeploy = async () => {
    if (!currentProject) {
      Alert.alert('Error', 'No project selected. Please generate a project first.');
      return;
    }

    if (!subdomain.trim()) {
      Alert.alert('Error', 'Please enter a subdomain for your deployment.');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      Alert.alert('Error', 'Subdomain can only contain lowercase letters, numbers, and hyphens.');
      return;
    }

    if (!canDeploy) {
      Alert.alert(
        'Deployment Limit Reached',
        `You've reached the deployment limit for the ${currentTier} tier. Please upgrade to deploy more projects.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Plans', onPress: () => router.push('/pricing') },
        ]
      );
      return;
    }

    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      const buildOutput = generateBuildOutput(currentProject);
      const featuresList = features.split(',').map(f => f.trim()).filter(Boolean);

      const deployment = await deployProject(
        currentProject.id,
        currentProject.name,
        projectDescription || currentProject.name,
        subdomain,
        buildOutput,
        featuresList,
        customDomain || undefined
      );

      Alert.alert(
        '🚀 Deployment Successful!',
        `Your project is now live at:\n${deployment.url}\n\n${
          deployment.seoContent?.videoScript
            ? 'SEO content and YouTube script generated!'
            : ''
        }`,
        [
          { text: 'View Deployment', onPress: () => console.log('Open:', deployment.url) },
          { text: 'OK' },
        ]
      );

      setSubdomain('');
      setCustomDomain('');
    } catch (error) {
      Alert.alert(
        'Deployment Failed',
        error instanceof Error ? error.message : 'Failed to deploy project'
      );
      console.error('[Deploy] Deployment error:', error);
    }
  };

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
          <Text style={styles.headerTitle}>Deploy Project</Text>
          <Text style={styles.headerSubtitle}>
            {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Tier
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/pricing')}>
          <Crown color={Colors.Colors.warning} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Rocket color={Colors.Colors.cyan.primary} size={48} />
          </View>
          <Text style={styles.heroTitle}>Deploy to Production</Text>
          <Text style={styles.heroDescription}>
            Deploy your project to a custom subdomain with automatic SSL, CDN, and SEO optimization
          </Text>
        </View>

        {currentProject ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Project Details</Text>
              <View style={styles.projectCard}>
                <Text style={styles.projectName}>{currentProject.name}</Text>
                <Text style={styles.projectStats}>
                  {currentProject.files.length} files • {currentProject.files.reduce((acc, f) => acc + f.size, 0)} bytes
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Deployment Configuration</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subdomain *</Text>
                <View style={styles.subdomainInput}>
                  <TextInput
                    style={styles.input}
                    value={subdomain}
                    onChangeText={setSubdomain}
                    placeholder="my-awesome-app"
                    placeholderTextColor={Colors.Colors.text.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.domainSuffix}>.gnidoc.app</Text>
                </View>
                <Text style={styles.inputHint}>
                  Your app will be available at: https://{subdomain || 'your-subdomain'}.gnidoc.app
                </Text>
              </View>

              {tierConfig.features.customDomain && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Custom Domain (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={customDomain}
                    onChangeText={setCustomDomain}
                    placeholder="www.yourdomain.com"
                    placeholderTextColor={Colors.Colors.text.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.inputHint}>
                    Configure DNS: CNAME record pointing to gnidoc.app
                  </Text>
                </View>
              )}

              {tierConfig.features.seoGeneration && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Project Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={projectDescription}
                      onChangeText={setProjectDescription}
                      placeholder="Describe your project for SEO optimization..."
                      placeholderTextColor={Colors.Colors.text.muted}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Key Features (comma-separated)</Text>
                    <TextInput
                      style={styles.input}
                      value={features}
                      onChangeText={setFeatures}
                      placeholder="authentication, real-time updates, analytics"
                      placeholderTextColor={Colors.Colors.text.muted}
                      autoCapitalize="none"
                    />
                  </View>
                </>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Deployment Features</Text>
              <View style={styles.featuresList}>
                <FeatureItem
                  enabled={tierConfig.features.ssl}
                  label="Automatic SSL Certificate"
                />
                <FeatureItem
                  enabled={tierConfig.features.cdn}
                  label="Global CDN Distribution"
                />
                <FeatureItem
                  enabled={tierConfig.features.analytics}
                  label="Analytics & Monitoring"
                />
                <FeatureItem
                  enabled={tierConfig.features.seoGeneration}
                  label="AI-Generated SEO Content"
                />
                <FeatureItem
                  enabled={tierConfig.features.videoScriptGeneration}
                  label="YouTube Launch Script"
                />
                <FeatureItem
                  enabled={tierConfig.features.customDomain}
                  label="Custom Domain Support"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.deployButton, (isDeploying || !canDeploy) && styles.deployButtonDisabled]}
              onPress={handleDeploy}
              disabled={isDeploying || !canDeploy}
            >
              {isDeploying ? (
                <>
                  <Loader color={Colors.Colors.text.inverse} size={24} />
                  <Text style={styles.deployButtonText}>
                    Deploying... {Math.round(deployProgress)}%
                  </Text>
                </>
              ) : (
                <>
                  <Rocket color={Colors.Colors.text.inverse} size={24} />
                  <Text style={styles.deployButtonText}>
                    {canDeploy ? 'Deploy Now' : 'Upgrade to Deploy More'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {!canDeploy && (
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => router.push('/pricing')}
              >
                <Crown color={Colors.Colors.warning} size={20} />
                <Text style={styles.upgradeButtonText}>View Upgrade Options</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <AlertCircle color={Colors.Colors.text.muted} size={64} />
            <Text style={styles.emptyStateTitle}>No Project Selected</Text>
            <Text style={styles.emptyStateDescription}>
              Generate a project first before deploying
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.push('/app-generator')}
            >
              <Text style={styles.emptyStateButtonText}>Generate Project</Text>
            </TouchableOpacity>
          </View>
        )}

        {deployments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Deployments</Text>
            {deployments.map(deployment => (
              <View key={deployment.id} style={styles.deploymentCard}>
                <View style={styles.deploymentHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deploymentName}>{deployment.projectName}</Text>
                    <Text style={styles.deploymentUrl}>{deployment.url}</Text>
                  </View>
                  <View
                    style={[
                      styles.deploymentStatus,
                      { backgroundColor: getStatusColor(deployment.status) },
                    ]}
                  >
                    <Text style={styles.deploymentStatusText}>{deployment.status}</Text>
                  </View>
                </View>
                <View style={styles.deploymentActions}>
                  <TouchableOpacity style={styles.deploymentAction}>
                    <ExternalLink color={Colors.Colors.cyan.primary} size={16} />
                    <Text style={styles.deploymentActionText}>Visit</Text>
                  </TouchableOpacity>
                  {deployment.seoContent?.videoScript && (
                    <TouchableOpacity style={styles.deploymentAction}>
                      <Download color={Colors.Colors.success} size={16} />
                      <Text style={styles.deploymentActionText}>Download Script</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function FeatureItem({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <View style={styles.featureItem}>
      {enabled ? (
        <CheckCircle color={Colors.Colors.success} size={20} />
      ) : (
        <X color={Colors.Colors.text.muted} size={20} />
      )}
      <Text style={[styles.featureLabel, !enabled && styles.featureLabelDisabled]}>
        {label}
      </Text>
    </View>
  );
}

function generateBuildOutput(project: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
</head>
<body>
  <div id="root"></div>
  <script>
    // Bundled application code
    console.log('${project.name} deployed successfully!');
  </script>
</body>
</html>`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return Colors.Colors.success;
    case 'building':
    case 'deploying':
      return Colors.Colors.warning;
    case 'failed':
      return Colors.Colors.error;
    case 'paused':
      return Colors.Colors.text.muted;
    default:
      return Colors.Colors.text.muted;
  }
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 16,
  },
  projectCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  projectStats: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  textArea: {
    minHeight: 80,
  },
  subdomainInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    overflow: 'hidden',
  },
  domainSuffix: {
    fontSize: 16,
    color: Colors.Colors.text.secondary,
    paddingHorizontal: 12,
    backgroundColor: Colors.Colors.background.secondary,
    paddingVertical: 12,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    marginTop: 6,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureLabel: {
    fontSize: 14,
    color: Colors.Colors.text.primary,
  },
  featureLabelDisabled: {
    color: Colors.Colors.text.muted,
    textDecorationLine: 'line-through',
  },
  deployButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.cyan.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  deployButtonDisabled: {
    opacity: 0.6,
  },
  deployButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.Colors.text.inverse,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.background.card,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: Colors.Colors.warning,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.warning,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.inverse,
  },
  deploymentCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  deploymentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  deploymentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  deploymentUrl: {
    fontSize: 13,
    color: Colors.Colors.cyan.primary,
  },
  deploymentStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deploymentStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.Colors.text.inverse,
    textTransform: 'uppercase',
  },
  deploymentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  deploymentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deploymentActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
  },
});
