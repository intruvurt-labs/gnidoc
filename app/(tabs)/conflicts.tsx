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
import { GitMerge } from 'lucide-react-native';
import ScreenBackground from '@/components/ScreenBackground';
import { ConflictCard } from '@/src/components/ConflictCard';
import { useConflicts } from '@/src/hooks/useConflicts';
import Colors from '@/constants/colors';

export default function ConflictsScreen() {
  const { conflicts, loading, refresh, resolve, defer } = useConflicts();

  return (
    <ScreenBackground variant="default">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <GitMerge size={28} color={Colors.Colors.red.coral} />
          <Text style={styles.title}>Conflicts</Text>
          {conflicts.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{conflicts.length}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.Colors.blue.primary} />
          </View>
        ) : conflicts.length === 0 ? (
          <View style={styles.centerContainer}>
            <GitMerge size={64} color={Colors.Colors.text.tertiary} />
            <Text style={styles.emptyText}>No conflicts</Text>
            <Text style={styles.emptySubtext}>
              Merge conflicts will appear here when detected
            </Text>
          </View>
        ) : (
          <FlatList
            data={conflicts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ConflictCard
                conflict={item}
                onResolve={resolve}
                onDefer={defer}
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
  countBadge: {
    backgroundColor: Colors.Colors.red.coral,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.Colors.text.inverse,
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
