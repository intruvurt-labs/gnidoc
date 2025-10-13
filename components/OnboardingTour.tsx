import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width, height } = Dimensions.get('window');

interface OnboardingStep {
  title: string;
  description: string;
  highlight?: string;
  icon?: React.ReactNode;
}

interface OnboardingTourProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onStepChange?: (index: number, step: OnboardingStep) => void;
  persistProgress?: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Aurebix',
    description: 'Your AI-powered development platform. Build, deploy, and manage applications with cutting-edge AI assistance.',
    icon: <Sparkles size={48} color={Colors.Colors.cyan.primary} />,
  },
  {
    title: 'AI Canvas',
    description: 'Chat with AI agents to generate code, design interfaces, and solve complex problems. Access it from the Canvas tab.',
    highlight: 'canvas',
  },
  {
    title: 'Orchestration',
    description: 'Coordinate multiple AI models to work together. Compare outputs and optimize your workflows.',
    highlight: 'orchestration',
  },
  {
    title: 'Deploy & Monitor',
    description: 'Deploy your projects with one click and monitor performance in real-time from the Deploy tab.',
    highlight: 'deploy',
  },
  {
    title: 'Database Management',
    description: 'Connect to databases, run queries, and manage your data with AI-powered SQL assistance.',
    highlight: 'database',
  },
  {
    title: 'Security & Settings',
    description: 'Manage API keys, configure security settings, and customize your preferences.',
    highlight: 'security',
  },
];

const PROGRESS_KEY = 'onboarding_progress';

export default function OnboardingTour({
  visible,
  onComplete,
  onSkip,
  onStepChange,
  persistProgress = false,
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (visible && persistProgress) {
      loadProgress();
    }
  }, [visible, persistProgress]);

  useEffect(() => {
    if (onStepChange && visible) {
      onStepChange(currentStep, ONBOARDING_STEPS[currentStep]);
    }
  }, [currentStep, visible, onStepChange]);

  const loadProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem(PROGRESS_KEY);
      if (saved) {
        const step = parseInt(saved, 10);
        if (step >= 0 && step < ONBOARDING_STEPS.length) {
          setCurrentStep(step);
        }
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
    }
  };

  const saveProgress = async (step: number) => {
    if (!persistProgress) return;
    try {
      await AsyncStorage.setItem(PROGRESS_KEY, step.toString());
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveProgress(nextStep);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      saveProgress(prevStep);
    }
  };

  const handleComplete = async () => {
    if (persistProgress) {
      try {
        await AsyncStorage.removeItem(PROGRESS_KEY);
      } catch (error) {
        console.error('Failed to clear onboarding progress:', error);
      }
    }
    onComplete();
  };

  const handleSkip = async () => {
    if (persistProgress) {
      try {
        await AsyncStorage.removeItem(PROGRESS_KEY);
      } catch (error) {
        console.error('Failed to clear onboarding progress:', error);
      }
    }
    onSkip();
  };

  if (!visible) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidBlur]} />
        )}

        <View style={styles.content}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color={Colors.Colors.text.secondary} />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              {step.icon || <Sparkles size={48} color={Colors.Colors.cyan.primary} />}
            </View>

            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {currentStep + 1} of {ONBOARDING_STEPS.length}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handlePrevious}
              >
                <ChevronLeft size={20} color={Colors.Colors.cyan.primary} />
                <Text style={styles.secondaryButtonText}>Previous</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                currentStep === 0 && styles.fullWidthButton,
              ]}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>
                {currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              {currentStep < ONBOARDING_STEPS.length - 1 && (
                <ChevronRight size={20} color="#000" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidBlur: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  content: {
    width: Math.min(width * 0.9, 400),
    maxHeight: height * 0.8,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.Colors.cyan.primary + '30',
    shadowColor: Colors.Colors.cyan.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  skipButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.Colors.background.primary + '80',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.Colors.cyan.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary + '40',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.Colors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.Colors.background.primary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.Colors.text.secondary,
    fontWeight: '600' as const,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  fullWidthButton: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: Colors.Colors.cyan.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.Colors.cyan.primary,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.cyan.primary,
  },
});
