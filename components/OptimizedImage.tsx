import React, { useState, useCallback } from 'react';
import {
  Image as ExpoImage,
  ImageContentFit,
  ImageSource,
} from 'expo-image';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import Colors from '@/constants/colors';

type Priority = 'low' | 'normal' | 'high';
type CachePolicy = 'none' | 'memory' | 'disk' | 'memory-disk';

type Placeholder =
  | string
  | number
  | string[]            // progressive placeholders
  | { blurhash: string } // blurhash object
  | undefined;

interface OptimizedImageProps {
  source: ImageSource;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: ImageContentFit;
  placeholder?: Placeholder;
  priority?: Priority;
  cachePolicy?: CachePolicy;
  transition?: number | { duration: number }; // expo-image supports number or object
  fallbackSource?: ImageSource;               // used on error
  testID?: string;
  accessibilityLabel?: string;
}

const OptimizedImageBase: React.FC<OptimizedImageProps> = ({
  source,
  style,
  containerStyle,
  resizeMode = 'cover',
  placeholder,
  priority = 'normal',
  cachePolicy = 'memory-disk',
  transition = 200,
  fallbackSource,
  testID,
  accessibilityLabel,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    // Let the transition handle the final fade; stop spinner immediately
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    // Keep this terse to avoid noisy object dumps in prod logs
    console.error('[OptimizedImage] Image load error');
  }, []);

  // If the main image errors and we have a fallback, show that instead
  const resolvedSource = hasError && fallbackSource ? fallbackSource : source;

  return (
    <View style={[styles.container, containerStyle]}>
      <ExpoImage
        source={resolvedSource}
        style={[styles.image, style]}
        contentFit={resizeMode}
        placeholder={placeholder}
        priority={priority}
        cachePolicy={cachePolicy}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        transition={transition}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessible={!!accessibilityLabel}
      />
      {isLoading && !hasError && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.Colors.cyan.primary} />
        </View>
      )}
      {hasError && !fallbackSource && (
        <View style={styles.errorContainer}>
          <View style={styles.errorPlaceholder} />
        </View>
      )}
    </View>
  );
};

// Avoid unnecessary re-renders when props haven’t changed
export const OptimizedImage = React.memo(
  OptimizedImageBase,
  (prev, next) =>
    prev.source === next.source &&
    prev.fallbackSource === next.fallbackSource &&
    prev.resizeMode === next.resizeMode &&
    prev.priority === next.priority &&
    prev.cachePolicy === next.cachePolicy &&
    prev.placeholder === next.placeholder &&
    prev.transition === next.transition &&
    prev.testID === next.testID &&
    prev.accessibilityLabel === next.accessibilityLabel &&
    shallowEqualStyle(prev.style, next.style) &&
    shallowEqualStyle(prev.containerStyle, next.containerStyle)
);

OptimizedImage.displayName = 'OptimizedImage';

function shallowEqualStyle(a?: ImageStyle | ViewStyle, b?: ImageStyle | ViewStyle) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ak = Object.keys(a as any);
  const bk = Object.keys(b as any);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if ((a as any)[k] !== (b as any)[k]) return false;
  }
  return true;
}

const styles = StyleSheet.create({
  container: { position: 'relative', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
  },
  errorPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.Colors.border.muted,
  },
});

export default OptimizedImage;
