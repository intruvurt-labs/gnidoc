import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { ChevronRight, ChevronLeft, X } from 'lucide-react-native';
import Colors from '@/constants/colors';



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
    title: 'Welcome \n to \n gnidoC terceS',
    description: '"gnidoC terceS" is "Secret Coding" spelled in reverse; a symbolic mirror reflecting the hidden architecture of reality itself. In the clandestine chambers of quantum computation, code becomes cipher; every algorithm is an encrypted message from the future, written in the syntax of possibility. This platform unveils the sacred geometry of logic, where encrypted protocols dance with neural networks, and each deployment is a ritual of digital transmutation. Here, you don\'t just write code; you decipher the universe\'s hidden language, reverse-engineering consciousness itself through multi-dimensional AI orchestration.',
    icon: <Image source={require('@/assets/images/icon.png')} style={{ width: 96, height: 96 }} resizeMode="contain" />,
    highlight: 'gnidoC terceS',
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

const renderTitle = (step: OnboardingStep) => {
  const base = step.title || '';
  if (!step.highlight) {
    return <Text style={styles.title}>{base}</Text>;
  }

  const parts = base.split(step.highlight);
  return (
    <Text style={styles.title}>
      {parts.map((chunk, i) => (
        <React.Fragment key={i}>
          <Text>{chunk}</Text>
          {i < parts.length - 1 && (
            <Text style={styles.titleHighlight}>{step.highlight}</Text>
          )}
        </React.Fragment>
      ))}
    </Text>
  );
};

export default function OnboardingTour({
  visible,
  onComplete,
  onSkip,
  onStepChange,
  persistProgress = false,
}: OnboardingTourProps) {
  const { width, height } = useWindowDimensions();
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

  const handleNext = async () => {
    console.log('OnboardingTour: Next button pressed, currentStep:', currentStep);
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await saveProgress(nextStep);
    } else {
      await handleComplete();
    }
  };

  const handlePrevious = async () => {
    console.log('OnboardingTour: Previous button pressed, currentStep:', currentStep);
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      await saveProgress(prevStep);
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
    console.log('OnboardingTour: Skip button pressed');
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
      onRequestClose={handleSkip}
    >
      <View style={styles.container}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} style={[StyleSheet.absoluteFill, styles.blurLayer]} tint="dark" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidBlur]} />
        )}

        <View style={[styles.content, { width: Math.min(width * 0.9, 400), maxHeight: height * 0.8 }]}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color={Colors.Colors.red.coral} />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              {step.icon || <Image source={require('@/assets/images/icon.png')} style={{ width: 96, height: 96 }} resizeMode="contain" />}
            </View>

            {renderTitle(step)}
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
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronLeft size={20} color={Colors.Colors.red.coral} />
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
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
    backgroundColor: 'transparent',
  },
  blurLayer: {
    pointerEvents: 'none',
  },
  androidBlur: {
    backgroundColor: '#000000',
  },
  content: {
    backgroundColor: '#000000',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.deepCyan,
    shadowColor: Colors.Colors.red.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 100,
    position: 'relative',
  },
  skipButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1000,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#050508CC',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.Colors.cyan.deepCyan + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: Colors.Colors.lime.primary + '50',
    shadowColor: Colors.Colors.yellow.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.deepCyan,
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: Colors.Colors.red.coral,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleHighlight: {
    color: Colors.Colors.red.coral,
    textShadowColor: Colors.Colors.red.coral + '80',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.Colors.lime.primary,
    textAlign: 'center',
    marginBottom: 32,
    textShadowColor: Colors.Colors.yellow.primary,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#050508',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.Colors.lime.primary,
    borderRadius: 2,
    shadowColor: Colors.Colors.lime.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  progressText: {
    fontSize: 12,
    color: Colors.Colors.cyan.deepCyan,
    fontWeight: '600' as const,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
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
    minHeight: 52,
    elevation: 2,
  },
  fullWidthButton: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: Colors.Colors.lime.primary,
    shadowColor: Colors.Colors.yellow.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.Colors.red.coral,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.red.coral,
  },
});
