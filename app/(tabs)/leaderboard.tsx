import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,

  Platform,
} from 'react-native';

import {
  User,
  Crown,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Mail,
  Globe,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

type ToggleRow = {
  kind: 'toggle';
  icon: React.ComponentType<any>;
  label: string;
  value: boolean;
  onToggle: (next: boolean) => void;
  testID?: string;
};

type NavRow = {
  kind: 'nav';
  icon: React.ComponentType<any>;
  label: string;
  value?: string;
  rightIcon?: boolean;
  isPremiumBadge?: boolean;
  onPress?: () => void;
  testID?: string;
};

type SettingsRow = ToggleRow | NavRow;

type SettingsSection = {
  title: string;
  items: SettingsRow[];
};

const STORAGE_KEYS = {
  notifications: 'settings.notifications',
  weeklyDigest: 'settings.weeklyDigest',
  showTooltips: 'settings.showTooltips',
} as const;

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [showTooltips, setShowTooltips] = useState(true);

  // Load persisted toggles
  useEffect(() => {
    (async () => {
      try {
        const [nRaw, wRaw, tRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.notifications),
          AsyncStorage.getItem(STORAGE_KEYS.weeklyDigest),
          AsyncStorage.getItem(STORAGE_KEYS.showTooltips),
        ]);
        if (nRaw != null) setNotifications(nRaw === '1');
        if (wRaw != null) setWeeklyDigest(wRaw === '1');
        if (tRaw != null) setShowTooltips(tRaw === '1');
      } catch {}
    })();
  }, []);

  // Persist on change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.notifications, notifications ? '1' : '0').catch(() => {});
  }, [notifications]);
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.weeklyDigest, weeklyDigest ? '1' : '0').catch(() => {});
  }, [weeklyDigest]);
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.showTooltips, showTooltips ? '1' : '0').catch(() => {});
  }, [showTooltips]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }, [logout]);

  const handleResetOnboarding = useCallback(() => {
    Alert.alert('Reset Onboarding', 'This will show all tooltips and guides again. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          await AsyncStorage.setItem(STORAGE_KEYS.showTooltips, '1');
          setShowTooltips(true);
          Alert.alert('Success', 'Onboarding has been reset. Restart the app to see the welcome screen.');
        },
      },
    ]);
  }, []);

  const goUpgrade = useCallback(() => router.push('/upgrade' as any), []);
  const goHelp = useCallback(() => router.push('/help' as any), []);
  const goPrivacy = useCallback(() => router.push('/privacy' as any), []);

  const maybeHaptics = (type: 'light' | 'success' | 'warning' = 'light') => {
    const map = {
      light: Haptics.selectionAsync,
      success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    } as const;
    map[type]().catch(() => {});
  };

  const sections: SettingsSection[] = useMemo(
    () => [
      {
        title: 'Account',
        items: [
          {
            kind: 'nav',
            icon: User,
            label: 'Profile',
            value: user?.email ?? '',
            onPress: () => {},
            rightIcon: true,
          },
          {
            kind: 'nav',
            icon: Globe,
            label: 'Store',
            value: user?.name ?? '',
            onPress: () => {},
            rightIcon: true,
          },
          {
            kind: 'nav',
            icon: Crown,
            label: 'Subscription',
            value: user?.subscription === 'free' ? 'Free Plan' : user?.subscription?.toUpperCase() ?? 'Free Plan',
            isPremiumBadge: user?.subscription !== 'free',
            onPress: user?.subscription === 'free' ? goUpgrade : undefined,
            rightIcon: true,
          },
        ],
      },
      {
        title: 'Preferences',
        items: [
          {
            kind: 'toggle',
            icon: Bell,
            label: 'Push Notifications',
            value: notifications,
            onToggle: (v) => {
              setNotifications(v);
              maybeHaptics('light');
            },
            testID: 'toggle-notifications',
          },
          {
            kind: 'toggle',
            icon: Mail,
            label: 'Weekly Digest',
            value: weeklyDigest,
            onToggle: (v) => {
              setWeeklyDigest(v);
              maybeHaptics('light');
            },
            testID: 'toggle-weekly',
          },
          {
            kind: 'toggle',
            icon: HelpCircle,
            label: 'Show Tooltips',
            value: showTooltips,
            onToggle: (v) => {
              setShowTooltips(v);
              maybeHaptics('light');
            },
            testID: 'toggle-tooltips',
          },
        ],
      },
      {
        title: 'Support',
        items: [
          { kind: 'nav', icon: HelpCircle, label: 'Help Center', onPress: goHelp, rightIcon: true },
          { kind: 'nav', icon: HelpCircle, label: 'Reset Onboarding', onPress: handleResetOnboarding, rightIcon: true },
          { kind: 'nav', icon: Shield, label: 'Privacy Policy', onPress: goPrivacy, rightIcon: true },
        ],
      },
    ],
    [user?.email, user?.name, user?.subscription, notifications, weeklyDigest, showTooltips, goUpgrade, goHelp, goPrivacy, handleResetOnboarding]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Neon User Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <User size={28} color={Colors.Colors.text.inverse} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
            {user?.subscription && user.subscription !== 'free' && (
              <View style={styles.premiumBadge}>
                <Crown size={12} color={Colors.Colors.yellow.primary} />
                <Text style={styles.premiumText}>{user.subscription.charAt(0).toUpperCase() + user.subscription.slice(1)} Member</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sections */}
        {sections.map((section, sIdx) => (
          <View key={sIdx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, iIdx) => {
                const Icon = item.icon;
                const isLast = iIdx === section.items.length - 1;

                if (item.kind === 'toggle') {
                  return (
                    <View
                      key={`${section.title}-${iIdx}`}
                      style={[styles.settingItem, !isLast && styles.settingItemBorder]}
                      accessibilityRole="adjustable"
                    >
                      <View style={styles.settingLeft}>
                        <Icon size={20} color={Colors.Colors.text.muted} />
                        <Text style={styles.settingLabel}>{item.label}</Text>
                      </View>
                      <Switch
                        testID={item?.testID}
                        value={item.value}
                        onValueChange={item.onToggle}
                      />
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    key={`${section.title}-${iIdx}`}
                    style={[styles.settingItem, !isLast && styles.settingItemBorder]}
                    onPress={item.onPress}
                    accessibilityRole="button"
                  >
                    <View style={styles.settingLeft}>
                      <Icon size={20} color={Colors.Colors.text.muted} />
                      <Text style={styles.settingLabel}>{item.label}</Text>
                    </View>
                    <View style={styles.settingRight}>
                      {!!item.value && <Text style={styles.settingValue}>{item.value}</Text>}
                      {!!item.isPremiumBadge && <Crown size={16} color={Colors.Colors.yellow.primary} style={styles.premiumIcon} />}
                      {item.rightIcon !== false && <ChevronRight size={20} color={Colors.Colors.text.muted} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => {
            maybeHaptics('warning');
            handleSignOut();
          }}
          testID="sign-out-button"
          accessibilityRole="button"
        >
          <LogOut size={20} color={Colors.Colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Meta-Master v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Colors.background.primary },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.Colors.border.primary,
    shadowColor: '#00ffff',
    shadowOpacity: Platform.select({ ios: 0.25, android: 0.0 }) as number,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.Colors.cyan.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: { flex: 1, marginLeft: 16 },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.Colors.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
    marginBottom: 6,
  },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  premiumText: {
    fontSize: 12,
    color: Colors.Colors.yellow.primary,
    fontWeight: '600',
    marginLeft: 4,
  },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.Colors.text.secondary,
    marginHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.Colors.border.muted },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingLabel: { fontSize: 16, color: Colors.Colors.text.primary, marginLeft: 12 },
  settingRight: { flexDirection: 'row', alignItems: 'center' },
  settingValue: { fontSize: 14, color: Colors.Colors.text.secondary, marginRight: 8 },
  premiumIcon: { marginRight: 8 },

  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.Colors.background.card,
    marginHorizontal: 16, marginBottom: 16, padding: 16,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.Colors.error
  },
  signOutText: { fontSize: 16, fontWeight: '700', color: Colors.Colors.error, marginLeft: 8 },
  version: { fontSize: 12, color: Colors.Colors.text.secondary, textAlign: 'center', marginBottom: 32 },
});
