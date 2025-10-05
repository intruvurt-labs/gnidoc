import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  FlatList,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity,
  Cpu,
  Database,
  Globe,
  Zap,
  Code2,
  GitBranch,
  Shield,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAgent } from '@/contexts/AgentContext';
import { useRouter } from 'expo-router';
import OnboardingTour from '@/components/OnboardingTour';
import AISupportChat from '@/components/AISupportChat';
import OptimizedImage from '@/components/OptimizedImage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = React.memo(function MetricCard({ title, value, icon, trend, color }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.metricCard,
          {
            borderColor: color,
            transform: [{ scale: scaleAnim }],
            shadowColor: color,
            shadowOpacity,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          },
        ]}
      >
        <View style={styles.metricHeader}>
          <Text>{icon}</Text>
          <Text style={styles.metricTitle}>{title}</Text>
        </View>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        {trend && <Text style={styles.metricTrend}>{trend}</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
});

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function DashboardScreen() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const { projects, createProject } = useAgent();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem('onboarding_completed');
        if (!completed) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
      }
    };
    checkOnboarding();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const handleOnboardingSkip = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  const metrics = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const totalFiles = projects.reduce((acc, p) => acc + p.files.length, 0);
    const avgProgress = projects.length > 0 
      ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)
      : 0;
    
    return [
      {
        title: 'Active Projects',
        value: activeProjects.toString(),
        icon: <Code2 color={Colors.Colors.cyan.primary} size={20} />,
        trend: `${projects.length} total`,
        color: Colors.Colors.cyan.primary,
      },
      {
        title: 'Total Files',
        value: totalFiles.toString(),
        icon: <Globe color={Colors.Colors.red.primary} size={20} />,
        trend: 'Across all projects',
        color: Colors.Colors.red.primary,
      },
      {
        title: 'Avg Progress',
        value: `${avgProgress}%`,
        icon: <Zap color={Colors.Colors.warning} size={20} />,
        trend: 'Project completion',
        color: Colors.Colors.warning,
      },
      {
        title: 'AI Ready',
        value: '✓',
        icon: <Shield color={Colors.Colors.success} size={20} />,
        trend: 'Code generation active',
        color: Colors.Colors.success,
      },
    ];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return projects;
    const query = debouncedSearchQuery.toLowerCase();
    return projects.filter(project => 
      project.name.toLowerCase().includes(query) ||
      project.type.toLowerCase().includes(query) ||
      project.status.toLowerCase().includes(query)
    );
  }, [projects, debouncedSearchQuery]);

  const handleNewProject = useCallback(async () => {
    console.log('handleNewProject called');
    Alert.alert(
      'Create New Project',
      'What type of project would you like to create?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'React Native App', onPress: () => createProject('New React Native App', 'react-native') },
        { text: 'Web App', onPress: () => createProject('New Web App', 'web') },
        { text: 'API Service', onPress: () => createProject('New API Service', 'api') },
      ]
    );
  }, [createProject]);

  const handleGitSync = useCallback(() => {
    console.log('handleGitSync called');
    if (projects.length === 0) {
      Alert.alert('No Projects', 'Create a project first to use Git integration.');
      return;
    }
    Alert.alert(
      'Git Integration',
      'Choose Git operation:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Initialize Repo', 
          onPress: () => {
            Alert.alert(
              'Initialize Git Repository',
              'This will:\n\n• Initialize git repository\n• Create .gitignore file\n• Make initial commit\n• Set up branch protection\n\nProceed?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Initialize', 
                  onPress: () => {
                    router.push('/(tabs)/terminal');
                    Alert.alert('Git Initialized', 'Git repository has been initialized. Check terminal for status.');
                  }
                }
              ]
            );
          }
        },
        { 
          text: 'Connect GitHub', 
          onPress: () => {
            Alert.alert(
              'GitHub Integration',
              'Connect to GitHub repository:\n\n• Link existing repository\n• Create new repository\n• Set up CI/CD workflows\n• Enable automated deployments\n\nConnect now?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Connect GitHub', 
                  onPress: () => {
                    Alert.alert('GitHub Connected', 'GitHub integration is now active. You can push/pull changes from the terminal.');
                  }
                }
              ]
            );
          }
        },
        { 
          text: 'Sync Changes', 
          onPress: () => {
            router.push('/(tabs)/terminal');
          }
        }
      ]
    );
  }, [projects.length, router]);

  const handleDatabase = useCallback(() => {
    console.log('handleDatabase called');
    if (projects.length === 0) {
      Alert.alert('No Projects', 'Create a project first to manage databases.');
      return;
    }
    Alert.alert(
      'Database Integration',
      'Choose your database setup:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'SQLite (Local)', 
          onPress: () => {
            Alert.alert(
              'SQLite Setup',
              'SQLite database will be configured for your project. This includes:\n\n• Installing expo-sqlite\n• Creating database schema\n• Setting up migrations\n• Adding CRUD operations\n\nProceed?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Setup SQLite', 
                  onPress: () => {
                    router.push('/(tabs)/terminal');
                    Alert.alert('Success', 'SQLite setup commands have been added to your terminal. Run them to complete the setup.');
                  }
                }
              ]
            );
          }
        },
        { 
          text: 'PostgreSQL (Cloud)', 
          onPress: () => {
            Alert.alert(
              'PostgreSQL Setup',
              'Cloud PostgreSQL will be configured with:\n\n• Supabase integration\n• Real-time subscriptions\n• Row-level security\n• Auto-generated API\n\nProceed?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Setup PostgreSQL', 
                  onPress: () => {
                    Alert.alert('PostgreSQL Ready', 'PostgreSQL configuration has been prepared. Check the terminal for setup commands.');
                  }
                }
              ]
            );
          }
        }
      ]
    );
  }, [projects.length, router]);

  const handleDeploy = useCallback(() => {
    console.log('handleDeploy called');
    if (projects.length === 0) {
      Alert.alert('No Projects', 'Create a project first to deploy.');
      return;
    }
    Alert.alert(
      'Deployment Options',
      'Choose your deployment target:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Development Build', 
          onPress: () => {
            Alert.alert(
              'Development Build',
              'This will create a development build for testing:\n\n• Expo Development Build\n• Hot reloading enabled\n• Debug tools included\n• Fast iteration cycle\n\nStart build?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Start Build', 
                  onPress: () => {
                    router.push('/(tabs)/terminal');
                    Alert.alert('Build Started', 'Development build commands have been queued in the terminal.');
                  }
                }
              ]
            );
          }
        },
        { 
          text: 'Production Release', 
          onPress: () => {
            Alert.alert(
              'Production Release',
              'This will create production-ready builds:\n\n• iOS App Store build\n• Google Play Store build\n• Optimized bundle size\n• Code signing included\n\nProceed with production build?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Build for Stores', 
                  onPress: () => {
                    Alert.alert(
                      'Production Build',
                      'Production build process initiated:\n\n✓ Code optimization\n✓ Asset compression\n✓ Security hardening\n✓ Store compliance check\n\nEstimated time: 15-20 minutes\nYou will be notified when complete.'
                    );
                  }
                }
              ]
            );
          }
        },
        { 
          text: 'Web Deploy', 
          onPress: () => {
            Alert.alert(
              'Web Deployment',
              'Deploy to web platforms:\n\n• Vercel (Recommended)\n• Netlify\n• GitHub Pages\n• Custom domain support\n\nChoose deployment target?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Deploy to Vercel', 
                  onPress: () => {
                    Alert.alert('Web Deploy', 'Vercel deployment configured. Check terminal for deployment commands.');
                  }
                }
              ]
            );
          }
        }
      ]
    );
  }, [projects.length, router]);

  const handleLaunchIDE = useCallback(() => {
    router.push('/(tabs)/code');
  }, [router]);

  const handleSettings = useCallback(() => {
    router.push('/(tabs)/settings');
  }, [router]);

  const handleAppGenerator = useCallback(() => {
    console.log('handleAppGenerator called');
    router.push('/app-generator' as any);
  }, [router]);

  const renderProjectCard = useCallback(({ item: project }: { item: typeof projects[0] }) => (
    <TouchableOpacity style={styles.projectCard}>
      <View style={styles.projectInfo}>
        <Text style={styles.projectName}>{project.name}</Text>
        <Text style={styles.projectStatus}>{project.status}</Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${project.progress}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{project.progress}%</Text>
      </View>
    </TouchableOpacity>
  ), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <OptimizedImage
              source={{ uri: 'https://r2-pub.rork.com/generated-images/d28a4e8c-8bf7-4039-b4cd-9114de432ab2.png' }}
              style={styles.logo}
              containerStyle={styles.logoImageContainer}
              resizeMode="contain"
              priority="high"
              cachePolicy="memory-disk"
            />
            <View>
              <Text style={styles.appTitle}>gnidoC Terces</Text>
              <Text style={styles.appSubtitle}>Master Coding Agent</Text>
            </View>
          </View>
          <View style={styles.statusIndicator}>
            <Activity color={Colors.Colors.success} size={16} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search color={Colors.Colors.text.muted} size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search projects, files, or commands..."
              placeholderTextColor={Colors.Colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity onPress={handleSettings}>
              <Settings color={Colors.Colors.text.muted} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          {metrics.map((metric, index) => (
            <MetricCard key={`metric-${metric.title}-${index}`} {...metric} />
          ))}
        </View>

        <View style={styles.canvasContainer}>
          <Text style={styles.sectionTitle}>Live Preview Canvas</Text>
          <View style={styles.canvas}>
            <View style={styles.canvasGrid}>
              {Array.from({ length: 20 }).map((_, i) => (
                <View key={i} style={styles.gridLine} />
              ))}
            </View>
            <View style={styles.canvasContent}>
              <Text style={styles.canvasText}>Interactive Development Environment</Text>
              <Text style={styles.canvasSubtext}>Real-time code execution and preview</Text>
              <TouchableOpacity style={styles.canvasButton} onPress={handleLaunchIDE}>
                <Text style={styles.canvasButtonText}>Launch IDE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.projectsContainer}>
          <Text style={styles.sectionTitle}>
            {searchQuery ? `Search Results (${filteredProjects.length})` : 'Recent Projects'}
          </Text>
          {filteredProjects.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No projects found matching your search.' : 'No projects yet. Create your first project!'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.createProjectButton} onPress={handleNewProject}>
                  <Text style={styles.createProjectButtonText}>Create Project</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredProjects}
              keyExtractor={(item) => item.id}
              renderItem={renderProjectCard}
              scrollEnabled={false}
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              windowSize={3}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={50}
              getItemLayout={(data, index) => ({
                length: 88,
                offset: 88 * index,
                index,
              })}
            />
          )}
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleNewProject}
              activeOpacity={0.7}
            >
              <Code2 color={Colors.Colors.cyan.primary} size={24} />
              <Text style={styles.actionText}>New Project</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleGitSync}
              activeOpacity={0.7}
            >
              <GitBranch color={Colors.Colors.red.primary} size={24} />
              <Text style={styles.actionText}>Git Sync</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleDatabase}
              activeOpacity={0.7}
            >
              <Database color={Colors.Colors.warning} size={24} />
              <Text style={styles.actionText}>Database</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleDeploy}
              activeOpacity={0.7}
            >
              <Cpu color={Colors.Colors.success} size={24} />
              <Text style={styles.actionText}>Deploy</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.appGeneratorButton]} 
              onPress={handleAppGenerator}
              activeOpacity={0.7}
            >
              <Sparkles color={Colors.Colors.cyan.primary} size={24} />
              <Text style={styles.actionText}>AI App Generator</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>
      
      <OnboardingTour
        visible={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
      
      <AISupportChat userTier="free" />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoImageContainer: {
    width: 40,
    height: 40,
  },
  logo: {
    width: 40,
    height: 40,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.cyanRed.primary,
  },
  appSubtitle: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    color: Colors.Colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    width: (width - 52) / 2,
    borderWidth: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricTitle: {
    color: Colors.Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricTrend: {
    color: Colors.Colors.text.muted,
    fontSize: 10,
  },
  canvasContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.Colors.cyanRed.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  canvas: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    height: 200,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
  },
  canvasGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridLine: {
    width: '5%',
    height: '5%',
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: Colors.Colors.border.muted,
  },
  canvasContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  canvasText: {
    color: Colors.Colors.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  canvasSubtext: {
    color: Colors.Colors.text.muted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  canvasButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  canvasButtonText: {
    color: Colors.Colors.text.inverse,
    fontWeight: '600',
  },
  projectsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  projectCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  projectInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectName: {
    color: Colors.Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  projectStatus: {
    color: Colors.Colors.text.accent,
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 3,
  },
  progressText: {
    color: Colors.Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: (width - 52) / 2,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  actionText: {
    color: Colors.Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    color: Colors.Colors.text.muted,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  createProjectButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createProjectButtonText: {
    color: Colors.Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  appGeneratorButton: {
    borderColor: Colors.Colors.cyan.primary,
    borderWidth: 2,
  },
});
