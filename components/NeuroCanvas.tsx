import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Sparkles } from 'lucide-react-native';
import Colors, { Shadows } from '@/constants/colors';

interface NeuroCanvasProps {
  placeholder?: string;
  assistChips?: string[];
  cta?: {
    label: string;
    style: 'primary' | 'secondary';
    onPress: () => void;
  };
  onTextChange?: (text: string) => void;
}

export default function NeuroCanvas({
  placeholder = 'Describe your app...',
  assistChips = [],
  cta,
  onTextChange,
}: NeuroCanvasProps) {
  const [text, setText] = useState<string>('');

  const handleTextChange = (value: string) => {
    setText(value);
    if (onTextChange) {
      onTextChange(value);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.Colors.text.muted}
          value={text}
          onChangeText={handleTextChange}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      {assistChips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsContainer}
        >
          {assistChips.map((chip, index) => (
            <TouchableOpacity
              key={`chip-${index}`}
              style={styles.chip}
              onPress={() => handleTextChange(text + ' ' + chip)}
            >
              <Sparkles color={Colors.Colors.cyan.primary} size={14} />
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {cta && (
        <TouchableOpacity
          style={[
            styles.ctaButton,
            cta.style === 'primary' ? styles.ctaPrimary : styles.ctaSecondary,
          ]}
          onPress={cta.onPress}
        >
          <Text
            style={[
              styles.ctaText,
              cta.style === 'primary' ? styles.ctaTextPrimary : styles.ctaTextSecondary,
            ]}
          >
            {cta.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
    padding: 4,
    ...Shadows.glowCyan,
  },
  input: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    color: Colors.Colors.text.primary,
    fontSize: 16,
    minHeight: 150,
    fontWeight: '500' as const,
  },
  chipsContainer: {
    marginTop: 12,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.Colors.cyan.primary,
    gap: 6,
  },
  chipText: {
    color: Colors.Colors.cyan.primary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  ctaButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimary: {
    backgroundColor: Colors.Colors.cyan.primary,
    ...Shadows.glowCyan,
  },
  ctaSecondary: {
    backgroundColor: Colors.Colors.lime.primary,
    ...Shadows.glowLime,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  ctaTextPrimary: {
    color: Colors.Colors.text.inverse,
  },
  ctaTextSecondary: {
    color: Colors.Colors.text.inverse,
  },
});