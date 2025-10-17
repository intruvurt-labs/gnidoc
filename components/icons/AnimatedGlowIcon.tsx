import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Custom3DIcon, { IconType } from './Custom3DIcon';

interface AnimatedGlowIconProps {
  type: IconType;
  size?: number;
  glowColor?: string;
  glowIntensity?: number;
  pulseSpeed?: number;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedGlowIcon({
  type,
  size = 48,
  glowColor = '#00FFFF',
  glowIntensity = 0.6,
  pulseSpeed = 2000,
  style,
}: AnimatedGlowIconProps) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: pulseSpeed / 2,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: pulseSpeed / 2,
          useNativeDriver: true,
        }),
      ])
    );

    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    if (type === 'settings') {
      rotateAnimation.start();
    }

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
    };
  }, [glowAnim, rotateAnim, pulseSpeed, type]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [glowIntensity * 0.3, glowIntensity],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.glowContainer,
          {
            width: size * 1.6,
            height: size * 1.6,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      >
        <View
          style={[
            styles.glow,
            {
              backgroundColor: glowColor,
              shadowColor: glowColor,
              shadowOpacity: 0.8,
              shadowRadius: size * 0.5,
              borderRadius: size * 0.8,
            },
          ]}
        />
      </Animated.View>
      <Animated.View
        style={{
          transform: [{ rotate: type === 'settings' ? rotate : '0deg' }],
        }}
      >
        <Custom3DIcon type={type} size={size} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: '100%',
    height: '100%',
    elevation: 10,
  },
});
