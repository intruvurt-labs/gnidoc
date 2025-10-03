import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  Code,
  Terminal,
  FileText,
  Settings,
  Brain,
  Monitor,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
}

interface OnboardingTourProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingTour({ visible, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [fadeAnim] = useState(new Animated.Value(0));

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to gnidoC Terces',
      description: 'Your master coding agent with 25+ years of programming expertise. Build production-ready apps across web2-4 platforms with AI-powered assistance.',
      icon: <Brain color={Colors.Colors.cyan.primary} size={48} />,
    },
    {
      id: 'dashboard',
      title: 'Smart Dashboard',
      description: 'Monitor your projects, track code quality metrics, and access real-time analytics. Search across all your projects and files instantly.',
      icon: <Monitor color={Colors.Colors.cyan.primary} size={48} />,
      highlight: 'dashboard',
    },
    {
      id: 'ai-agent',
      title: 'AI Coding Agent',
      description: 'Chat with your expert coding assistant. Get help with debugging, architecture decisions, security audits, and deployment guidance.',
      icon: <Brain color={Colors.Colors.cyan.primary} size={48} />,
      highlight: 'agent',
    },
    {
      id: 'ide',
      title: 'Mobile IDE',
      description: 'Full-featured VSCode-style IDE on your mobile device. Write, edit, and manage code with syntax highlighting and AI-powered generation.',
      icon: <Code color={Colors.Colors.cyan.primary} size={48} />,
      highlight: 'ide',
    },
    {
      id: 'terminal',
      title: 'Integrated Terminal',
      description: 'Execute commands, manage dependencies, run builds, and deploy applications. Full terminal access with command history.',
      icon: <Terminal color={Colors.Colors.cyan.primary} size={48} />,
      highlight: 'terminal',
    },
    {
      id: 'analysis',
      title: 'Code Analysis',
      description: 'Comprehensive code quality analysis, security auditing, and performance optimization recommendations with automated fixes.',
      icon: <FileText color={Colors.Colors.cyan.primary} size={48} />,
      highlight: 'analysis',
    },
    {
      id: 'settings',
      title: 'Personalization',
      description: 'Customize your development environment, connect GitHub repositories, and manage integrations. Access help and support resources.',
      icon: <Settings color={Colors.Colors.cyan.primary} size={48} />,
      highlight: 'settings',
    },
  ];

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    onSkip();
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.stepCounter}>
              {currentStep + 1} of {steps.length}
            </Text>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <X color={Colors.Colors.text.muted} size={24} />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentStep + 1) / steps.length) * 100}%` }
                ]} 
              />
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              {currentStepData.icon}
            </View>
            
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.description}>{currentStepData.description}</Text>

            {/* Feature Highlights */}
            {currentStep === 0 && (
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Zap color={Colors.Colors.cyan.primary} size={16} />
                  <Text style={styles.featureText}>AI-powered code generation</Text>
                </View>
                <View style={styles.featureItem}>
                  <Code color={Colors.Colors.red.primary} size={16} />
                  <Text style={styles.featureText}>20+ programming languages</Text>
                </View>
                <View style={styles.featureItem}>
                  <Terminal color={Colors.Colors.warning} size={16} />
                  <Text style={styles.featureText}>Cross-platform deployment</Text>
                </View>
                <View style={styles.featureItem}>
                  <FileText color={Colors.Colors.success} size={16} />
                  <Text style={styles.featureText}>Real-time security auditing</Text>
                </View>
              </View>
            )}
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity
              style={[styles.navButton, styles.secondaryButton]}
              onPress={currentStep === 0 ? handleSkip : handlePrevious}
            >
              {currentStep === 0 ? (
                <Text style={styles.secondaryButtonText}>Skip Tour</Text>
              ) : (
                <>
                  <ChevronLeft color={Colors.Colors.text.secondary} size={20} />
                  <Text style={styles.secondaryButtonText}>Previous</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.primaryButton]}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>
                {isLastStep ? 'Get Started' : 'Next'}
              </Text>
              {!isLastStep && (
                <ChevronRight color={Colors.Colors.text.inverse} size={20} />
              )}
            </TouchableOpacity>
          </View>

          {/* Step Indicators */}
          <View style={styles.indicators}>
            {steps.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.indicator,
                  index === currentStep && styles.activeIndicator,
                  index < currentStep && styles.completedIndicator,
                ]}
                onPress={() => setCurrentStep(index)}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 20,
    padding: 24,
    width: Math.min(width - 40, 400),
    maxHeight: height * 0.8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.muted,
  },
  skipButton: {
    padding: 4,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 2,
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  featureList: {
    alignSelf: 'stretch',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: Colors.Colors.cyan.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  primaryButtonText: {
    color: Colors.Colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: Colors.Colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.Colors.background.secondary,
  },
  activeIndicator: {
    backgroundColor: Colors.Colors.cyan.primary,
  },
  completedIndicator: {
    backgroundColor: Colors.Colors.success,
  },
});