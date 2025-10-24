import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ListRenderItemInfo, PanResponder, Animated, Alert } from 'react-native';
import { Folder, FileText, Trash2, Pencil } from 'lucide-react-native';

export type FileEntry = {
  path: string;
  name: string;
  isDir?: boolean;
};

interface MobileFileTreeProps {
  files?: FileEntry[];
  onDelete?: (path: string) => Promise<void> | void;
  onRename?: (path: string) => Promise<string | void> | string | void;
  onPressFile?: (file: FileEntry) => void;
}

export function MobileFileTree(props: MobileFileTreeProps) {
  const { files, onDelete, onRename, onPressFile } = props;

  const initialData: FileEntry[] = useMemo(() => (
    files ?? [
      { path: '/documents/readme.md', name: 'readme.md' },
      { path: '/documents/notes.txt', name: 'notes.txt' },
      { path: '/src', name: 'src', isDir: true },
    ]
  ), [files]);

  const [items, setItems] = useState<FileEntry[]>(initialData);

  const deleteFile = useCallback(async (path: string) => {
    try {
      setItems((prev) => prev.filter((f) => f.path !== path));
      if (onDelete) await onDelete(path);
      console.log('[MobileFileTree] Deleted', path);
    } catch (e) {
      console.error('[MobileFileTree] delete error', e);
      Alert.alert('Delete failed', 'Could not delete the file.');
    }
  }, [onDelete]);

  const renameFile = useCallback(async (path: string) => {
    try {
      const current = items.find((f) => f.path === path);
      if (!current) return;
      const suggested = current.name;
      const nextName = typeof onRename === 'function'
        ? await onRename(path)
        : suggested;
      const safeName = (nextName ?? suggested).trim();
      if (!safeName || safeName === current.name) return;
      const nextPath = (current.path.split('/').slice(0, -1).join('/') || '/') + '/' + safeName;
      setItems((prev) => prev.map((f) => f.path === path ? { ...f, name: safeName, path: nextPath } : f));
      console.log('[MobileFileTree] Renamed', path, '->', nextPath);
    } catch (e) {
      console.error('[MobileFileTree] rename error', e);
      Alert.alert('Rename failed', 'Could not rename the file.');
    }
  }, [items, onRename]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<FileEntry>) => (
    <SwipeableRow
      key={item.path}
      onSwipeLeft={() => deleteFile(item.path)}
      onSwipeRight={() => renameFile(item.path)}
    >
      <FileItem file={item} onPress={() => onPressFile?.(item)} />
    </SwipeableRow>
  ), [deleteFile, renameFile, onPressFile]);

  return (
    <View style={styles.container} testID="mobile-file-tree">
      <FlatList
        data={items}
        keyExtractor={(it) => it.path}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        testID="file-list"
      />
    </View>
  );
}

function FileItem({ file, onPress }: { file: FileEntry; onPress?: () => void }) {
  const Icon = file.isDir ? Folder : FileText;
  return (
    <View style={styles.row} testID={`file-item-${file.name}`}>
      <Icon color="#6B7280" size={20} />
      <Text onPress={onPress} style={styles.fileName} numberOfLines={1}>
        {file.name}
      </Text>
    </View>
  );
}

function SwipeableRow({ children, onSwipeLeft, onSwipeRight }: {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const threshold = 80;

  const reset = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  }, [translateX]);

  const trigger = useCallback((dir: 'left' | 'right') => {
    if (dir === 'left') onSwipeLeft?.();
    if (dir === 'right') onSwipeRight?.();
    reset();
  }, [onSwipeLeft, onSwipeRight, reset]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dy) < 10,
    onPanResponderMove: (_, g) => {
      const next = Math.max(-140, Math.min(140, g.dx));
      translateX.setValue(next);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx <= -threshold) return trigger('left');
      if (g.dx >= threshold) return trigger('right');
      reset();
    },
    onPanResponderTerminate: () => reset(),
  }), [reset, translateX, trigger]);

  return (
    <View style={styles.swipeContainer} testID="swipeable-row">
      <View style={styles.actions} pointerEvents="none">
        <View style={[styles.action, styles.leftAction]}>
          <Pencil size={18} color="#FFFFFF" />
          <Text style={styles.actionText}>Rename</Text>
        </View>
        <View style={[styles.action, styles.rightAction]}>
          <Trash2 size={18} color="#FFFFFF" />
          <Text style={styles.actionText}>Delete</Text>
        </View>
      </View>
      <Animated.View style={[styles.swipeContent, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingVertical: 8 },
  separator: { height: 1, backgroundColor: '#E5E7EB' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  fileName: { flex: 1, color: '#111827', fontSize: 16 },
  swipeContainer: { overflow: 'hidden' },
  swipeContent: { backgroundColor: '#FFFFFF' },
  actions: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  leftAction: { backgroundColor: '#2563EB' },
  rightAction: { backgroundColor: '#DC2626' },
  actionText: { color: '#FFFFFF', fontWeight: '600' as const },
});

export default MobileFileTree;
