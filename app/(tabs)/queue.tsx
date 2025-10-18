import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Inbox, Trash2 } from 'lucide-react-native';
import ScreenBackground from '@/components/ScreenBackground';
import { QueueItemCard } from '@/src/components/QueueItemCard';
import { useQueue } from '@/src/hooks/useQueue';
import Colors from '@/constants/colors';

export default function QueueScreen() {
  const { items, loading, refresh, retry, deleteItem, deleteDone } = useQueue();

  return (
    <ScreenBackground variant="default">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Inbox size={28} color={Colors.Colors.text.primary} />
            <Text style={styles.title}>Offline Queue</Text>
          </View>
          {items.filter((i) => i.status === 'done').length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={deleteDone}
              testID="clear-done"
            >
              <Trash2 size={18} color={Colors.Colors.red.primary} />
              <Text style={styles.clearText}>Clear Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.Colors.blue.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerContainer}>
            <Inbox size={64} color={Colors.Colors.text.tertiary} />
            <Text style={styles.emptyText}>Queue is empty</Text>
            <Text style={styles.emptySubtext}>
              All offline mutations will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <QueueItemCard
                item={item}
                onRetry={retry}
                onDelete={deleteItem}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.Colors.text.primary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.Colors.red.primary + '20',
    borderWidth: 1,
    borderColor: Colors.Colors.red.primary,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.Colors.red.primary,
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
