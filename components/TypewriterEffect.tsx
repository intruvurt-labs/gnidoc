import React, { useState, useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import Colors from '@/constants/colors';

interface TypewriterEffectProps {
  phrases: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  style?: any;
  loop?: boolean;
}

export default function TypewriterEffect({
  phrases,
  typingSpeed = 80,
  deletingSpeed = 50,
  pauseDuration = 2000,
  style,
  loop = true,
}: TypewriterEffectProps) {
  const [displayText, setDisplayText] = useState<string>('');
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blinkCursor = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    blinkCursor.start();

    return () => blinkCursor.stop();
  }, [cursorOpacity]);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentPhrase.length) {
          setDisplayText(currentPhrase.slice(0, displayText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), pauseDuration);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          setIsDeleting(false);
          if (loop || currentPhraseIndex < phrases.length - 1) {
            setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
          }
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentPhraseIndex, phrases, typingSpeed, deletingSpeed, pauseDuration, loop]);

  return (
    <Text style={[styles.text, style]}>
      {displayText}
      <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>|</Animated.Text>
    </Text>
  );
}

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
    color: Colors.Colors.cyan.primary,
    fontWeight: '500' as const,
  },
  cursor: {
    fontSize: 12,
    color: Colors.Colors.cyan.primary,
    fontWeight: '700' as const,
  },
});
