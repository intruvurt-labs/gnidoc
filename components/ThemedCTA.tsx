import React from 'react';
import { Animated, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useTheme, useGlowStyle } from '@/contexts/ThemeContext';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

interface ThemedCTAProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

export function ThemedCTA({ title, onPress, disabled = false, testID }: ThemedCTAProps) {
  const { primary } = useTheme();
  const glow = useGlowStyle();

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: primary },
        !disabled && glow,
        disabled && styles.disabled,
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={styles.button}
        testID={testID}
        activeOpacity={0.7}
      >
        <Text style={[styles.text, disabled && styles.disabledText]}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Colors.Colors.text.inverse,
    fontWeight: '700' as const,
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});
