import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Info, CheckCircle, AlertCircle, XCircle, X } from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface BrandedToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss?: () => void;
}

export default function BrandedToast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
}: BrandedToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      handleDismiss();
    }
  }, [visible, duration]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          color: Colors.Colors.success,
          bgColor: Colors.Colors.success + '20',
          borderColor: Colors.Colors.success,
        };
      case 'warning':
        return {
          icon: AlertCircle,
          color: Colors.Colors.warning,
          bgColor: Colors.Colors.warning + '20',
          borderColor: Colors.Colors.warning,
        };
      case 'error':
        return {
          icon: XCircle,
          color: Colors.Colors.error,
          bgColor: Colors.Colors.error + '20',
          borderColor: Colors.Colors.error,
        };
      default:
        return {
          icon: Info,
          color: Colors.Colors.cyan.primary,
          bgColor: Colors.Colors.cyan.primary + '20',
          borderColor: Colors.Colors.cyan.primary,
        };
    }
  };

  const config = getToastConfig();
  const IconComponent = config.icon;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <IconComponent color={config.color} size={24} />
      </View>
      <Text style={[styles.message, { color: config.color }]} numberOfLines={2}>
        {message}
      </Text>
      <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
        <X color={config.color} size={20} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    top: 60,
    left: 16,
    right: 16,
    maxWidth: width - 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  iconContainer: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});
