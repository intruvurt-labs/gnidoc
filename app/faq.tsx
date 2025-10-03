import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Mail,
  MessageCircle,
  Code,
  Zap,
  Shield,
  Smartphone,
} from 'lucide-react-native';
import Colors from '@/constants/colors';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface FAQCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

export default function FAQScreen() {
  const insets = useSafeAreaInsets();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const faqCategories: FAQCategory[] = [
    {
      id: 'getting-started',
      name: 'Getting Started',
      icon: <Smartphone color={Colors.Colors.cyan.primary} size={20} />,
      items: [
        {
          id: 'what-is-gnidoc',
          question: 'What is gnidoC Terces?',
          answer: 'gnidoC Terces is a professional mobile development environment powered by AI. It provides advanced code generation, real-time analysis, and comprehensive development tools for building React Native applications directly on your mobile device.',
          category: 'getting-started',
        },
        {
          id: 'how-to-start',
          question: 'How do I get started with the app?',
          answer: 'Simply launch the app and you\'ll be guided through an onboarding tour. You can create your first project from the Dashboard by tapping "New Project" and selecting your preferred project type (React Native, Web App, or API Service).',
          category: 'getting-started',
        },
        {
          id: 'system-requirements',
          question: 'What are the system requirements?',
          answer: 'gnidoC Terces works on iOS 13+ and Android 8+ devices. For optimal performance, we recommend devices with at least 4GB RAM and a stable internet connection for AI features.',
          category: 'getting-started',
        },
      ],
    },
    {
      id: 'features',
      name: 'Features & Functionality',
      icon: <Code color={Colors.Colors.red.primary} size={20} />,
      items: [
        {
          id: 'ai-code-generation',
          question: 'How does AI code generation work?',
          answer: 'Our AI assistant analyzes your requirements and generates production-ready code following React Native best practices. Simply describe what you want to build, and the AI will create components, screens, or entire features with proper TypeScript typing and styling.',
          category: 'features',
        },
        {
          id: 'code-analysis',
          question: 'What does the code analysis feature do?',
          answer: 'The analysis feature scans your project for code quality, performance issues, security vulnerabilities, and best practice violations. It provides detailed reports with actionable recommendations to improve your codebase.',
          category: 'features',
        },
        {
          id: 'terminal-commands',
          question: 'Can I run real terminal commands?',
          answer: 'Yes! The terminal supports real command execution including npm/yarn operations, git commands, file system operations, and Expo CLI commands. All commands run in a secure sandboxed environment.',
          category: 'features',
        },
        {
          id: 'project-management',
          question: 'How do I manage multiple projects?',
          answer: 'You can create and switch between multiple projects from the Dashboard. Each project maintains its own files, settings, and analysis results. Projects are automatically saved and synced across your devices.',
          category: 'features',
        },
      ],
    },
    {
      id: 'ide',
      name: 'Mobile IDE',
      icon: <Zap color={Colors.Colors.warning} size={20} />,
      items: [
        {
          id: 'ide-features',
          question: 'What IDE features are available?',
          answer: 'The mobile IDE includes syntax highlighting, auto-completion, file explorer, multi-tab editing, search and replace, git integration, and real-time error detection. It\'s designed to provide a desktop-class development experience on mobile.',
          category: 'ide',
        },
        {
          id: 'file-management',
          question: 'How do I manage files and folders?',
          answer: 'Use the Explorer panel to navigate your project structure. You can create, rename, delete, and organize files and folders. The IDE supports drag-and-drop operations and bulk file operations.',
          category: 'ide',
        },
        {
          id: 'keyboard-shortcuts',
          question: 'Are there keyboard shortcuts available?',
          answer: 'Yes, when using an external keyboard, the IDE supports common shortcuts like Cmd/Ctrl+S for save, Cmd/Ctrl+F for search, and Cmd/Ctrl+Z for undo. Touch gestures are optimized for mobile use.',
          category: 'ide',
        },
      ],
    },
    {
      id: 'troubleshooting',
      name: 'Troubleshooting',
      icon: <Shield color={Colors.Colors.success} size={20} />,
      items: [
        {
          id: 'app-crashes',
          question: 'What should I do if the app crashes?',
          answer: 'First, try restarting the app. If crashes persist, check for app updates in the App Store/Play Store. Clear the app cache if needed, and ensure you have sufficient device storage. Contact support if issues continue.',
          category: 'troubleshooting',
        },
        {
          id: 'sync-issues',
          question: 'My projects aren\'t syncing properly',
          answer: 'Ensure you have a stable internet connection and sufficient cloud storage. Try manually syncing from Settings > Sync. If problems persist, check your account status and contact support for assistance.',
          category: 'troubleshooting',
        },
        {
          id: 'performance-issues',
          question: 'The app is running slowly',
          answer: 'Close other apps to free up memory, ensure you have adequate storage space, and check your internet connection. Large projects may require more processing time. Consider breaking large projects into smaller modules.',
          category: 'troubleshooting',
        },
      ],
    },
  ];

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleContactSupport = async () => {
    try {
      const url = 'mailto:support@intruvurt.space?subject=gnidoC%20Terces%20Support%20Request&body=Hello%20Support%20Team%2C%0A%0AI%20need%20help%20with%3A%0A%0A';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.log('[FAQ] Email client not available');
      }
    } catch (error) {
      console.error('[FAQ] Failed to open email client:', error);
    }
  };

  const handleCommunitySupport = async () => {
    try {
      const url = 'https://t.me/odinarychat';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.log('[FAQ] Telegram not available');
      }
    } catch (error) {
      console.error('[FAQ] Failed to open Telegram:', error);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'FAQ & Help',
          headerStyle: {
            backgroundColor: Colors.Colors.background.primary,
          },
          headerTintColor: Colors.Colors.text.primary,
          headerTitleStyle: {
            color: Colors.Colors.text.primary,
          },
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <HelpCircle color={Colors.Colors.cyan.primary} size={32} />
          <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
          <Text style={styles.headerSubtitle}>
            Find answers to common questions about gnidoC Terces
          </Text>
        </View>

        {/* FAQ Categories */}
        {faqCategories.map((category) => (
          <View key={category.id} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              {category.icon}
              <Text style={styles.categoryTitle}>{category.name}</Text>
            </View>
            
            {category.items.map((item) => {
              const isExpanded = expandedItems.has(item.id);
              return (
                <View key={item.id} style={styles.faqItem}>
                  <TouchableOpacity
                    style={styles.questionContainer}
                    onPress={() => toggleExpanded(item.id)}
                  >
                    <Text style={styles.questionText}>{item.question}</Text>
                    {isExpanded ? (
                      <ChevronDown color={Colors.Colors.cyan.primary} size={20} />
                    ) : (
                      <ChevronRight color={Colors.Colors.text.muted} size={20} />
                    )}
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <View style={styles.answerContainer}>
                      <Text style={styles.answerText}>{item.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* Contact Support */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Still Need Help?</Text>
          <Text style={styles.supportDescription}>
            Can&apos;t find what you&apos;re looking for? Our support team is here to help.
          </Text>
          
          <View style={styles.supportButtons}>
            <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
              <Mail color={Colors.Colors.cyan.primary} size={20} />
              <View style={styles.supportButtonText}>
                <Text style={styles.supportButtonTitle}>Email Support</Text>
                <Text style={styles.supportButtonSubtitle}>support@intruvurt.space</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.supportButton} onPress={handleCommunitySupport}>
              <MessageCircle color={Colors.Colors.red.primary} size={20} />
              <View style={styles.supportButtonText}>
                <Text style={styles.supportButtonTitle}>Community Chat</Text>
                <Text style={styles.supportButtonSubtitle}>Join our Telegram group</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Pro Tips</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              💡 Use the AI assistant to generate boilerplate code and speed up development
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              🔍 Run code analysis regularly to maintain high code quality
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              📱 Connect an external keyboard for a better coding experience
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              🚀 Use quick commands in the terminal to speed up common tasks
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
  },
  faqItem: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    overflow: 'hidden',
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginRight: 12,
  },
  answerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.Colors.border.muted,
  },
  answerText: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    lineHeight: 20,
    marginTop: 12,
  },
  supportSection: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  supportDescription: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  supportButtons: {
    gap: 12,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  supportButtonText: {
    flex: 1,
  },
  supportButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    marginBottom: 2,
  },
  supportButtonSubtitle: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  tipsSection: {
    marginBottom: 32,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 16,
  },
  tipItem: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.Colors.cyan.primary,
  },
  tipText: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    lineHeight: 18,
  },
});