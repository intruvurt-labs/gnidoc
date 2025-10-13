import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Check } from 'lucide-react-native';
import Colors, { Shadows } from '@/constants/colors';
import MatrixGridBackground from '@/components/MatrixGridBackground';

interface Theme {
  id: string;
  name: string;
  preview: string[];
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <MatrixGridBackground parallax />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Palette color={Colors.Colors.cyan.primary} size={24} />
          <Text style={styles.headerTitle}>Theme Lab</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme Presets</Text>
          <View style={styles.themesGrid}>
            {themes.map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeCard,
                  selectedTheme === theme.id && styles.themeCardActive,
                ]}
                onPress={() => setSelectedTheme(theme.id)}
              >
                <View style={styles.themePreview}>
                  {theme.preview.map((color, index) => (
                    <View
                      key={`${theme.id}-color-${index}`}
                      style={[
                        styles.colorBlock,
                        { backgroundColor: color },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.themeName}>{theme.name}</Text>
                {selectedTheme === theme.id && (
                  <View style={styles.checkmark}>
                    <Check color={Colors.Colors.text.inverse} size={16} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customization</Text>
          
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Glow Intensity</Text>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderFill,
                  { width: `${glowIntensity}%` },
                ]}
              />
              <TouchableOpacity
                style={[
                  styles.sliderThumb,
                  { left: `${glowIntensity}%` },
                ]}
                onPress={() => {}}
              />
            </View>
            <Text style={styles.sliderValue}>{glowIntensity}%</Text>
          </View>

          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Pulse Speed</Text>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderFill,
                  { width: `${pulseSpeed}%` },
                ]}
              />
              <TouchableOpacity
                style={[
                  styles.sliderThumb,
                  { left: `${pulseSpeed}%` },
                ]}
                onPress={() => {}}
              />
            </View>
            <Text style={styles.sliderValue}>{pulseSpeed}%</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Sample UI Element</Text>
            <Text style={styles.previewText}>
              This is how your theme will look in the app
            </Text>
            <TouchableOpacity style={styles.previewButton}>
              <Text style={styles.previewButtonText}>Action Button</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Apply Theme</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.black.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: Colors.Colors.cyan.primary,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 24,
    color: Colors.Colors.cyan.primary,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.Colors.lime.primary,
    marginBottom: 16,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    width: '48%',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.Colors.border.muted,
    position: 'relative',
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
  colorBlock: {
    flex: 1,
  },
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
  sliderContainer: {
    marginBottom: 24,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    marginBottom: 8,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 4,
    position: 'relative',
    marginBottom: 8,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.Colors.cyan.primary,
    borderWidth: 3,
    borderColor: Colors.Colors.white.primary,
    marginLeft: -10,
  },
  sliderValue: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.muted,
    textAlign: 'right',
  },
  previewCard: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
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
    backgroundColor: Colors.Colors.cyan.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.Colors.text.inverse,
  },
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
