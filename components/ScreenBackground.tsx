import React, { useMemo } from 'react';
import { View, StyleSheet, ImageBackground, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'hero' | 'minimal';
  showPattern?: boolean;
}

export default function ScreenBackground({
  children,
  variant = 'default',
  showPattern = true,
}: ScreenBackgroundProps) {
  const blueBallUri = useMemo(() => {
    return (
      'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/67larhn240y7vp8n0kn5e'
    );
  }, []);

  if (variant === 'minimal') {
    return (
      <View style={styles.container} testID="screen-bg-minimal">
        <View style={styles.solidBackground} />
        {children}
      </View>
    );
  }

  if (variant === 'hero') {
    return (
      <View style={styles.container} testID="screen-bg-hero">
        <ImageBackground
          source={{ uri: blueBallUri }}
          style={styles.heroBackground}
          resizeMode="cover"
          onError={(e) => {
            console.log('[ScreenBackground] hero image failed', e.nativeEvent?.error ?? 'unknown');
          }}
        >
          <LinearGradient
            colors={[
              Colors.Colors.background.primary + 'CC',
              Colors.Colors.background.primary + 'E6',
              Colors.Colors.background.primary,
            ]}
            style={styles.gradient}
          />
        </ImageBackground>
        {children}
      </View>
    );
  }

  return (
    <View style={styles.container} testID="screen-bg-default">
      <LinearGradient
        colors={[
          Colors.Colors.background.primary,
          Colors.Colors.background.secondary,
          Colors.Colors.background.primary,
        ]}
        style={styles.gradient}
      />
      {showPattern && (
        <ImageBackground
          source={{ uri: blueBallUri }}
          style={styles.patternBackground}
          resizeMode="cover"
          imageStyle={{ opacity: 0.12 }}
          onError={(e) => {
            console.log('[ScreenBackground] pattern image failed', e.nativeEvent?.error ?? 'unknown');
          }}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  solidBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.Colors.background.primary,
  },
  heroBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  patternBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
