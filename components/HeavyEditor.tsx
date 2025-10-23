import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import Colors from '@/constants/colors';

export interface HeavyEditorProps {
  initial?: unknown;
}

function HeavyEditorComponent({ initial }: HeavyEditorProps) {
  console.log('[HeavyEditor] render', { hasInitial: typeof initial !== 'undefined' });

  const formatted = useMemo(() => {
    try {
      return JSON.stringify(initial ?? {}, null, 2);
    } catch (e) {
      return String(initial);
    }
  }, [initial]);

  return (
    <View style={styles.container} testID="heavy-editor">
      <Text style={styles.title} accessibilityRole="header">
        Editor Preview
      </Text>
      <Text style={styles.subtitle}>This is a lightweight placeholder for the heavy editor module.</Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Initial Props</Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} testID="heavy-editor-initial-json">
          <Text selectable style={styles.code}>{formatted}</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const HeavyEditor = memo(HeavyEditorComponent);
export default HeavyEditor;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
    backgroundColor: Colors.Colors.background.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.Colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
  },
  panel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
    backgroundColor: Colors.Colors.background.card,
    overflow: 'hidden',
  },
  panelTitle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.Colors.text.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.Colors.border.muted,
  },
  scroll: {
    maxHeight: 240,
  },
  scrollContent: {
    padding: 12,
  },
  code: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    fontFamily: Platform.select({ web: 'monospace', default: 'monospace' }),
    lineHeight: 18,
  },
});
