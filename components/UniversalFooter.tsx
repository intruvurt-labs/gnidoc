import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Image,
  BackHandler,
  AccessibilityInfo,
  Platform,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Settings,
  Database,
  Code,
  Workflow,
  Bot,
  Rocket,
  Terminal,
  Shield,
  Zap,
  TrendingUp,
  Users,
  Gift,
  Palette,
  BarChart3,
  Sparkles,
  Network,
  Key,
  CreditCard,
  Brain,
} from 'lucide-react-native';
import Colors from '@/constants/colors';

const MENU_COLUMNS = 3;
const MENU_PADDING = 20;
const MENU_GAP = 12;

const NAV_ITEMS = [
  { name: 'home', label: 'Home', route: '/(tabs)', icon: Home },
  { name: 'dashboard', label: 'Dashboard', route: '/(tabs)/dashboard', icon: BarChart3 },
  { name: 'agent', label: 'Agent', route: '/(tabs)/agent', icon: Bot },
  { name: 'workflow', label: 'Workflow', route: '/(tabs)/workflow', icon: Workflow },
  { name: 'orchestration', label: 'Orchestration', route: '/(tabs)/orchestration', icon: Network },
  { name: 'research', label: 'Research', route: '/(tabs)/research', icon: Sparkles },
  { name: 'database', label: 'Database', route: '/(tabs)/database', icon: Database },
  { name: 'code', label: 'Code', route: '/(tabs)/code', icon: Code },
  { name: 'terminal', label: 'Terminal', route: '/(tabs)/terminal', icon: Terminal },
  { name: 'deploy', label: 'Deploy', route: '/deploy', icon: Rocket },
  { name: 'security', label: 'Security', route: '/(tabs)/security', icon: Shield },
  { name: 'integrations', label: 'Integrations', route: '/(tabs)/integrations', icon: Zap },
  { name: 'analysis', label: 'Analysis', route: '/(tabs)/analysis', icon: TrendingUp },
  { name: 'leaderboard', label: 'Leaderboard', route: '/(tabs)/leaderboard', icon: Users },
  { name: 'referrals', label: 'Referrals', route: '/(tabs)/referrals', icon: Gift },
  { name: 'themes', label: 'Themes', route: '/themes', icon: Palette },
  { name: 'ai-models', label: 'AI Models', route: '/(tabs)/ai-models', icon: Brain },
  { name: 'api-keys', label: 'API Keys', route: '/(tabs)/api-keys', icon: Key },
  { name: 'subscription', label: 'Subscription', route: '/(tabs)/subscription', icon: CreditCard },
  { name: 'preferences', label: 'Preferences', route: '/(tabs)/preferences', icon: Settings },
];

export default function UniversalFooter() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    expandAnim.stopAnimation();
    rotateAnim.stopAnimation();

    const duration = reduceMotion ? 1 : 300;
    const springCfg = reduceMotion
      ? { toValue: isExpanded ? 1 : 0, useNativeDriver: true, speed: 1, bounciness: 0 }
      : { toValue: isExpanded ? 1 : 0, useNativeDriver: true, tension: 50, friction: 7 };

    Animated.parallel([
      Animated.spring(expandAnim, springCfg as any),
      Animated.timing(rotateAnim, { toValue: isExpanded ? 1 : 0, duration, useNativeDriver: true }),
    ]).start();
  }, [isExpanded, expandAnim, rotateAnim, reduceMotion]);

  useEffect(() => {
    if (!isExpanded) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsExpanded(false);
      return true;
    });
    return () => sub.remove();
  }, [isExpanded]);

  const handleNavigate = useCallback((route: string) => {
    setIsExpanded(false);
    if (pathname === '/' && route === '/(tabs)') return;
    if (pathname.startsWith(route.replace('/(tabs)', ''))) return;
    router.push(route as any);
  }, [pathname, router]);

  const toggleExpand = () => {
    if (!reduceMotion) {
      scaleAnim.stopAnimation();
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setIsExpanded(!isExpanded);
  };

  const isActive = useCallback((route: string) => {
    if (route === '/(tabs)') return pathname === '/' || pathname === '/(tabs)';
    const norm = route.replace('/(tabs)', '');
    return pathname === norm || pathname.startsWith(norm + '/');
  }, [pathname]);

  const containerW = Math.min(width * 0.9, 500);
  const rowGutters = (MENU_COLUMNS - 1) * MENU_GAP;
  const itemW = (containerW - rowGutters - (MENU_PADDING * 2)) / MENU_COLUMNS;

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const menuOpacity = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const menuScale = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const footerHeight = 80 + Math.max(insets.bottom, 10);

  return (
    <View style={[styles.container, { height: footerHeight }]} pointerEvents="box-none">
      {isExpanded && (
        <Pressable
          style={styles.overlay}
          onPress={() => setIsExpanded(false)}
          accessibilityRole="button"
          accessibilityLabel="Close menu overlay"
          accessibilityHint="Closes the expanded quick menu"
        >
          <Animated.View
            style={[
              styles.menuContainer,
              {
                opacity: menuOpacity,
                transform: [{ scale: menuScale }],
                width: containerW,
                marginBottom: 100 + insets.bottom,
              },
            ]}
          >
            <View style={styles.menuGrid} accessibilityRole="menu">
              {NAV_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.route);
                
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.menuItem,
                      active && styles.menuItemActive,
                      { width: itemW, marginRight: ((index + 1) % MENU_COLUMNS === 0) ? 0 : MENU_GAP, marginBottom: MENU_GAP },
                    ]}
                    onPress={() => handleNavigate(item.route)}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: !!active }}
                    accessibilityLabel={item.label}
                    accessibilityHint={`Navigate to ${item.label}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <View style={[styles.menuIconContainer, active && styles.menuIconContainerActive]}>
                      <Icon
                        color={active ? Colors.Colors.text.inverse : Colors.Colors.cyan.primary}
                        size={24}
                      />
                    </View>
                    <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </Pressable>
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity
          style={styles.sphereButton}
          onPress={toggleExpand}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Close menu' : 'Open menu'}
          accessibilityHint="Opens quick navigation grid"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Animated.View
            style={[
              styles.sphereContainer,
              {
                transform: [{ scale: scaleAnim }, { rotate: rotation }],
              },
            ]}
          >
            <Image
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/43sdu1wozhhc59ove8qj5' }}
              style={styles.sphereImage}
              resizeMode="contain"
              accessible
              accessibilityIgnoresInvertColors
              accessibilityLabel="Lucent blue sphere logo"
            />
            <View style={styles.sphereBadge}>
              <Text style={styles.sphereBadgeText}>MENU</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  menuContainer: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 24,
    padding: MENU_PADDING,
    borderWidth: 3,
    borderColor: Colors.Colors.cyan.primary,
    shadowColor: Colors.Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  menuItem: {
    aspectRatio: 1,
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.Colors.border.muted,
  },
  menuItemActive: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderColor: Colors.Colors.cyan.secondary,
  },
  menuIconContainer: {
    marginBottom: 8,
  },
  menuIconContainerActive: {
    opacity: 1,
  },
  menuItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.Colors.text.primary,
    textAlign: 'center',
  },
  menuItemTextActive: {
    color: Colors.Colors.text.inverse,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  sphereButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sphereContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sphereImage: {
    width: 70,
    height: 70,
  },
  sphereBadge: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.Colors.background.primary,
  },
  sphereBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.Colors.text.inverse,
  },
});
