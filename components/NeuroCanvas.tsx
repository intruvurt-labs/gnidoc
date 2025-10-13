import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Sparkles, X, Clipboard as ClipboardIcon } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors, { Shadows } from '@/constants/colors';

interface NeuroCanvasProps {
  placeholder?: string;
  assistChips?: string[];
  cta?: {
    label: string;
    style: 'primary' | 'secondary';
    onPress: () => void;
    disabled?: boolean;
  };
  onTextChange?: (text: string) => void;

  /** New (optional) props */
  value?: string;                    // allow controlled usage
  defaultValue?: string;             // initial text (uncontrolled)
  maxLength?: number;                // show counter & enforce length
  persistKey?: string;               // if provided, auto-save/load draft
  helperText?: string;               // supportive copy under field
  errorText?: string;                // shows in error color
  readOnly?: boolean;                // renders non-editable
  disabled?: boolean;                // disables input & chips
  debounceMs?: number;               // debounce for onTextChange (default 250)
  testID?: string;
}

export default function NeuroCanvas({
  placeholder = 'Describe your app...',
  assistChips = [],
  cta,
  onTextChange,

  value,
  defaultValue = '',
  maxLength,
  persistKey,
  helperText,
  errorText,
  readOnly = false,
  disabled = false,
  debounceMs = 250,
  testID = 'neuro-canvas',
}: NeuroCanvasProps) {
  const isControlled = typeof value === 'string';
  const [internal, setInternal] = useState<string>(isControlled ? value! : defaultValue);
  const [loadingDraft, setLoadingDraft] = useState<boolean>(!!persistKey);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const debouncedRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from storage
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!persistKey) return setLoadingDraft(false);
      try {
        const stored = await AsyncStorage.getItem(persistKey);
        if (mounted && stored != null && !isControlled) {
          setInternal(stored);
        }
      } catch (e) {
        console.warn('[NeuroCanvas] Failed to load draft:', e);
      } finally {
        mounted && setLoadingDraft(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [persistKey, isControlled]);

  // Keep internal in sync for controlled usage
  useEffect(() => {
    if (isControlled) setInternal(value!);
  }, [isControlled, value]);

  // Debounced onChange for parent
  const emitChange = useCallback(
    (txt: string) => {
      if (!onTextChange) return;
      if (debouncedRef.current) clearTimeout(debouncedRef.current);
      debouncedRef.current = setTimeout(() => onTextChange(txt), debounceMs);
    },
    [onTextChange, debounceMs]
  );

  const handleTextChange = useCallback(
    (txt: string) => {
      const next = maxLength ? txt.slice(0, maxLength) : txt;
      if (!isControlled) setInternal(next);
      emitChange(next);
    },
    [emitChange, isControlled, maxLength]
  );

  // Persist draft
  useEffect(() => {
    if (!persistKey) return;
    let canceled = false;

    const save = async () => {
      try {
        setSavingDraft(true);
        await AsyncStorage.setItem(persistKey, internal);
      } catch (e) {
        console.warn('[NeuroCanvas] Failed to save draft:', e);
      } finally {
        !canceled && setSavingDraft(false);
      }
    };

    const t = setTimeout(save, 200);
    return () => {
      canceled = true;
      clearTimeout(t);
    };
  }, [internal, persistKey]);

  const appendChip = useCallback(
    (chip: string) => {
      const needsSpace = internal.length > 0 && !/\s$/.test(internal);
      const next = internal + (needsSpace ? ' ' : '') + chip;
      handleTextChange(next);
      // (Optional) Haptics could be added here if desired
    },
    [internal, handleTextChange]
  );

  const clearText = useCallback(() => {
    handleTextChange('');
  }, [handleTextChange]);

  const copyText = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(internal);
    } catch (e) {
      console.warn('[NeuroCanvas] copy failed:', e);
    }
  }, [internal]);

  const canEdit = !readOnly && !disabled;
  const remaining = useMemo(
    () => (typeof maxLength === 'number' ? Math.max(0, maxLength - internal.length) : undefined),
    [internal.length, maxLength]
  );

  return (
    <View style={styles.container} testID={testID} accessibilityLabel="Neuro canvas">
      <View
        style={[
          styles.inputContainer,
          errorText ? styles.inputContainerError : null,
          disabled ? styles.inputContainerDisabled : null,
        ]}
      >
        <View style={styles.toolbar}>
          <View style={styles.toolbarLeft}>
            {loadingDraft ? (
              <ActivityIndicator size="small" color={Colors.Colors.cyan.primary} />
            ) : (
              <Sparkles color={Colors.Colors.cyan.primary} size={18} />
            )}
            <Text style={styles.toolbarLabel}>
              {loadingDraft ? 'Loading draft…' : savingDraft ? 'Saving…' : 'Prompt'}
            </Text>
          </View>

          <View style={styles.toolbarRight}>
            {!!internal && (
              <>
                <TouchableOpacity
                  onPress={copyText}
                  disabled={!canEdit}
                  accessibilityRole="button"
                  accessibilityLabel="Copy text"
                  style={styles.iconBtn}
                  testID="neuro-copy"
                >
                  <ClipboardIcon
                    color={canEdit ? Colors.Colors.text.muted : Colors.Colors.border.muted}
                    size={18}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={clearText}
                  disabled={!canEdit}
                  accessibilityRole="button"
                  accessibilityLabel="Clear text"
                  style={styles.iconBtn}
                  testID="neuro-clear"
                >
                  <X
                    color={canEdit ? Colors.Colors.text.muted : Colors.Colors.border.muted}
                    size={18}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.Colors.text.muted}
          value={internal}
          onChangeText={handleTextChange}
          editable={canEdit}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={maxLength}
          autoCorrect
          autoCapitalize="sentences"
          accessibilityLabel="Neuro canvas input"
          testID="neuro-input"
        />
      </View>

      {!!assistChips.length && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsContainer}
          contentContainerStyle={styles.chipsContent}
          keyboardShouldPersistTaps="handled"
          testID="neuro-chips"
        >
          {assistChips.map((chip, index) => (
            <TouchableOpacity
              key={`chip-${index}`}
              style={[styles.chip, disabled && styles.chipDisabled]}
              onPress={() => appendChip(chip)}
              disabled={!canEdit}
              accessibilityRole="button"
              accessibilityLabel={`Insert "${chip}"`}
            >
              <Sparkles
                color={disabled ? Colors.Colors.border.muted : Colors.Colors.cyan.primary}
                size={14}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: disabled ? Colors.Colors.text.muted : Colors.Colors.cyan.primary },
                ]}
              >
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Helper / Error row + counter */}
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          {errorText ? (
            <Text style={[styles.metaText, styles.metaError]} testID="neuro-error">
              {errorText}
            </Text>
          ) : helperText ? (
            <Text style={styles.metaText} testID="neuro-helper">
              {helperText}
            </Text>
          ) : null}
        </View>
        {typeof remaining === 'number' && (
          <Text
            style={[
              styles.counter,
              remaining <= 10 ? styles.counterWarn : null,
              remaining === 0 ? styles.counterMax : null,
            ]}
            testID="neuro-counter"
          >
            {remaining} left
          </Text>
        )}
      </View>

      {cta && (
        <TouchableOpacity
          style={[
            styles.ctaButton,
            cta.style === 'primary' ? styles.ctaPrimary : styles.ctaSecondary,
            (cta.disabled || !internal || disabled) && styles.ctaDisabled,
          ]}
          onPress={cta.onPress}
          disabled={cta.disabled || !internal || disabled}
          accessibilityRole="button"
          accessibilityLabel={cta.label}
          testID="neuro-cta"
        >
          <Text
            style={[
              styles.ctaText,
              styles.ctaTextInverse,
              Platform.OS === 'ios' ? { letterSpacing: 0.2 } : null,
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
  container: { width: '100%' },

  inputContainer: {
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
    padding: 4,
    ...Shadows.glowCyan,
  },
  inputContainerError: {
    borderColor: Colors.Colors.error,
    shadowColor: Colors.Colors.error,
  },
  inputContainerDisabled: {
    opacity: 0.6,
  },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    justifyContent: 'space-between',
  },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbarRight: { flexDirection: 'row', alignItems: 'center' },
  toolbarLabel: {
    color: Colors.Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  iconBtn: { padding: 6, marginLeft: 2 },

  input: {
    backgroundColor: Colors.Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    color: Colors.Colors.text.primary,
    fontSize: 16,
    minHeight: 150,
    fontWeight: '500',
  },

  chipsContainer: { marginTop: 12 },
  chipsContent: { flexDirection: 'row' },
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
  chipDisabled: {
    borderColor: Colors.Colors.border.muted,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  metaRow: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLeft: { flexShrink: 1, paddingRight: 8 },
  metaText: {
    color: Colors.Colors.text.muted,
    fontSize: 12,
  },
  metaError: {
    color: Colors.Colors.error,
  },
  counter: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
  },
  counterWarn: {
    color: Colors.Colors.warning,
    fontWeight: '700',
  },
  counterMax: {
    color: Colors.Colors.error,
    fontWeight: '700',
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
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
  },
  ctaTextInverse: {
    color: Colors.Colors.text.inverse,
  },
});
