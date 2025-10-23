import React, { Suspense } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorBoundary from '@/components/ErrorBoundary';

const HeavyEditor = React.lazy(() => import('@/components/HeavyEditor'));

export default function PreviewClient(props: { initial?: unknown }) {
  console.log('[PreviewClient] mount', { hasInitial: typeof props.initial !== 'undefined' });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <ErrorBoundary resetKeys={[typeof props.initial !== 'undefined']}>
        <Suspense
          fallback={
            <View style={styles.fallback} testID="preview-client-loading">
              <ActivityIndicator size="small" />
              <Text style={styles.fallbackText}>Fetching preview…</Text>
            </View>
          }
        >
          <HeavyEditor initial={props.initial} />
        </Suspense>
      </ErrorBoundary>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fallback: {
    padding: 16,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 14,
  },
});
