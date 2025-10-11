import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Sparkles, TrendingUp, Award, Zap } from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width, height } = Dimensions.get('window');

interface GamificationAnimationsProps {
  type: 'levelUp' | 'achievement' | 'credits' | 'xp';
  value?: number | string;
  title?: string;
  onComplete?: () => void;
}

export default function GamificationAnimations({
  type,
  value,
  title,
  onComplete,
}: GamificationAnimationsProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(2000),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  }, [fadeAnim, scaleAnim, slideAnim, onComplete]);

  const getIcon = () => {
    switch (type) {
      case 'levelUp':
        return <TrendingUp color={Colors.Colors.warning} size={32} />;
      case 'achievement':
        return <Award color={Colors.Colors.cyan.primary} size={32} />;
      case 'credits':
        return <Sparkles color={Colors.Colors.success} size={32} />;
      case 'xp':
        return <Zap color={Colors.Colors.red.primary} size={32} />;
      default:
        return <Sparkles color={Colors.Colors.cyan.primary} size={32} />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'levelUp':
        return Colors.Colors.warning;
      case 'achievement':
        return Colors.Colors.cyan.primary;
      case 'credits':
        return Colors.Colors.success;
      case 'xp':
        return Colors.Colors.red.primary;
      default:
        return Colors.Colors.cyan.primary;
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'levelUp':
        return 'Level Up!';
      case 'achievement':
        return 'Achievement Unlocked!';
      case 'credits':
        return 'Credits Earned!';
      case 'xp':
        return 'XP Gained!';
      default:
        return 'Success!';
    }
  };

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.notification,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
            borderColor: getColor(),
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: getColor() + '20' }]}>
          {getIcon()}
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: getColor() }]}>{getTitle()}</Text>
          {value && (
            <Text style={styles.value}>
              {typeof value === 'number' && type === 'credits' ? `+${value}` : value}
            </Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 280,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.Colors.text.primary,
  },
});
