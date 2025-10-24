import { Platform } from 'react-native';
import { documentDirectory, readDirectoryAsync, readAsStringAsync, EncodingType } from 'expo-file-system';

export type ListFilesInput = { path: string };
export type ListFilesOutput = { files: string[] };
export type ReadFileInput = { path: string };
export type ReadFileOutput = { content: string };

function joinPath(base: string, seg: string): string {
  const sanitized = seg.replace(/^[\/]+/, '').replace(/\.\.+/g, '');
  const delimiter = base.endsWith('/') ? '' : '/';
  return `${base}${delimiter}${sanitized}`;
}

function getBaseDir(): string {
  const base = documentDirectory ?? '';
  if (!base) {
    console.warn('[ExpoFileSystemMCPServer] documentDirectory is unavailable on this platform');
  }
  return base;
}

export class ExpoFileSystemMCPServer {
  async handleListFiles({ path }: ListFilesInput): Promise<ListFilesOutput> {
    const base = getBaseDir();
    if (!base) {
      if (Platform.OS === 'web') {
        console.log('[ExpoFileSystemMCPServer] readDirectory not supported on web documentDirectory');
        return { files: [] };
      }
      throw new Error('Storage directory is unavailable');
    }

    try {
      const target = joinPath(base, path);
      console.log('[ExpoFileSystemMCPServer] Listing files at', target);
      const files = await readDirectoryAsync(target);
      return { files };
    } catch (e) {
      console.error('[ExpoFileSystemMCPServer] Failed to list files', e);
      return { files: [] };
    }
  }

  async handleReadFile({ path }: ReadFileInput): Promise<ReadFileOutput> {
    const base = getBaseDir();
    if (!base) {
      if (Platform.OS === 'web') {
        console.log('[ExpoFileSystemMCPServer] readAsString not supported on web documentDirectory');
        return { content: '' };
      }
      throw new Error('Storage directory is unavailable');
    }

    try {
      const target = joinPath(base, path);
      console.log('[ExpoFileSystemMCPServer] Reading file', target);
      const content = await readAsStringAsync(target, {
        encoding: EncodingType.UTF8,
      });
      return { content };
    } catch (e) {
      console.error('[ExpoFileSystemMCPServer] Failed to read file', e);
      return { content: '' };
    }
  }
}
