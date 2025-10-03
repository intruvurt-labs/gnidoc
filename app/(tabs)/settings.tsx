import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Github,
  Mail,
  HelpCircle,
  Info,

  ChevronRight,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  type: 'toggle' | 'navigation' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [analytics, setAnalytics] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Load settings from storage on mount
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedNotifications = await AsyncStorage.getItem('settings_notifications');
        const storedDarkMode = await AsyncStorage.getItem('settings_darkMode');
        const storedAutoSave = await AsyncStorage.getItem('settings_autoSave');
        const storedAnalytics = await AsyncStorage.getItem('settings_analytics');
        
        if (storedNotifications !== null) {
          setNotifications(JSON.parse(storedNotifications));
        }
        if (storedDarkMode !== null) {
          setDarkMode(JSON.parse(storedDarkMode));
        }
        if (storedAutoSave !== null) {
          setAutoSave(JSON.parse(storedAutoSave));
        }
        if (storedAnalytics !== null) {
          setAnalytics(JSON.parse(storedAnalytics));
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  const handleNotificationToggle = async (value: boolean) => {
    setNotifications(value);
    await AsyncStorage.setItem('settings_notifications', JSON.stringify(value));
  };

  const handleDarkModeToggle = async (value: boolean) => {
    setDarkMode(value);
    await AsyncStorage.setItem('settings_darkMode', JSON.stringify(value));
  };

  const handleAutoSaveToggle = async (value: boolean) => {
    setAutoSave(value);
    await AsyncStorage.setItem('settings_autoSave', JSON.stringify(value));
  };

  const handleAnalyticsToggle = async (value: boolean) => {
    setAnalytics(value);
    await AsyncStorage.setItem('settings_analytics', JSON.stringify(value));
  };

  const handleContactSupport = async () => {
    try {
      const { Linking } = await import('react-native');
      const url = 'mailto:support@intruvurt.space?subject=gnidoC Terces Support Request';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Email Not Available', 'Please send an email to support@intruvurt.space manually.');
      }
    } catch (error) {
      console.error('Failed to open email:', error);
      Alert.alert('Error', 'Failed to open email client.');
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to their default values. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'settings_notifications',
                'settings_darkMode',
                'settings_autoSave',
                'settings_analytics'
              ]);
              setNotifications(true);
              setDarkMode(true);
              setAutoSave(true);
              setAnalytics(false);
              Alert.alert('Success', 'Settings have been reset to defaults.');
            } catch (error) {
              console.error('Failed to reset settings:', error);
              Alert.alert('Error', 'Failed to reset settings.');
            }
          },
        },
      ]
    );
  };

  const handleExportSettings = async () => {
    try {
      const settings = {
        notifications,
        darkMode,
        autoSave,
        analytics,
        exportDate: new Date().toISOString(),
      };
      
      Alert.alert(
        'Export Settings',
        `Settings exported:\n\nNotifications: ${notifications}\nDark Mode: ${darkMode}\nAuto Save: ${autoSave}\nAnalytics: ${analytics}\n\nIn a production app, this would save to a file.`
      );
    } catch (error) {
      console.error('Failed to export settings:', error);
      Alert.alert('Error', 'Failed to export settings.');
    }
  };

  const handleAbout = () => {
    router.push('/about' as any);
  };

  const handleFAQ = () => {
    router.push('/faq' as any);
  };

  const settingSections = [
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          title: 'Profile Settings',
          subtitle: 'Manage your developer profile',
          icon: <User color={Colors.Colors.cyan.primary} size={20} />,
          type: 'navigation' as const,
          onPress: () => Alert.alert('Profile Settings', 'Manage your developer profile, avatar, and personal information. Coming soon!'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          id: 'notifications',
          title: 'Push Notifications',
          subtitle: 'Get notified about build status and updates',
          icon: <Bell color={Colors.Colors.warning} size={20} />,
          type: 'toggle' as const,
          value: notifications,
          onToggle: handleNotificationToggle,
        },
        {
          id: 'darkMode',
          title: 'Dark Mode',
          subtitle: 'Use dark theme for better coding experience',
          icon: <Palette color={Colors.Colors.red.primary} size={20} />,
          type: 'toggle' as const,
          value: darkMode,
          onToggle: handleDarkModeToggle,
        },
        {
          id: 'autoSave',
          title: 'Auto Save',
          subtitle: 'Automatically save your work',
          icon: <Database color={Colors.Colors.success} size={20} />,
          type: 'toggle' as const,
          value: autoSave,
          onToggle: handleAutoSaveToggle,
        },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        {
          id: 'analytics',
          title: 'Usage Analytics',
          subtitle: 'Help improve the app by sharing usage data',
          icon: <Shield color={Colors.Colors.red.primary} size={20} />,
          type: 'toggle' as const,
          value: analytics,
          onToggle: handleAnalyticsToggle,
        },
      ],
    },
    {
      title: 'Integrations',
      items: [
        {
          id: 'github',
          title: 'GitHub Integration',
          subtitle: 'Connect your GitHub repositories',
          icon: <Github color={Colors.Colors.text.secondary} size={20} />,
          type: 'navigation' as const,
          onPress: () => Alert.alert('GitHub Integration', 'Connect your GitHub account to sync repositories and enable version control. Visit Settings > Integrations to set up.'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'contact',
          title: 'Contact Support',
          subtitle: 'support@intruvurt.space',
          icon: <Mail color={Colors.Colors.cyan.primary} size={20} />,
          type: 'action' as const,
          onPress: handleContactSupport,
        },
        {
          id: 'faq',
          title: 'FAQ & Help',
          subtitle: 'Frequently asked questions',
          icon: <HelpCircle color={Colors.Colors.warning} size={20} />,
          type: 'navigation' as const,
          onPress: handleFAQ,
        },
        {
          id: 'about',
          title: 'About',
          subtitle: 'App info and other projects',
          icon: <Info color={Colors.Colors.success} size={20} />,
          type: 'navigation' as const,
          onPress: handleAbout,
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={item.type === 'toggle'}
    >
      <View style={styles.settingContent}>
        <View style={styles.settingIcon}>{item.icon}</View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      <View style={styles.settingAction}>
        {item.type === 'toggle' && item.onToggle && (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{
              false: Colors.Colors.background.secondary,
              true: Colors.Colors.cyan.primary,
            }}
            thumbColor={Colors.Colors.text.inverse}
          />
        )}
        {item.type === 'navigation' && (
          <ChevronRight color={Colors.Colors.text.muted} size={20} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <SettingsIcon color={Colors.Colors.cyan.primary} size={24} />
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settingSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map(renderSettingItem)}
            </View>
          </View>
        ))}

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            gnidoC Terces v1.0.0
          </Text>
          <Text style={styles.versionSubtext}>
            Master Coding Agent • Built with ❤️ by Intruvurt
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.muted,
    paddingHorizontal: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: Colors.Colors.background.card,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.Colors.text.primary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  settingAction: {
    marginLeft: 12,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
  },
});