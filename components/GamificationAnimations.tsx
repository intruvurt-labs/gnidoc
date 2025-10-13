import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, StyleProp, ViewStyle } from 'react-native';
import { Sparkles, TrendingUp, Award, Zap } from 'lucide-react-native';
import Colors from '@/constants/colors';

type GamificationType = 'levelUp' | 'achievement' | 'credits' | 'xp';

interface GamificationAnimationsProps {
  type: GamificationType;
  value?: number | string;
  title?: string;
  /** Total on-screen time (includes in/out). */
  duration?: number; // default 2300ms
  /** Where to show the toast. */
  position?: 'top' | 'bottom';
  /** Optional container style override. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Enable light haptics on native platforms. */
  haptics?: boolean;
  onComplete?: () => void;
}

export default function GamificationAnimations({
  type,
  value,
  title,
  duration = 2300,
  position = 'top',
  containerStyle,
  haptics = true,
  onComplete,
}: GamificationAnimationsProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const slide = useRef(new Animated.Value(position === 'top' ? 40 : -40)).current;
  const running = useRef<Animated.CompositeAnimation | null>(null);

  const color = useMemo(() => {
    switch (type) {
      case 'levelUp': return Colors.Colors.warning;
      case 'achievement': return Colors.Colors.cyan.primary;
      case 'credits': return Colors.Colors.success;
      case 'xp': return Colors.Colors.red.primary;
      default: return Colors.Colors.cyan.primary;
    }
  }, [type]);

  const Icon = useMemo(() => {
    switch (type) {
      case 'levelUp': return <TrendingUp color={color} size={32} />;
      case 'achievement': return <Award color={color} size={32} />;
      case 'credits': return <Sparkles color={color} size={32} />;
      case 'xp': return <Zap color={color} size={32} />;
      default: return <Sparkles color={color} size={32} />;
    }
  }, [type, color]);

  const derivedTitle = useMemo(() => {
    if (title) return title;
    switch (type) {
      case 'levelUp': return 'Level Up!';
      case 'achievement': return 'Achievement Unlocked!';
      case 'credits': return 'Credits Earned!';
      case 'xp': return 'XP Gained!';
      default: return 'Success!';
    }
  }, [title, type]);

  const formattedValue = useMemo(() => {
    if (value == null) return undefined;
    if (typeof value === 'number' && (type === 'credits' || type === 'xp')) {
      return `${value >= 0 ? '+' : ''}${value}`;
    }
    return String(value);
  }, [value, type]);

  useEffect(() => {
    // Optional haptics (native only)
    (async () => {
      if (!haptics || Platform.OS === 'web') return;
      try {
        const Haptics = await import('expo-haptics');
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // ignore if not available
      }
    })();

    // Reset starting values (handles repeated shows with new props)
    fade.setValue(0);
    scale.setValue(0.9);
    slide.setValue(position === 'top' ? 40 : -40);

    const inMs = 280;
    const outMs = 280;
    const holdMs = Math.max(600, duration - (inMs + outMs));

    const seq = Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: inMs, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 9 }),
        Animated.timing(slide, { toValue: 0, duration: inMs, useNativeDriver: true }),
      ]),
      Animated.delay(holdMs),
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: outMs, useNativeDriver: true }),
        Animated.timing(slide, { toValue: position === 'top' ? -40 : 40, duration: outMs, useNativeDriver: true }),
      ]),
    ]);

    running.current = seq;
    seq.start(({ finished }) => finished && onComplete?.());

    return () => {
      running.current?.stop();
      running.current = null;
    };
  }, [type, value, title, duration, position, haptics, onComplete, fade, scale, slide]);

  const containerPosStyle =
    position === 'top'
      ? { top: 96, bottom: undefined }
      : { bottom: 96, top: undefined };

  return (
    <View
      pointerEvents="none"
      style={[styles.container, containerPosStyle, containerStyle]}
      accessibilityLiveRegion="polite"
      accessibilityRole="status"
    >
      <Animated.View
        style={[
          styles.notification,
          {
            borderColor: color,
            opacity: fade,
            transform: [{ scale }, { translateY: slide }],
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          {Icon}
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color }]}>{derivedTitle}</Text>
          {formattedValue ? <Text style={styles.value}>{formattedValue}</Text> : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
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
    maxWidth: 560,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  value: { fontSize: 20, fontWeight: 'bold', color: Colors.Colors.text.primary },
});
