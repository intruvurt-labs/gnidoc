import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
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
  if (variant === 'minimal') {
    return (
      <View style={styles.container}>
        <View style={styles.solidBackground} />
        {children}
      </View>
    );
  }

  if (variant === 'hero') {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/qvhbsg2l35ali5raxtus0' }}
          style={styles.heroBackground}
          resizeMode="cover"
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
    <View style={styles.container}>
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
          source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/qvhbsg2l35ali5raxtus0' }}
          style={styles.patternBackground}
          resizeMode="cover"
          imageStyle={{ opacity: 0.05 }}
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
