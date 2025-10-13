import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
  AccessibilityInfo,
  Easing,
} from 'react-native';
import { Info, CheckCircle, AlertCircle, XCircle, X } from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

export type ToastType = 'info' | 'success' | 'warning' | 'error';
type Position = 'top' | 'bottom';

interface BrandedToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss?: () => void;

  // New (optional)
  position?: Position;            // 'top' | 'bottom' (default 'top')
  topOffset?: number;             // px from top (default 60)
  bottomOffset?: number;          // px from bottom (default 32)
  actionLabel?: string;           // e.g., "Undo"
  onAction?: () => void;
  maxLines?: number;              // truncation (default 3)
  testID?: string;
}

export default function BrandedToast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
  position = 'top',
  topOffset = 60,
  bottomOffset = 32,
  actionLabel,
  onAction,
  maxLines = 3,
  testID = 'branded-toast',
}: BrandedToastProps) {
  const translate = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Respect reduced motion
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotionRef.current = !!enabled;
    });

    return () => {
      mounted = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (visible) {
      // Announce to screen readers
      AccessibilityInfo.announceForAccessibility?.(message);

      const anims = [
        Animated.timing(opacity, {
          toValue: 1,
          duration: reduceMotionRef.current ? 1 : 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration: reduceMotionRef.current ? 1 : 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ];

      Animated.parallel(anims).start();

      if (duration > 0) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          handleDismiss();
        }, duration);
      }
    } else {
      // animate out if parent flips `visible` to false
      handleDismiss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, duration, message, position]);

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translate, {
        toValue: position === 'top' ? -100 : 100,
        duration: reduceMotionRef.current ? 1 : 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: reduceMotionRef.current ? 1 : 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  const config = getToastConfig(type);

  if (!visible) return null;

  const containerPosStyle =
    position === 'top'
      ? { top: topOffset }
      : { bottom: bottomOffset };

  return (
    <Animated.View
      testID={testID}
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        containerPosStyle,
        {
          transform: [{ translateY: translate }],
          opacity,
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: withAlpha(config.color, 0.15),
            borderColor: config.color,
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <config.icon color={config.color} size={22} />
        </View>

        <Text
          style={[styles.message, { color: config.color }]}
          numberOfLines={maxLines}
        >
          {message}
        </Text>

        {actionLabel && onAction ? (
          <TouchableOpacity
            onPress={onAction}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={[styles.actionText, { color: config.color }]}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          <X color={config.color} size={18} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function getToastConfig(type: ToastType) {
  switch (type) {
    case 'success':
      return { icon: CheckCircle, color: Colors.Colors.success };
    case 'warning':
      return { icon: AlertCircle, color: Colors.Colors.warning };
    case 'error':
      return { icon: XCircle, color: Colors.Colors.error };
    default:
      return { icon: Info, color: Colors.Colors.cyan.primary };
  }
}

// Safer alpha utility for web/native (returns rgba)
function withAlpha(hexOrRgba: string, alpha: number) {
  // If already rgba(...), just swap alpha
  if (hexOrRgba.startsWith('rgb')) {
    const parts = hexOrRgba.replace(/[^\d.,]/g, '').split(',');
    const [r, g, b] = parts.map((n) => parseFloat(n));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  // assume hex #rrggbb
  const hex = hexOrRgba.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
  },
  container: {
    maxWidth: width - 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === 'web' ? 0.2 : 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  iconContainer: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  actionButton: {
    marginLeft: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    marginLeft: 8,
    padding: 6,
  },
});
