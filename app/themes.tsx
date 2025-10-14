import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  PanResponder,
  LayoutChangeEvent,
  AccessibilityInfo,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors, { Shadows } from '@/constants/colors';
import MatrixGridBackground from '@/components/MatrixGridBackground';

// Optional gradient – if not available, we’ll render solid blocks.
let LinearGradient: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch {
  LinearGradient = null;
}

interface Theme {
  id: string;
  name: string;
  preview: string[];
}

type SavedTheme = {
  themeId: string;
  glowIntensity: number;
  pulseSpeed: number;
};

const STORAGE_KEY = 'app-theme';

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

/** Reusable slider with drag + tap support */
function Slider({
  value,
  onChange,
  label,
  testID,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  testID?: string;
}) {
  const trackWidth = useRef(1);
  const [local, setLocal] = useState(value);

  const setByX = useCallback(
    (x: number) => {
      const pct = clamp((x / trackWidth.current) * 100);
      setLocal(pct);
      onChange(pct);
    },
    [onChange]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: evt => {
          const x = evt.nativeEvent.locationX;
          setByX(x);
          Haptics.selectionAsync().catch(() => {});
        },
        onPanResponderMove: evt => {
          const x = evt.nativeEvent.locationX;
          setByX(x);
        },
        onPanResponderRelease: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        },
      }),
    [setByX]
  );

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = Math.max(1, e.nativeEvent.layout.width);
  };

  // Keep local in sync if external changes
  React.useEffect(() => setLocal(value), [value]);

  return (
    <View style={styles.sliderContainer} accessibilityRole="adjustable" accessibilityLabel={label}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View
        style={styles.sliderTrack}
        onLayout={onTrackLayout}
        {...panResponder.panHandlers}
        testID={testID}
      >
        <View style={[styles.sliderFill, { width: `${local}%` }]} />
        <View style={[styles.sliderThumb, { left: `${local}%` }]} />
      </View>
      <Text style={styles.sliderValue}>{Math.round(local)}%</Text>
    </View>
  );
}

export default function ThemesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedTheme, setSelectedTheme] = useState<string>('cyan_red_power');
  const [glowIntensity, setGlowIntensity] = useState<number>(60);
  const [pulseSpeed, setPulseSpeed] = useState<number>(50);

  const themes: Theme[] = [
    { id: 'cyan_red_power', name: 'Cyan-Red Power', preview: [Colors.Colors.cyan.primary, Colors.Colors.red.primary] },
    { id: 'lime_purple_elite', name: 'Lime-Purple Elite', preview: [Colors.Colors.lime.primary, Colors.Colors.purple.primary] },
    { id: 'matrix_noir', name: 'Matrix Noir', preview: [Colors.Colors.black.ink, Colors.Colors.cyan.primary] },
    { id: 'neon_magenta', name: 'Neon Magenta', preview: [Colors.Colors.magenta.primary, Colors.Colors.yellow.primary] },
  ];

  // Load saved theme on mount
  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: SavedTheme = JSON.parse(raw);
          setSelectedTheme(saved.themeId);
          setGlowIntensity(saved.glowIntensity);
          setPulseSpeed(saved.pulseSpeed);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const applyTheme = useCallback(async () => {
    const payload: SavedTheme = {
      themeId: selectedTheme,
      glowIntensity,
      pulseSpeed,
    };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      AccessibilityInfo.announceForAccessibility?.('Theme applied');
      router.back();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [glowIntensity, pulseSpeed, router, selectedTheme]);

  const currentTheme = useMemo(
    () => themes.find(t => t.id === selectedTheme) ?? themes[0],
    [selectedTheme, themes]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <MatrixGridBackground parallax />

      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Palette color={Colors.Colors.cyan.primary} size={24} />
          <Text style={styles.headerTitle}>Theme Lab</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme Presets</Text>
          <View style={styles.themesGrid}>
            {themes.map((theme) => {
              const isActive = selectedTheme === theme.id;
              const PreviewInner = (
                LinearGradient ? (
                  <LinearGradient
                    colors={theme.preview}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.themePreview}
                  />
                ) : (
                  <View style={styles.themePreview}>
                    {/* fallback to two solid halves */}
                    <View style={[styles.colorBlock, { backgroundColor: theme.preview[0] }]} />
                    <View style={[styles.colorBlock, { backgroundColor: theme.preview[1] }]} />
                  </View>
                )
              );

              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[styles.themeCard, isActive && styles.themeCardActive]}
                  onPress={() => {
                    setSelectedTheme(theme.id);
                    Haptics.selectionAsync().catch(() => {});
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Theme ${theme.name}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {PreviewInner}
                  <Text style={styles.themeName}>{theme.name}</Text>
                  {isActive && (
                    <View style={styles.checkmark}>
                      <Check color={Colors.Colors.text.inverse} size={16} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Customization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customization</Text>

          <Slider
            label="Glow Intensity"
            value={glowIntensity}
            onChange={setGlowIntensity}
            testID="glow-slider"
          />

          <Slider
            label="Pulse Speed"
            value={pulseSpeed}
            onChange={setPulseSpeed}
            testID="pulse-slider"
          />
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View
            style={[
              styles.previewCard,
              {
                // simulate glow using intensity
                shadowOpacity: Math.min(0.95, 0.2 + glowIntensity / 200),
                shadowRadius: 10 + glowIntensity / 4,
                borderColor: currentTheme.preview[0],
              },
            ]}
          >
            <Text style={styles.previewTitle}>Sample UI Element</Text>
            <Text style={styles.previewText}>
              This is how your theme will look in the app.
            </Text>
            <TouchableOpacity
              style={[
                styles.previewButton,
                {
                  backgroundColor: currentTheme.preview[0],
                  opacity: 0.9,
                },
              ]}
              onPress={() => Haptics.selectionAsync().catch(() => {})}
              accessibilityRole="button"
              accessibilityLabel="Sample action button"
            >
              <Text style={styles.previewButtonText}>Action Button</Text>
            </TouchableOpacity>
            <Text style={[styles.previewText, { marginTop: 12, opacity: 0.7 }]}>
              Pulse speed: {Math.round(pulseSpeed)}%
            </Text>
          </View>
        </View>

        {/* Apply */}
        <TouchableOpacity
          style={styles.applyButton}
          onPress={applyTheme}
          accessibilityRole="button"
          accessibilityLabel="Apply Theme"
        >
          <Text style={styles.applyButtonText}>Apply Theme</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Colors.black.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: Colors.Colors.cyan.primary,
    gap: 12,
  },
  backButton: { padding: 8 },
  backText: { fontSize: 24, color: Colors.Colors.cyan.primary },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.Colors.cyan.primary },
  content: { flex: 1 },
  section: { paddingHorizontal: 20, paddingVertical: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.lime.primary,
    marginBottom: 16,
  },
  themesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeCard: {
    width: '48%',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.Colors.border.muted,
    position: 'relative',
    overflow: 'hidden',
  },
  themeCardActive: {
    borderColor: Colors.Colors.cyan.primary,
    ...Shadows.glowCyan,
  },
  themePreview: {
    flexDirection: 'row',
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  colorBlock: { flex: 1 },
  themeName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.Colors.cyan.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /** Slider */
  sliderContainer: { marginBottom: 24 },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  sliderTrack: {
    height: 12,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 6,
    position: 'relative',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 6,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.Colors.cyan.primary,
    borderWidth: 3,
    borderColor: Colors.Colors.white.primary,
    marginLeft: -14,
    ...Shadows.glowCyan,
  },
  sliderValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.muted,
    textAlign: 'right',
  },

  /** Preview */
  previewCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    shadowColor: Colors.Colors.cyan.primary,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: Colors.Colors.text.primary,
    marginBottom: 16,
    lineHeight: 20,
  },
  previewButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.Colors.text.inverse,
  },

  /** Apply */
  applyButton: {
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: Colors.Colors.lime.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Shadows.glowLime,
  },
  applyButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.text.inverse,
  },
});
