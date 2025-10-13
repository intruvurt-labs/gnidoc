import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Sparkles,
  Network,
  Rocket,
  User,
  Shield,
  BarChart3,
  Trophy,
  Crown,
  Gift,
  Database,
  Terminal,
  FileCode,
  Brain,
} from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

interface NavItem {
  name: string;
  icon: React.ComponentType<any>;
  route: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'home', icon: Home, route: '/(tabs)', label: 'Home' },
  { name: 'agent', icon: Sparkles, route: '/(tabs)/agent', label: 'Canvas' },
  { name: 'orchestration', icon: Network, route: '/(tabs)/orchestration', label: 'Orchestrate' },
  { name: 'code', icon: Rocket, route: '/(tabs)/code', label: 'Deploy' },
  { name: 'preferences', icon: User, route: '/(tabs)/preferences', label: 'Profile' },
  { name: 'security', icon: Shield, route: '/(tabs)/security', label: 'Security' },
  { name: 'dashboard', icon: BarChart3, route: '/(tabs)/dashboard', label: 'Dashboard' },
  { name: 'leaderboard', icon: Trophy, route: '/(tabs)/leaderboard', label: 'Leaderboard' },
  { name: 'subscription', icon: Crown, route: '/(tabs)/subscription', label: 'Subscription' },
  { name: 'referrals', icon: Gift, route: '/(tabs)/referrals', label: 'Referrals' },
  { name: 'database', icon: Database, route: '/(tabs)/database', label: 'Database' },
  { name: 'terminal', icon: Terminal, route: '/(tabs)/terminal', label: 'Terminal' },
  { name: 'research', icon: FileCode, route: '/(tabs)/research', label: 'Research' },
  { name: 'integrations', icon: Brain, route: '/(tabs)/integrations', label: 'Integrations' },
];

export default function UniversalFooter() {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isExpanded) {
      Animated.parallel([
        Animated.spring(expandAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(expandAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isExpanded, expandAnim, rotateAnim]);

  const handleNavigate = (route: string) => {
    setIsExpanded(false);
    router.push(route as any);
  };

  const toggleExpand = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsExpanded(!isExpanded);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const menuScale = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const menuOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  const isActive = (route: string) => {
    if (route === '/(tabs)') {
      return pathname === '/' || pathname === '/(tabs)';
    }
    return pathname.includes(route.replace('/(tabs)/', ''));
  };

  return (
    <>
      {isExpanded && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsExpanded(false)}
        >
          <Animated.View
            style={[
              styles.menuContainer,
              {
                opacity: menuOpacity,
                transform: [{ scale: menuScale }],
              },
            ]}
          >
            <View style={styles.menuGrid}>
              {NAV_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.route);
                
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.menuItem,
                      active && styles.menuItemActive,
                    ]}
                    onPress={() => handleNavigate(item.route)}
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
        </TouchableOpacity>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom || 8 }]}>
        <TouchableOpacity
          style={styles.sphereButton}
          onPress={toggleExpand}
          activeOpacity={0.8}
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
            />
            <View style={styles.sphereBadge}>
              <Text style={styles.sphereBadgeText}>MENU</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 12,
    backgroundColor: 'transparent',
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  sphereButton: {
    marginBottom: 8,
    pointerEvents: 'auto',
  },
  sphereContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.Colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.Colors.cyan.primary,
    shadowColor: Colors.Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  sphereImage: {
    width: 70,
    height: 70,
  },
  sphereBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: Colors.Colors.red.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.Colors.background.primary,
  },
  sphereBadgeText: {
    color: Colors.Colors.text.inverse,
    fontSize: 9,
    fontWeight: 'bold' as const,
    letterSpacing: 0.5,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    zIndex: 9998,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: width * 0.9,
    maxWidth: 500,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 24,
    padding: 20,
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
    gap: 12,
    justifyContent: 'center',
  },
  menuItem: {
    width: (width * 0.9 - 80) / 3,
    maxWidth: 110,
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
    shadowColor: Colors.Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.Colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
  },
  menuIconContainerActive: {
    backgroundColor: Colors.Colors.cyan.secondary,
    borderColor: Colors.Colors.text.inverse,
  },
  menuItemText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    textAlign: 'center',
  },
  menuItemTextActive: {
    color: Colors.Colors.text.inverse,
    fontWeight: '700' as const,
  },
});
