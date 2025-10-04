import React, { useState, useCallback } from 'react';
import { Image as ExpoImage, ImageContentFit } from 'expo-image';
import { View, ActivityIndicator, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import Colors from '@/constants/colors';

interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: ImageContentFit;
  placeholder?: string;
  priority?: 'low' | 'normal' | 'high';
  cachePolicy?: 'memory' | 'disk' | 'memory-disk';
}

const OptimizedImage: React.FC<OptimizedImageProps> = React.memo(({
  source,
  style,
  containerStyle,
  resizeMode = 'cover',
  placeholder,
  priority = 'normal',
  cachePolicy = 'memory-disk',
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    console.error('[OptimizedImage] Failed to load image:', source);
  }, [source]);

  return (
    <View style={[styles.container, containerStyle]}>
      <ExpoImage
        source={source}
        style={[styles.image, style]}
        contentFit={resizeMode}
        placeholder={placeholder}
        priority={priority}
        cachePolicy={cachePolicy}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        transition={200}
      />
      {isLoading && !hasError && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.Colors.cyan.primary} />
        </View>
      )}
      {hasError && (
        <View style={styles.errorContainer}>
          <View style={styles.errorPlaceholder} />
        </View>
      )}
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
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
