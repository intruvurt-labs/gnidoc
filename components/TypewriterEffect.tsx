import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, StyleSheet, Animated, TextStyle } from 'react-native';
import Colors from '@/constants/colors';

interface TypewriterEffectProps {
  phrases: string[];
  typingSpeed?: number;      // ms per char (avg)
  deletingSpeed?: number;    // ms per char (avg)
  pauseDuration?: number;    // ms at end of a phrase
  style?: TextStyle;
  loop?: boolean;
  startDelay?: number;       // ms before first keystroke
  jitter?: number;           // 0..0.5 random speed variance
  showCursor?: boolean;
  cursorChar?: string;
  onType?: (text: string) => void;
  onPhraseChange?: (index: number) => void;
  onComplete?: () => void;   // fires when loop=false and last phrase fully typed
  testID?: string;
}

export default function TypewriterEffect({
  phrases,
  typingSpeed = 80,
  deletingSpeed = 50,
  pauseDuration = 2000,
  style,
  loop = true,
  startDelay = 0,
  jitter = 0.2,
  showCursor = true,
  cursorChar = '|',
  onType,
  onPhraseChange,
  onComplete,
  testID = 'typewriter',
}: TypewriterEffectProps) {
  const safePhrases = useMemo(() => (phrases && phrases.length ? phrases : ['']), [phrases]);

  const [displayText, setDisplayText] = useState<string>('');
  const [idx, setIdx] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  // Cursor blink (stops when complete)
  useEffect(() => {
    if (isDone || !showCursor) {
      cursorOpacity.setValue(1);
      return;
    }
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [cursorOpacity, isDone, showCursor]);

  // Clear timers on unmount / changes
  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    clearTimer();

    if (isDone) return;

    const current = safePhrases[idx];
    const atEnd = displayText === current;
    const atStart = displayText.length === 0;

    // Determine next delay with a bit of human-like randomness
    const base = isDeleting ? deletingSpeed : typingSpeed;
    const variance = Math.max(0, Math.min(0.5, jitter));
    const delta = base + (Math.random() * 2 - 1) * base * variance;

    const schedule = (fn: () => void, delay: number) => {
      timerRef.current = setTimeout(fn, delay);
    };

    // Start delay only once at very beginning
    if (!isDeleting && atStart && displayText.length === 0 && idx === 0 && startDelay > 0) {
      schedule(() => setDisplayText(current.slice(0, 1)), startDelay);
      return () => clearTimer();
    }

    if (!isDeleting) {
      // Typing forward
      if (!atEnd) {
        schedule(() => {
          const next = current.slice(0, displayText.length + 1);
          setDisplayText(next);
          onType?.(next);
        }, delta);
      } else {
        // End of phrase
        if (!loop && idx === safePhrases.length - 1) {
          // Stop here for loop=false
          setIsDone(true);
          onComplete?.();
        } else {
          // Pause, then start deleting
          schedule(() => setIsDeleting(true), pauseDuration);
        }
      }
    } else {
      // Deleting
      if (!atStart) {
        schedule(() => {
          const next = displayText.slice(0, -1);
          setDisplayText(next);
          onType?.(next);
        }, delta);
      } else {
        // Move to next phrase and type forward
        const nextIdx = (idx + 1) % safePhrases.length;
        setIdx(nextIdx);
        onPhraseChange?.(nextIdx);
        setIsDeleting(false);
      }
    }

    return () => clearTimer();
  }, [
    displayText,
    isDeleting,
    idx,
    safePhrases,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    startDelay,
    jitter,
    loop,
    onType,
    onPhraseChange,
    onComplete,
  ]);

  // Reset if phrases array changes meaningfully
  useEffect(() => {
    setDisplayText('');
    setIdx(0);
    setIsDeleting(false);
    setIsDone(false);
  }, [safePhrases]);

  return (
    <Text style={[styles.text, style]} accessibilityRole="text" testID={testID}>
      {displayText}
      {showCursor && (
        <Animated.Text style={[styles.cursor, { opacity: isDone ? 1 : cursorOpacity }]}>
          {cursorChar}
        </Animated.Text>
      )}
    </Text>
  );
}

// Your preset phrases (kept as-is)
export const gnidocTercesPhases = [
  'Secret Coding. Reverse Engineering.',
  'AI that thinks like a team.',
  'Encrypted. Secure. Unstoppable.',
  'NimRev Security Protocol Active.',
  'Multi-Model Orchestration.',
  'RATSCan: AI Security Verified.',
  'Code Obfuscation Enabled.',
  'Tri-Model Intelligence.',
  'Build. Encrypt. Deploy.',
  'gnidoC TerceS: The Future.',
  'Consensus-Driven Development.',
  'Smart Model Selection.',
  'Production-Ready in Seconds.',
  'Your Ideas. Our Intelligence.',
  'Locked Brain. Unlocked Potential.',
];

const styles = StyleSheet.create({
  text: {
    fontSize: 12,
    color: Colors?.Colors?.accent?.cyan ?? '#4DD0E1',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  cursor: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors?.Colors?.accent?.cyan ?? '#4DD0E1',
    textShadowColor: 'rgba(0, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
