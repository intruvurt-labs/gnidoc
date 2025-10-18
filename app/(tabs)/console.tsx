import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brain } from 'lucide-react-native';
import ScreenBackground from '@/components/ScreenBackground';
import { OrchestrationCard } from '@/src/components/OrchestrationCard';
import { useOrchestration } from '@/src/hooks/useOrchestration';
import Colors from '@/constants/colors';

export default function ConsoleScreen() {
  const { orchestrations, loading, refresh, rerun } = useOrchestration();

  return (
    <ScreenBackground variant="default">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Brain size={28} color={Colors.Colors.purple.primary} />
          <Text style={styles.title}>Orchestration Console</Text>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.Colors.blue.primary} />
          </View>
        ) : orchestrations.length === 0 ? (
          <View style={styles.centerContainer}>
            <Brain size={64} color={Colors.Colors.text.tertiary} />
            <Text style={styles.emptyText}>No orchestrations yet</Text>
            <Text style={styles.emptySubtext}>
              Multi-model runs will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={orchestrations}
            keyExtractor={(item) => item.run_id}
            renderItem={({ item }) => (
              <OrchestrationCard
                orchestration={item}
                onRerun={rerun}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={refresh}
                tintColor={Colors.Colors.blue.primary}
              />
            }
          />
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.Colors.text.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.Colors.text.secondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.Colors.text.tertiary,
    marginTop: 6,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
