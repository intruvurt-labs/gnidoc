import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image'; // ✅ better caching/perf than ImageBackground
import Colors from '@/constants/colors';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'hero' | 'minimal';
  showPattern?: boolean;
  /** Optional override for the “blue ball” art */
  imageUri?: string;
  /** 0 → 1 overlay opacity for the gradient on hero */
  overlayOpacity?: number;
  /** 0 → 1 opacity for the pattern layer in default */
  patternOpacity?: number;
  /** Optional gradient color stops */
  gradientStops?: string[];
}

const DEFAULT_IMAGE_URI =
  'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/67larhn240y7vp8n0kn5e';

export default function ScreenBackground({
  children,
  variant = 'default',
  showPattern = true,
  imageUri = DEFAULT_IMAGE_URI,
  overlayOpacity = 0.9, // softer veil over hero image
  patternOpacity = 0.12,
  gradientStops,
}: ScreenBackgroundProps) {
  // Fallback if remote image fails
  const [imageError, setImageError] = useState(false);

  // Build safe gradient colors (avoid brittle "#hex"+"CC")
  const bgPrimary = Colors.Colors.background.primary;
  const bgSecondary = Colors.Colors.background.secondary;

  const defaultStops = useMemo(
    () => [
      bgPrimary,
      bgSecondary,
      bgPrimary,
    ],
    [bgPrimary, bgSecondary]
  );

  const heroStops = useMemo(
    () => [
      rgbaFromColor(bgPrimary, clamp01(overlayOpacity * 0.8)),
      rgbaFromColor(bgPrimary, clamp01(overlayOpacity * 0.95)),
      bgPrimary,
    ],
    [bgPrimary, overlayOpacity]
  );

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
        {!imageError && (
          <Image
            source={{ uri: imageUri }}
            style={styles.absoluteFill}
            contentFit="cover"
            cachePolicy="disk"
            transition={150}
            accessible={false}
            pointerEvents="none"
            onError={() => setImageError(true)}
            // Optional: tiny blurhash for instant placeholder
            // placeholder={BLURHASH}
          />
        )}
        <LinearGradient
          colors={gradientStops ?? heroStops}
          style={styles.absoluteFill}
          pointerEvents="none"
        />
        {children}
      </View>
    );
  }

  // default
  return (
    <View style={styles.container} testID="screen-bg-default">
      <LinearGradient
        colors={gradientStops ?? defaultStops}
        style={styles.absoluteFill}
        pointerEvents="none"
      />
      {showPattern && !imageError && (
        <Image
          source={{ uri: imageUri }}
          style={styles.absoluteFill}
          contentFit="cover"
          cachePolicy="disk"
          transition={150}
          accessible={false}
          pointerEvents="none"
          onError={() => setImageError(true)}
        />
      )}
      {/* subtle pattern veil */}
      {showPattern && !imageError && (
        <View
          pointerEvents="none"
          style={[styles.absoluteFill, { backgroundColor: rgbaFromColor(bgPrimary, patternOpacity) }]}
        />
      )}
      {children}
    </View>
  );
}

/** Utilities */

function clamp01(n: number) {
  'worklet';
  return Math.max(0, Math.min(1, n));
}

/**
 * Convert a color string to rgba with the provided alpha.
 * Accepts #RGB, #RRGGBB, #RRGGBBAA, or rgb/rgba/ named colors → falls back to given color.
 */
function rgbaFromColor(color: string, alpha: number) {
  // Very lightweight parser—enough for #RGB/#RRGGBB and rgba()
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
        return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
      }
    } else if (color.startsWith('rgb')) {
      // replace alpha if present
      const comps = color.replace(/[^\d.,]/g, '').split(',');
      const [r, g, b] = comps;
      return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
    }
  } catch {
    // fall through
  }
  // fallback overlay using current color (lets RN resolve named colors)
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
});
