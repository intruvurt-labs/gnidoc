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
          answer: 'gnidoC Terces (Coding Secrets reversed) is a revolutionary AI-powered mobile development platform available at https://gnidoc.xyz. It transforms your mobile device into a complete development environment with advanced code generation, real-time analysis, database management, research capabilities, and comprehensive deployment tools for building production-ready React Native applications.',
          category: 'getting-started',
        },
        {
          id: 'platform-philosophy',
          question: 'What is the philosophy behind gnidoC Terces?',
          answer: 'gnidoC Terces embodies the ethos of democratizing software development by making professional-grade tools accessible on mobile devices. We believe in empowering developers to code anywhere, anytime, with AI assistance that enhances creativity rather than replacing it. Our platform combines cutting-edge AI with intuitive design to unlock the secrets of efficient mobile development.',
          category: 'getting-started',
        },
        {
          id: 'how-to-start',
          question: 'How do I get started with the app?',
          answer: 'Simply launch the app and you\'ll be guided through an onboarding tour. You can create your first project from the Dashboard by tapping "New Project" and selecting your preferred project type (React Native, Web App, or API Service). Visit https://gnidoc.xyz for comprehensive tutorials and documentation.',
          category: 'getting-started',
        },
        {
          id: 'system-requirements',
          question: 'What are the system requirements?',
          answer: 'gnidoC Terces works on iOS 13+ and Android 8+ devices. For optimal performance, we recommend devices with at least 4GB RAM and a stable internet connection for AI features. The platform is also accessible via web at https://gnidoc.xyz.',
          category: 'getting-started',
        },
        {
          id: 'account-setup',
          question: 'Do I need an account to use gnidoC Terces?',
          answer: 'Yes, creating an account allows you to sync projects across devices, access cloud features, and utilize AI-powered tools. You can sign up using email or GitHub OAuth. Premium features require a subscription, but core functionality is available in the free tier.',
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
          answer: 'Our AI assistant analyzes your requirements and generates production-ready code following React Native best practices. Simply describe what you want to build, and the AI will create components, screens, or entire features with proper TypeScript typing and styling. The AI learns from your coding patterns and adapts to your project structure.',
          category: 'features',
        },
        {
          id: 'code-analysis',
          question: 'What does the code analysis feature do?',
          answer: 'The analysis feature scans your project for code quality, performance issues, security vulnerabilities, and best practice violations. It provides detailed reports with actionable recommendations to improve your codebase. Analysis includes dependency checks, bundle size optimization, and accessibility audits.',
          category: 'features',
        },
        {
          id: 'database-management',
          question: 'What database features are available?',
          answer: 'gnidoC Terces includes a full-featured SQL editor with support for PostgreSQL, MySQL, SQLite, and MongoDB. You can execute queries, view table schemas, manage connections, and visualize data relationships. The platform includes query optimization suggestions and transaction management.',
          category: 'features',
        },
        {
          id: 'research-capabilities',
          question: 'What is the Research feature?',
          answer: 'The Research feature allows you to conduct AI-powered research on any topic, generate comprehensive reports, and export findings in multiple formats. It\'s perfect for gathering requirements, exploring new technologies, or documenting architectural decisions.',
          category: 'features',
        },
        {
          id: 'terminal-commands',
          question: 'Can I run real terminal commands?',
          answer: 'Yes! The terminal supports real command execution including npm/yarn operations, git commands, file system operations, and Expo CLI commands. All commands run in a secure sandboxed environment with full output streaming.',
          category: 'features',
        },
        {
          id: 'project-management',
          question: 'How do I manage multiple projects?',
          answer: 'You can create and switch between multiple projects from the Dashboard. Each project maintains its own files, settings, and analysis results. Projects are automatically saved and synced across your devices with version control integration.',
          category: 'features',
        },
        {
          id: 'deployment',
          question: 'How do I deploy my applications?',
          answer: 'gnidoC Terces provides one-click deployment to multiple platforms including Vercel, Netlify, and custom servers. The deployment feature includes automatic SEO optimization, environment variable management, and rollback capabilities. Monitor your deployments directly from the app.',
          category: 'features',
        },
        {
          id: 'integrations',
          question: 'What integrations are supported?',
          answer: 'The platform integrates with GitHub, GitLab, Bitbucket, Slack, Discord, Jira, Trello, and many more services. You can connect APIs, manage webhooks, and automate workflows. Custom integrations can be created using our API.',
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
      id: 'advanced',
      name: 'Advanced Features',
      icon: <Zap color={Colors.Colors.warning} size={20} />,
      items: [
        {
          id: 'orchestration',
          question: 'What is the Orchestration feature?',
          answer: 'Orchestration allows you to coordinate multiple AI models and services to work together on complex tasks. You can create workflows that combine code generation, analysis, testing, and deployment in automated pipelines. Perfect for large-scale projects requiring multi-step processes.',
          category: 'advanced',
        },
        {
          id: 'tri-model',
          question: 'What is the Tri-Model Builder?',
          answer: 'The Tri-Model Builder is an advanced feature that combines three AI models (GPT-4, Claude, and Gemini) to generate more robust and diverse code solutions. It compares outputs, identifies best practices, and produces optimized code by leveraging the strengths of each model.',
          category: 'advanced',
        },
        {
          id: 'workflow-automation',
          question: 'How do I automate workflows?',
          answer: 'Use the Workflow tab to create custom automation pipelines. You can trigger actions based on events (commits, deployments, errors), schedule tasks, and chain multiple operations together. Workflows support conditional logic and error handling.',
          category: 'advanced',
        },
        {
          id: 'security-features',
          question: 'What security features are available?',
          answer: 'gnidoC Terces includes comprehensive security scanning, dependency vulnerability detection, secret detection in code, OWASP compliance checking, and automated security reports. All data is encrypted in transit and at rest. Two-factor authentication is available for account protection.',
          category: 'advanced',
        },
        {
          id: 'api-access',
          question: 'Can I access gnidoC Terces via API?',
          answer: 'Yes! Premium users have access to our REST and GraphQL APIs. You can programmatically create projects, run analyses, execute deployments, and integrate gnidoC Terces into your existing development workflows. API documentation is available at https://gnidoc.xyz/docs/api.',
          category: 'advanced',
        },
        {
          id: 'multi-model-orchestration',
          question: 'How does Multi-Model Orchestration work?',
          answer: 'Multi-Model Orchestration harnesses multiple AI models (LLMs, vision models, embedding models, and code-specific models) simultaneously to provide superior results. The system intelligently routes tasks to the most appropriate model, combines outputs for consensus-based decisions, and validates results across models for maximum accuracy and reliability.',
          category: 'advanced',
        },
        {
          id: 'prompt-to-app',
          question: 'What is the Prompt-to-App Generator?',
          answer: 'The Prompt-to-App Generator transforms natural language descriptions or visual inputs into fully functional applications. Simply describe your app idea or upload a design mockup, and our AI will generate a complete React Native application with proper architecture, navigation, state management, and styling. You can iterate and refine the generated code through conversational prompts.',
          category: 'advanced',
        },
        {
          id: 'ai-consensus',
          question: 'What is AI Consensus & Validation?',
          answer: 'AI Consensus & Validation leverages multiple AI models to cross-validate code, architectural decisions, and implementations. When generating code or making technical decisions, the system consults multiple models, compares their outputs, identifies best practices, and produces optimized solutions that combine the strengths of each model. This ensures higher reliability and accuracy in generated code.',
          category: 'advanced',
        },
      ],
    },
    {
      id: 'technical',
      name: 'Technical Details',
      icon: <Code color={Colors.Colors.cyan.primary} size={20} />,
      items: [
        {
          id: 'supported-languages',
          question: 'What programming languages are supported?',
          answer: 'gnidoC Terces primarily focuses on React Native development with TypeScript/JavaScript. The platform also supports Python for backend scripts, SQL for database operations, JSON/YAML for configuration, and Markdown for documentation. The AI assistant can help with code in multiple languages including Go, Rust, Swift, and Kotlin.',
          category: 'technical',
        },
        {
          id: 'version-control',
          question: 'How does version control work?',
          answer: 'The platform integrates with Git for version control. You can commit changes, create branches, merge code, and push to remote repositories (GitHub, GitLab, Bitbucket) directly from the mobile interface. All git operations are supported including rebase, cherry-pick, and conflict resolution with visual diff tools.',
          category: 'technical',
        },
        {
          id: 'testing-support',
          question: 'Can I run tests in the app?',
          answer: 'Yes! gnidoC Terces supports running Jest, React Native Testing Library, and Detox tests. You can execute unit tests, integration tests, and end-to-end tests directly from the terminal. The platform provides test coverage reports and can automatically generate test cases using AI.',
          category: 'technical',
        },
        {
          id: 'debugging-tools',
          question: 'What debugging tools are available?',
          answer: 'The platform includes comprehensive debugging tools: console logging with filtering, React DevTools integration, network request inspection, performance profiling, memory leak detection, and crash analytics. You can set breakpoints, inspect variables, and step through code execution on connected devices.',
          category: 'technical',
        },
        {
          id: 'code-quality',
          question: 'How do you ensure code quality?',
          answer: 'gnidoC Terces enforces code quality through ESLint integration, TypeScript strict mode, automated code formatting with Prettier, complexity analysis, code smell detection, and best practice recommendations. The AI assistant is trained on high-quality codebases and follows industry standards.',
          category: 'technical',
        },
        {
          id: 'performance-optimization',
          question: 'How does the platform optimize performance?',
          answer: 'The platform analyzes your code for performance bottlenecks including unnecessary re-renders, memory leaks, large bundle sizes, and inefficient algorithms. It provides actionable recommendations for optimization such as code splitting, lazy loading, memoization, and asset optimization. The AI can automatically refactor code for better performance.',
          category: 'technical',
        },
        {
          id: 'offline-capabilities',
          question: 'Can I work offline?',
          answer: 'Yes! Core IDE features work offline including code editing, file management, and local testing. Projects are cached locally and sync automatically when you reconnect. AI features require internet connectivity, but the platform intelligently queues requests and processes them when online.',
          category: 'technical',
        },
        {
          id: 'data-privacy',
          question: 'How is my code and data protected?',
          answer: 'All code and data is encrypted in transit (TLS 1.3) and at rest (AES-256). Your projects are stored securely in isolated environments. We never train AI models on your private code without explicit permission. You maintain full ownership of all code you create. Enterprise plans offer on-premise deployment options.',
          category: 'technical',
        },
      ],
    },
    {
      id: 'subscription',
      name: 'Subscription & Pricing',
      icon: <Shield color={Colors.Colors.success} size={20} />,
      items: [
        {
          id: 'pricing-tiers',
          question: 'What subscription tiers are available?',
          answer: 'gnidoC Terces offers Free, Pro, and Enterprise tiers. Free includes basic features and limited AI usage. Pro unlocks unlimited AI generations, advanced features, priority support, and team collaboration. Enterprise includes custom deployments, dedicated support, and SLA guarantees. Visit https://gnidoc.xyz/pricing for details.',
          category: 'subscription',
        },
        {
          id: 'free-tier',
          question: 'What is included in the free tier?',
          answer: 'The free tier includes up to 3 projects, 50 AI generations per month, basic code analysis, terminal access, and community support. It\'s perfect for learning and small personal projects. Upgrade anytime to unlock unlimited features.',
          category: 'subscription',
        },
        {
          id: 'payment-methods',
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards, PayPal, and cryptocurrency payments. Enterprise customers can pay via invoice. All subscriptions are billed monthly or annually with a discount for annual plans.',
          category: 'subscription',
        },
        {
          id: 'refund-policy',
          question: 'What is your refund policy?',
          answer: 'We offer a 14-day money-back guarantee for all paid subscriptions. If you\'re not satisfied, contact support within 14 days of purchase for a full refund. No questions asked.',
          category: 'subscription',
        },
        {
          id: 'team-features',
          question: 'Can I collaborate with my team?',
          answer: 'Yes! Pro and Enterprise plans include team collaboration features. Share projects, manage permissions, track team activity, and collaborate in real-time. Enterprise plans support unlimited team members with advanced role-based access control.',
          category: 'subscription',
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
          answer: 'First, try restarting the app. If crashes persist, check for app updates in the App Store/Play Store. Clear the app cache if needed, and ensure you have sufficient device storage. Contact support at support@intruvurt.space if issues continue.',
          category: 'troubleshooting',
        },
        {
          id: 'sync-issues',
          question: 'My projects aren\'t syncing properly',
          answer: 'Ensure you have a stable internet connection and sufficient cloud storage. Try manually syncing from Settings -> Sync. If problems persist, check your account status and contact support for assistance. Check https://gnidoc.xyz/status for service status.',
          category: 'troubleshooting',
        },
        {
          id: 'performance-issues',
          question: 'The app is running slowly',
          answer: 'Close other apps to free up memory, ensure you have adequate storage space, and check your internet connection. Large projects may require more processing time. Consider breaking large projects into smaller modules. Enable performance mode in Settings for better optimization.',
          category: 'troubleshooting',
        },
        {
          id: 'ai-errors',
          question: 'AI features are not working',
          answer: 'Check your internet connection and ensure you haven\'t exceeded your monthly AI usage quota. Verify your subscription status in Settings. If the issue persists, try logging out and back in. Contact support if AI services remain unavailable.',
          category: 'troubleshooting',
        },
        {
          id: 'deployment-failures',
          question: 'My deployment failed',
          answer: 'Check the deployment logs for specific error messages. Common issues include missing environment variables, build errors, or insufficient permissions. Ensure your deployment target is properly configured. Visit https://gnidoc.xyz/docs/deployment for troubleshooting guides.',
          category: 'troubleshooting',
        },
        {
          id: 'code-not-generating',
          question: 'AI is not generating the code I expected',
          answer: 'Try being more specific in your prompts. Include details about the desired functionality, UI/UX requirements, and technical constraints. You can also provide examples or reference existing code. Use the "Refine" feature to iterate on generated code. Check the AI model settings in Preferences to ensure you\'re using the appropriate model for your task.',
          category: 'troubleshooting',
        },
        {
          id: 'import-errors',
          question: 'I\'m getting import/module errors',
          answer: 'Ensure all dependencies are properly installed by running "npm install" or "yarn install" in the terminal. Check that import paths are correct and use the @ alias for absolute imports. Verify that the module exists in package.json. The AI can help resolve dependency conflicts and suggest compatible versions.',
          category: 'troubleshooting',
        },
        {
          id: 'build-errors',
          question: 'My app won\'t build or run',
          answer: 'Common causes include syntax errors, missing dependencies, incompatible package versions, or configuration issues. Check the terminal output for specific error messages. Try clearing the cache with "npm start -- --reset-cache". Ensure your Node.js version is compatible (14+). The Analysis feature can identify build issues automatically.',
          category: 'troubleshooting',
        },
      ],
    },
    {
      id: 'best-practices',
      name: 'Best Practices & Tips',
      icon: <Zap color={Colors.Colors.warning} size={20} />,
      items: [
        {
          id: 'project-structure',
          question: 'How should I structure my projects?',
          answer: 'Follow the recommended structure: organize components by feature, use a /screens folder for main screens, keep shared utilities in /lib, store constants in /constants, manage state with context providers in /contexts, and place API calls in /api. The platform automatically suggests optimal structure based on your project type.',
          category: 'best-practices',
        },
        {
          id: 'naming-conventions',
          question: 'What naming conventions should I follow?',
          answer: 'Use PascalCase for components (UserProfile.tsx), camelCase for functions and variables (getUserData), UPPER_SNAKE_CASE for constants (API_BASE_URL), and kebab-case for file names in non-component files. TypeScript interfaces should be prefixed with I or use descriptive names (UserData, ApiResponse).',
          category: 'best-practices',
        },
        {
          id: 'state-management-tips',
          question: 'When should I use different state management solutions?',
          answer: 'Use useState for local component state, Context API for app-wide state (theme, auth), React Query for server state and caching, and AsyncStorage for persistent data. Avoid prop drilling by lifting state to appropriate levels. The platform can analyze your state usage and suggest optimizations.',
          category: 'best-practices',
        },
        {
          id: 'performance-tips',
          question: 'How can I improve app performance?',
          answer: 'Use React.memo() for expensive components, implement virtualization for long lists (FlatList), optimize images with proper sizing and formats, lazy load screens and components, minimize re-renders with useMemo/useCallback, and reduce bundle size by removing unused dependencies. Run the Performance Analysis tool regularly.',
          category: 'best-practices',
        },
        {
          id: 'security-best-practices',
          question: 'What security practices should I follow?',
          answer: 'Never hardcode API keys or secrets, use environment variables for sensitive data, implement proper authentication and authorization, validate all user inputs, use HTTPS for API calls, keep dependencies updated, enable two-factor authentication, and regularly run security scans. The Security tab provides automated vulnerability detection.',
          category: 'best-practices',
        },
        {
          id: 'ai-prompting-tips',
          question: 'How do I write effective AI prompts?',
          answer: 'Be specific and detailed in your requests, provide context about your project, specify desired technologies and patterns, include examples when possible, break complex tasks into smaller steps, and iterate on generated code with refinement prompts. Use technical terminology and mention specific libraries or frameworks you want to use.',
          category: 'best-practices',
        },
        {
          id: 'collaboration-tips',
          question: 'How can teams collaborate effectively?',
          answer: 'Use feature branches for development, write clear commit messages, document code with comments and README files, establish coding standards, conduct code reviews, use the built-in chat for team communication, and leverage shared workspaces. Enterprise plans include advanced collaboration features like real-time co-editing.',
          category: 'best-practices',
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

        {/* Platform Info */}
        <View style={styles.platformSection}>
          <Text style={styles.platformTitle}>About gnidoC Terces</Text>
          <Text style={styles.platformDescription}>
            gnidoC Terces (Coding Secrets reversed) represents a paradigm shift in mobile development. 
            Our platform combines the power of AI with intuitive mobile-first design to create a 
            professional development environment that fits in your pocket.
          </Text>
          <Text style={styles.platformDescription}>
            Visit <Text style={styles.linkText}>https://gnidoc.xyz</Text> for comprehensive documentation, 
            tutorials, API references, and community resources. Join thousands of developers who are 
            unlocking the secrets of efficient mobile development.
          </Text>
          <View style={styles.platformFeatures}>
            <Text style={styles.featureItem}>✨ AI-Powered Code Generation</Text>
            <Text style={styles.featureItem}>🔍 Advanced Code Analysis</Text>
            <Text style={styles.featureItem}>🗄️ Database Management</Text>
            <Text style={styles.featureItem}>🔬 Research Capabilities</Text>
            <Text style={styles.featureItem}>🚀 One-Click Deployment</Text>
            <Text style={styles.featureItem}>🔗 Extensive Integrations</Text>
            <Text style={styles.featureItem}>🎯 Workflow Automation</Text>
            <Text style={styles.featureItem}>🔒 Enterprise Security</Text>
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
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              🎨 Customize your workspace theme and layout in Settings {'->'} Preferences
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              🔄 Enable auto-sync to keep your projects backed up across devices
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              📚 Check out https://gnidoc.xyz/tutorials for step-by-step guides
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              🏆 Complete challenges to earn achievements and unlock features
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              🤖 Use Multi-Model Orchestration for complex tasks requiring high accuracy
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              🎯 Leverage AI Consensus for critical code decisions and architecture
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              📊 Monitor your deployment analytics to track app performance
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              🔐 Enable security scanning in CI/CD pipelines for automated protection
            </Text>
          </View>
        </View>

        {/* Resources */}
        <View style={styles.resourcesSection}>
          <Text style={styles.resourcesTitle}>Additional Resources</Text>
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://gnidoc.xyz/docs')}
          >
            <Text style={styles.resourceText}>📖 Documentation</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://gnidoc.xyz/tutorials')}
          >
            <Text style={styles.resourceText}>🎓 Tutorials</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://gnidoc.xyz/api')}
          >
            <Text style={styles.resourceText}>🔌 API Reference</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://gnidoc.xyz/community')}
          >
            <Text style={styles.resourceText}>👥 Community Forum</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://gnidoc.xyz/blog')}
          >
            <Text style={styles.resourceText}>📝 Blog</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://gnidoc.xyz/changelog')}
          >
            <Text style={styles.resourceText}>🔔 Changelog</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://gnidoc.xyz/examples')}
          >
            <Text style={styles.resourceText}>💻 Code Examples</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://gnidoc.xyz/templates')}
          >
            <Text style={styles.resourceText}>📋 Project Templates</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://gnidoc.xyz/roadmap')}
          >
            <Text style={styles.resourceText}>🗺️ Product Roadmap</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resourceItem}
            onPress={() => Linking.openURL('https://gnidoc.xyz/status')}
          >
            <Text style={styles.resourceText}>🟢 System Status</Text>
          </TouchableOpacity>
        </View>

        {/* Documentation Section */}
        <View style={styles.documentationSection}>
          <Text style={styles.documentationTitle}>Platform Documentation</Text>
          <Text style={styles.documentationDescription}>
            Comprehensive guides and references for mastering gnidoC Terces
          </Text>
          
          <View style={styles.docCategory}>
            <Text style={styles.docCategoryTitle}>🚀 Getting Started</Text>
            <Text style={styles.docItem}>• Quick Start Guide - Build your first app in 5 minutes</Text>
            <Text style={styles.docItem}>• Installation & Setup - Configure your development environment</Text>
            <Text style={styles.docItem}>• Core Concepts - Understand the platform architecture</Text>
            <Text style={styles.docItem}>• First Project Tutorial - Step-by-step walkthrough</Text>
          </View>

          <View style={styles.docCategory}>
            <Text style={styles.docCategoryTitle}>💻 Development Guides</Text>
            <Text style={styles.docItem}>• React Native Best Practices - Write production-ready code</Text>
            <Text style={styles.docItem}>• TypeScript Integration - Type-safe development</Text>
            <Text style={styles.docItem}>• State Management Patterns - Context, Redux, React Query</Text>
            <Text style={styles.docItem}>• Navigation & Routing - Expo Router implementation</Text>
            <Text style={styles.docItem}>• Styling & Theming - Create beautiful UIs</Text>
            <Text style={styles.docItem}>• API Integration - Connect to backend services</Text>
          </View>

          <View style={styles.docCategory}>
            <Text style={styles.docCategoryTitle}>🤖 AI Features</Text>
            <Text style={styles.docItem}>• AI Code Generation - Prompt engineering for best results</Text>
            <Text style={styles.docItem}>• Multi-Model Orchestration - Leverage multiple AI models</Text>
            <Text style={styles.docItem}>• Prompt-to-App Generator - Transform ideas into apps</Text>
            <Text style={styles.docItem}>• AI Consensus & Validation - Ensure code quality</Text>
            <Text style={styles.docItem}>• Custom AI Workflows - Build automated pipelines</Text>
          </View>

          <View style={styles.docCategory}>
            <Text style={styles.docCategoryTitle}>🔧 Advanced Topics</Text>
            <Text style={styles.docItem}>• Performance Optimization - Speed up your apps</Text>
            <Text style={styles.docItem}>• Security Hardening - Protect your applications</Text>
            <Text style={styles.docItem}>• Testing Strategies - Unit, integration, and E2E tests</Text>
            <Text style={styles.docItem}>• CI/CD Pipelines - Automate deployments</Text>
            <Text style={styles.docItem}>• Database Management - SQL and NoSQL integration</Text>
            <Text style={styles.docItem}>• Monitoring & Analytics - Track app performance</Text>
          </View>

          <View style={styles.docCategory}>
            <Text style={styles.docCategoryTitle}>🚀 Deployment</Text>
            <Text style={styles.docItem}>• Deployment Strategies - Choose the right platform</Text>
            <Text style={styles.docItem}>• Environment Configuration - Manage secrets and variables</Text>
            <Text style={styles.docItem}>• SEO Optimization - Improve discoverability</Text>
            <Text style={styles.docItem}>• Custom Domains - Brand your deployments</Text>
            <Text style={styles.docItem}>• Rollback & Recovery - Handle deployment issues</Text>
          </View>

          <View style={styles.docCategory}>
            <Text style={styles.docCategoryTitle}>🔌 API Reference</Text>
            <Text style={styles.docItem}>• REST API Documentation - Complete endpoint reference</Text>
            <Text style={styles.docItem}>• GraphQL Schema - Query and mutation examples</Text>
            <Text style={styles.docItem}>• WebSocket Events - Real-time communication</Text>
            <Text style={styles.docItem}>• Authentication - OAuth, JWT, and API keys</Text>
            <Text style={styles.docItem}>• Rate Limits & Quotas - Usage guidelines</Text>
          </View>

          <TouchableOpacity 
            style={styles.viewDocsButton}
            onPress={() => Linking.openURL('https://gnidoc.xyz/docs')}
          >
            <Text style={styles.viewDocsButtonText}>View Complete Documentation</Text>
          </TouchableOpacity>
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
  platformSection: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
  },
  platformTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  platformDescription: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  linkText: {
    color: Colors.Colors.cyan.primary,
    fontWeight: '600',
  },
  platformFeatures: {
    marginTop: 8,
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    lineHeight: 20,
  },
  resourcesSection: {
    marginBottom: 32,
  },
  resourcesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 16,
  },
  resourceItem: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  resourceText: {
    fontSize: 16,
    color: Colors.Colors.text.primary,
    fontWeight: '500',
  },
  documentationSection: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: Colors.Colors.red.primary,
  },
  documentationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  documentationDescription: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  docCategory: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  docCategoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Colors.cyan.primary,
    marginBottom: 12,
  },
  docItem: {
    fontSize: 13,
    color: Colors.Colors.text.secondary,
    lineHeight: 22,
    marginBottom: 6,
  },
  viewDocsButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  viewDocsButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.Colors.background.primary,
  },
});