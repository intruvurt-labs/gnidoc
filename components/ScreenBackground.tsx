import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ColorValue, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'hero' | 'minimal';
  showPattern?: boolean;
  imageUri?: string;
  overlayOpacity?: number;
  patternOpacity?: number;
  gradientStops?: readonly [ColorValue, ColorValue, ...ColorValue[]];
  fallbackAsset?: number;
  blurhash?: string;
}

const DEFAULT_IMAGE_URI =
  'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/67larhn240y7vp8n0kn5e';

export default function ScreenBackground({
  children,
  variant = 'default',
  showPattern = true,
  imageUri = DEFAULT_IMAGE_URI,
  overlayOpacity = 0.9,
  patternOpacity = 0.12,
  gradientStops,
  fallbackAsset,
  blurhash,
}: ScreenBackgroundProps) {
  const [imageError, setImageError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const scheme = useColorScheme();

  const bgPrimary = Colors.Colors?.background?.primary ?? '#0B0E13';
  const bgSecondary = Colors.Colors?.background?.secondary ?? '#0F1320';

  const defaultStops = useMemo(
    () => [bgPrimary, bgSecondary, bgPrimary] as const,
    [bgPrimary, bgSecondary]
  );

  const heroStops = useMemo(
    () => [
      rgbaFromColor(bgPrimary, clamp01(overlayOpacity * 0.75)),
      rgbaFromColor(bgPrimary, clamp01(overlayOpacity)),
      bgPrimary,
    ] as const,
    [bgPrimary, overlayOpacity]
  );

  useEffect(() => {
    setImageError(false);
  }, [imageUri, reloadKey]);

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
        {!imageError ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.absoluteFill}
            contentFit="cover"
            cachePolicy="disk"
            transition={150}
            accessible={false}
            pointerEvents="none"
            onError={() => setImageError(true)}
            placeholder={blurhash}
          />
        ) : fallbackAsset ? (
          <Image
            source={fallbackAsset}
            style={styles.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessible={false}
            pointerEvents="none"
          />
        ) : null}
        <LinearGradient
          colors={gradientStops ?? heroStops}
          style={styles.absoluteFill}
          pointerEvents="none"
        />
        {children}
        <View
          testID="bg-retry-hitbox"
          pointerEvents="none"
          style={styles.hitbox}
          accessibilityElementsHidden
        />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="screen-bg-default">
      <LinearGradient
        colors={gradientStops ?? defaultStops}
        style={styles.absoluteFill}
        pointerEvents="none"
      />
      {showPattern && !imageError ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.absoluteFill}
          contentFit="cover"
          cachePolicy="disk"
          transition={150}
          accessible={false}
          pointerEvents="none"
          onError={() => setImageError(true)}
          placeholder={blurhash}
        />
      ) : showPattern && fallbackAsset ? (
        <Image
          source={fallbackAsset}
          style={styles.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessible={false}
          pointerEvents="none"
        />
      ) : null}
      {showPattern && (
        <View
          pointerEvents="none"
          style={[styles.absoluteFill, { backgroundColor: rgbaFromColor(bgPrimary, patternOpacity) }]}
        />
      )}
      {children}
    </View>
  );
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function rgbaFromColor(color: string, alpha: number) {
  try {
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const to255 = (h: string) => parseInt(h, 16);
      if (hex.length === 3) {
        const r = to255(hex[0] + hex[0]);
        const g = to255(hex[1] + hex[1]);
        const b = to255(hex[2] + hex[2]);
        return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
      }
      if (hex.length === 6 || hex.length === 8) {
        const r = to255(hex.slice(0, 2));
        const g = to255(hex.slice(2, 4));
        const b = to255(hex.slice(4, 6));
        const a = hex.length === 8 ? to255(hex.slice(6, 8)) / 255 : clamp01(alpha);
        return `rgba(${r}, ${g}, ${b}, ${clamp01(a)})`;
      }
    } else if (color.startsWith('rgb')) {
      const comps = color.match(/[\d.]+/g) ?? [];
      const [r, g, b] = comps.map(Number);
      return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
    }
  } catch {
    // fall through
  }
  return `rgba(0,0,0,${clamp01(alpha)})`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background?.primary ?? '#000',
  },
  solidBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.Colors.background?.primary ?? '#000',
  },
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
  hitbox: {
    position: 'absolute' as const,
    width: 1,
    height: 1,
    right: 0,
    bottom: 0,
  },
});
